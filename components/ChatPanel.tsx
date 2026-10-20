"use client";

import * as React from "react";
import { useChatPluginContext } from "./ChatPluginContext";
import { describeOp, describeOps } from "@/lib/op-display";
import type { ChatMessage, PlannerOp } from "@/lib/types";

function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**") && tok.endsWith("**")) {
      nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("__") && tok.endsWith("__")) {
      nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`") && tok.endsWith("`")) {
      nodes.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-slate-200 text-[11px]">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("[")) {
      const close = tok.indexOf("](");
      const label = tok.slice(1, close);
      const href = tok.slice(close + 2, -1);
      nodes.push(
        <a key={key++} href={href} target="_blank" rel="noreferrer" className="underline">
          {label}
        </a>
      );
    } else if ((tok.startsWith("*") && tok.endsWith("*")) || (tok.startsWith("_") && tok.endsWith("_"))) {
      nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    } else {
      nodes.push(tok);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MessageMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let ul: string[] = [];
  let ol: string[] = [];
  let key = 0;
  const flushPara = () => {
    if (!para.length) return;
    blocks.push(
      <p key={key++} className="whitespace-pre-wrap leading-relaxed">
        {renderInline(para.join("\n"))}
      </p>
    );
    para = [];
  };
  const flushUl = () => {
    if (!ul.length) return;
    blocks.push(
      <ul key={key++} className="list-disc pl-4 space-y-0.5 leading-relaxed">
        {ul.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    ul = [];
  };
  const flushOl = () => {
    if (!ol.length) return;
    blocks.push(
      <ol key={key++} className="list-decimal pl-5 space-y-0.5 leading-relaxed">
        {ol.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ol>
    );
    ol = [];
  };
  for (const raw of lines) {
    const ulMatch = /^\s*[-*•]\s+(.+)$/.exec(raw);
    const olMatch = /^\s*\d+\.\s+(.+)$/.exec(raw);
    if (ulMatch) {
      flushPara();
      flushOl();
      ul.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      flushPara();
      flushUl();
      ol.push(olMatch[1]);
      continue;
    }
    if (raw.trim() === "") {
      flushPara();
      flushUl();
      flushOl();
      continue;
    }
    flushUl();
    flushOl();
    para.push(raw);
  }
  flushPara();
  flushUl();
  flushOl();
  return <div className="space-y-1.5">{blocks}</div>;
}

const suggestions = [
  "Compose a welcome email",
  "Add a verification code section",
  "Change brand color to teal",
  "Add a footer with social links",
];

type PlannerStreamEvent =
  | { type: "thinking_start" }
  | { type: "thinking_delta"; text: string }
  | { type: "thinking_end" }
  | { type: "reply_delta"; text: string }
  | { type: "op_added"; index: number; op: PlannerOp }
  | { type: "done"; result: { reply: string; ops: PlannerOp[] } }
  | { type: "error"; message: string };

export function ChatPanel() {
  const { doc, onOps } = useChatPluginContext();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [partialReply, setPartialReply] = React.useState("");
  const [partialThinking, setPartialThinking] = React.useState("");
  const [thinkingDone, setThinkingDone] = React.useState(false);
  const [thinkingExpanded, setThinkingExpanded] = React.useState(false);
  const [streamedOpLabels, setStreamedOpLabels] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const docRef = React.useRef(doc);
  docRef.current = doc;
  const onOpsRef = React.useRef(onOps);
  onOpsRef.current = onOps;

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending, partialReply, partialThinking, streamedOpLabels]);

  function resetStreamingState() {
    setPartialReply("");
    setPartialThinking("");
    setThinkingDone(false);
    setThinkingExpanded(false);
    setStreamedOpLabels([]);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    setInput("");
    resetStreamingState();
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed, at: Date.now() };
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc: docRef.current, message: trimmed, history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Planner returned ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let final: { reply: string; ops: PlannerOp[] } | null = null;
      const localStreamedOps: PlannerOp[] = [];
      const localOpLabels: string[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          let event: PlannerStreamEvent;
          try {
            event = JSON.parse(line) as PlannerStreamEvent;
          } catch {
            continue;
          }
          switch (event.type) {
            case "thinking_start":
              setPartialThinking("");
              setThinkingDone(false);
              break;
            case "thinking_delta":
              setPartialThinking((t) => t + event.text);
              break;
            case "thinking_end":
              setThinkingDone(true);
              break;
            case "reply_delta":
              setPartialReply((r) => r + event.text);
              break;
            case "op_added": {
              // Describe against the pre-op doc so remove_block can still resolve
              // the block type before it's gone.
              const label = describeOp(event.op, docRef.current);
              onOpsRef.current([event.op], { remount: false });
              localStreamedOps.push(event.op);
              localOpLabels.push(label);
              setStreamedOpLabels((arr) => [...arr, label]);
              break;
            }
            case "done":
              final = event.result;
              break;
            case "error":
              throw new Error(event.message);
          }
        }
      }

      if (final) {
        const remaining = final.ops.slice(localStreamedOps.length);
        const remainingLabels = remaining.length
          ? describeOps(docRef.current, remaining)
          : [];
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: final.reply || partialReply || "Done.",
          ops: final.ops,
          opLabels: [...localOpLabels, ...remainingLabels],
          at: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (remaining.length) {
          // Apply any ops the streaming heuristic missed (rare). Use remount: false
          // so Puck stays in sync via dispatch — no flash.
          onOpsRef.current(remaining, { remount: false });
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        // user-cancelled — silent
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setError(msg);
      }
    } finally {
      setPending(false);
      resetStreamingState();
      abortRef.current = null;
      requestAnimationFrame(() => taRef.current?.focus());
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-3 py-2 border-b border-slate-200">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">AI assistant</div>
        <div className="text-xs font-medium text-ink">Sonnet 5.5</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 && !pending ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Describe a change and I&apos;ll apply it. Examples:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[88%] bg-ink text-white text-xs rounded-2xl rounded-br-md px-2.5 py-1.5"
                  : "max-w-[88%] bg-slate-100 text-ink text-xs rounded-2xl rounded-bl-md px-2.5 py-1.5"
              }
            >
              {m.role === "user" ? (
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
              ) : (
                <MessageMarkdown text={m.text} />
              )}
              {m.opLabels && m.opLabels.length > 0 ? (
                <ul className="mt-1 pt-1 border-t border-slate-300/50 text-[10px] text-slate-500 space-y-0.5">
                  {m.opLabels.map((label, i) => (
                    <li key={i} className="flex gap-1">
                      <span className="text-emerald-600">✓</span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ))}

        {pending ? (
          <div className="flex justify-start">
            <div className="max-w-[88%] bg-slate-100 text-ink text-xs rounded-2xl rounded-bl-md px-2.5 py-1.5 space-y-1.5">
              {partialThinking ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setThinkingExpanded((v) => !v)}
                    className="text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    <span>{thinkingDone ? "Thought" : "Thinking"}</span>
                    {!thinkingDone ? <span className="animate-pulse">…</span> : null}
                    <span className="text-slate-400">{thinkingExpanded ? "▾" : "▸"}</span>
                  </button>
                  {thinkingExpanded ? (
                    <div className="mt-1 text-[11px] italic text-slate-500 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                      {partialThinking}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {partialReply ? (
                <div className="leading-relaxed">
                  <MessageMarkdown text={partialReply} />
                  <span className="inline-block w-1.5 h-3 ml-0.5 align-[-2px] bg-slate-400 animate-pulse" />
                </div>
              ) : !partialThinking ? (
                <div className="text-slate-500 animate-pulse">Thinking…</div>
              ) : null}

              {streamedOpLabels.length > 0 ? (
                <ul className="pt-1 border-t border-slate-300/50 text-[10px] text-slate-500 space-y-0.5">
                  {streamedOpLabels.map((label, i) => (
                    <li key={i} className="flex gap-1">
                      <span className="text-emerald-600">✓</span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 p-2">
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe a change…"
          rows={2}
          className="w-full resize-none rounded-md border border-slate-300 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none px-2 py-1.5 text-xs"
          disabled={pending}
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-400">Enter to send</span>
          <div className="flex items-center gap-1.5">
            {pending ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Stop
              </button>
            ) : null}
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || pending}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-accent text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

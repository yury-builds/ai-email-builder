"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Plugin } from "@puckeditor/core";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatPluginProvider } from "@/components/ChatPluginContext";
import { SaveTemplateModal } from "@/components/SaveTemplateModal";
import { SendModal } from "@/components/SendModal";
import { PublishModal } from "@/components/PublishModal";
import { VariablesPopover } from "@/components/VariablesPopover";
import { PreviewAsDropdown } from "@/components/PreviewAsDropdown";
import { applyOps, emptyDoc, ensureIds } from "@/lib/apply-ops";
import { getTemplate } from "@/lib/templates";
import { getUserTemplate } from "@/lib/user-templates";
import { applyVarsToDoc } from "@/lib/vars";
import type { EmailDoc, PlannerOp } from "@/lib/types";
import type { PuckDispatchFn } from "@/components/PuckDispatchBridge";

const EmailCanvas = dynamic(() => import("@/components/EmailCanvas").then((m) => m.EmailCanvas), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-slate-400">Loading canvas…</div>,
});

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
    <path d="M19 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
  </svg>
);

export default function StudioPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "blank";
  const initial = React.useMemo<EmailDoc>(() => {
    if (id === "blank") return emptyDoc("Untitled email", "");
    const tpl = getTemplate(id) ?? getUserTemplate(id);
    if (!tpl) return emptyDoc("Untitled email", "");
    return { ...tpl.doc, data: ensureIds(tpl.doc.data) };
  }, [id]);

  const [doc, setDoc] = React.useState<EmailDoc>(initial);
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saved">("idle");
  const [renderedHtml, setRenderedHtml] = React.useState<string>("");
  const [copyState, setCopyState] = React.useState<"idle" | "copied">("idle");
  const [puckRemoteVersion, setPuckRemoteVersion] = React.useState(0);
  const [previewProfileId, setPreviewProfileId] = React.useState<string | null>(null);
  const puckDispatchRef = React.useRef<PuckDispatchFn | null>(null);
  const docRef = React.useRef<EmailDoc>(initial);
  docRef.current = doc;

  // Keep `renderedHtml` fresh in the background for Send / Copy HTML.
  // Debounced so we don't render on every keystroke. We POST to /api/render
  // instead of calling @react-email/render in-browser — running that here would
  // spin up a second React reconciler alongside Puck's iframe and trip React's
  // "multiple renderers concurrently rendering the same context provider" error
  // for the ThemeContext used by EmailRoot.
  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc }),
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data: { html?: string }) => {
          if (!cancelled && typeof data.html === "string") setRenderedHtml(data.html);
        })
        .catch((err) => {
          if (cancelled || (err as Error).name === "AbortError") return;
          console.error("render failed", err);
        });
    }, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [doc]);

  const handleOps = React.useCallback((ops: PlannerOp[], opts?: { remount?: boolean }) => {
    const remountRequested = opts?.remount ?? true;
    const touchesData = ops.some(
      (op) => op.kind === "add_block" || op.kind === "update_props" || op.kind === "move_block" || op.kind === "remove_block",
    );

    let nextData = docRef.current.data;
    if (ops.length > 0) {
      const next = applyOps(docRef.current, ops);
      const lastTouched = lastTouchedId(docRef.current, next, ops);
      docRef.current = next;
      nextData = next.data;
      setDoc(next);
      if (lastTouched) {
        setHighlightedId(lastTouched);
        setTimeout(() => setHighlightedId(null), 1500);
      }
    }

    if (touchesData && !remountRequested && puckDispatchRef.current) {
      // Streaming path: inject the new data into Puck's internal state so the canvas
      // updates without remounting (preserves Puck's selection, scroll, in-flight UI).
      puckDispatchRef.current({ type: "setData", data: nextData });
    } else if (remountRequested && (touchesData || ops.length === 0)) {
      // Fallback: bump key to force a Puck remount with fresh initial data. Used when
      // there's no dispatch ref (Puck not yet mounted) or explicit reset is desired.
      setPuckRemoteVersion((v) => v + 1);
    }
  }, []);

  const chatPlugin = React.useMemo<Plugin>(
    () => ({
      name: "ai-chat",
      label: "AI",
      icon: <SparkleIcon />,
      render: () => <ChatPanel />,
    }),
    [],
  );

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(renderedHtml);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <ChatPluginProvider value={{ doc, onOps: handleOps }}>
      <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200">
          <Link href="/" className="text-sm text-slate-500 hover:text-ink">
            ← Templates
          </Link>
          <div className="flex-1 flex items-center gap-2 ml-2">
            <input
              value={doc.subject}
              onChange={(e) => setDoc((d) => ({ ...d, subject: e.target.value }))}
              placeholder="Subject line"
              className="flex-1 max-w-md text-sm font-medium px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
            />
            <input
              value={doc.preheader}
              onChange={(e) => setDoc((d) => ({ ...d, preheader: e.target.value }))}
              placeholder="Preheader"
              className="flex-1 max-w-md text-sm text-slate-600 px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
            />
          </div>
          <PreviewAsDropdown
            selectedId={previewProfileId}
            onSelect={(profile) => {
              setPreviewProfileId(profile.id);
              setDoc((d) => ({ ...d, vars: { ...profile.vars } }));
              setPuckRemoteVersion((v) => v + 1);
            }}
            onClear={() => {
              setPreviewProfileId(null);
              setDoc((d) => ({ ...d, vars: {} }));
              setPuckRemoteVersion((v) => v + 1);
            }}
          />
          <VariablesPopover
            doc={doc}
            onChange={(vars) => {
              setPreviewProfileId(null);
              setDoc((d) => ({ ...d, vars }));
            }}
          />
          <button
            onClick={copyHtml}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            {copyState === "copied" ? "Copied!" : "Copy HTML"}
          </button>
          <button
            onClick={() => setSaveOpen(true)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            {saveState === "saved" ? "Saved!" : "Save as template"}
          </button>
          <button
            onClick={() => setPublishOpen(true)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            Publish to Braze
          </button>
          <button
            onClick={() => setSendOpen(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-ink text-white hover:opacity-90"
          >
            Send test
          </button>
        </header>

        <div className="flex-1 flex min-h-0 flex-col">
          {previewProfileId ? (
            <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-[12px] text-amber-900 flex items-center justify-between">
              <span>
                Read-only preview — personalization tokens are being substituted live. Switch to <b>Default</b> to edit.
              </span>
            </div>
          ) : null}
          <div className="flex-1 min-w-0">
            <EmailCanvas
              data={previewProfileId ? applyVarsToDoc(doc).data : doc.data}
              onChange={(data) => {
                if (previewProfileId) return;
                setDoc((d) => ({ ...d, data }));
              }}
              highlightedId={highlightedId}
              chatPlugin={chatPlugin}
              remoteVersion={puckRemoteVersion}
              dispatchRef={puckDispatchRef}
            />
          </div>
        </div>

        {sendOpen ? <SendModal doc={doc} html={renderedHtml} onClose={() => setSendOpen(false)} /> : null}
        {publishOpen ? (
          <PublishModal
            doc={doc}
            docKey={id}
            defaultBrandId={(doc.data.root?.props as { theme?: string } | undefined)?.theme}
            onClose={() => setPublishOpen(false)}
          />
        ) : null}
        {saveOpen ? (
          <SaveTemplateModal
            doc={doc}
            onClose={() => setSaveOpen(false)}
            onSaved={() => {
              setSaveState("saved");
              setTimeout(() => setSaveState("idle"), 1500);
            }}
          />
        ) : null}
      </div>
    </ChatPluginProvider>
  );
}

function lastTouchedId(prev: EmailDoc, next: EmailDoc, ops: PlannerOp[]): string | null {
  for (const op of [...ops].reverse()) {
    if (op.kind === "update_props" || op.kind === "move_block" || op.kind === "remove_block") return op.id;
    if (op.kind === "add_block") {
      const prevIds = new Set(((prev.data.content ?? []) as { props: { id: string } }[]).map((i) => i.props.id));
      const added = ((next.data.content ?? []) as { props: { id: string } }[]).find((i) => !prevIds.has(i.props.id));
      if (added) return added.props.id;
    }
  }
  return null;
}

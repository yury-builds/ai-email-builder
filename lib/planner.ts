import Anthropic from "@anthropic-ai/sdk";
import { parsePartialJson } from "ai";
import { describeBlocksForPrompt } from "./schema";
import { themes } from "./themes";
import type { EmailDoc, PlannerOp } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const THINKING_BUDGET = (() => {
  const v = Number(process.env.ANTHROPIC_THINKING_BUDGET ?? "0");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
})();
// When unset, falls back to the dynamic formula below (2048 base, bumped to
// THINKING_BUDGET+2048 floored at 4096 when thinking is on). Anthropic requires
// max_tokens > thinking budget_tokens, so set this above THINKING_BUDGET if both.
const MAX_TOKENS_OVERRIDE = (() => {
  const v = Number(process.env.ANTHROPIC_MAX_TOKENS ?? "");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined;
})();
// Unset = omit `temperature` from the request (Anthropic default = 1.0, current behavior).
// Note: extended thinking requires temperature=1; setting this alongside THINKING_BUDGET>0 will be rejected by the API.
const TEMPERATURE = (() => {
  const raw = process.env.ANTHROPIC_TEMPERATURE?.trim();
  if (!raw) return undefined;
  const v = Number(raw);
  return Number.isFinite(v) ? v : undefined;
})();

export type ChatTurn = { role: "user" | "assistant"; text: string };

const opSchema = {
  type: "object" as const,
  properties: {
    reply: {
      type: "string" as const,
      description: "A short, friendly reply to the user explaining what you did or asking a clarifying question. 1–2 sentences.",
    },
    ops: {
      type: "array" as const,
      description: "Operations to apply to the email document in order. Empty array if no changes are needed.",
      items: {
        type: "object" as const,
        properties: {
          kind: {
            type: "string" as const,
            enum: ["add_block", "update_props", "move_block", "remove_block", "update_meta"],
          },
          type: { type: "string" as const, description: "Block type, only for add_block" },
          id: { type: "string" as const, description: "Target block id, for update_props/move_block/remove_block" },
          props: { type: "object" as const, description: "Block props. For add_block: full props. For update_props: partial props to merge.", additionalProperties: true },
          index: { type: "number" as const, description: "Target index, for add_block (insert position) and move_block (destination)" },
          toIndex: { type: "number" as const, description: "Destination index for move_block" },
          subject: { type: "string" as const, description: "New subject, only for update_meta" },
          preheader: { type: "string" as const, description: "New preheader, only for update_meta" },
          theme: { type: "string" as const, description: "Switch brand theme id (only for update_meta). Available ids are listed in the system prompt." },
        },
        required: ["kind"],
      },
    },
  },
  required: ["reply", "ops"],
};

function systemPrompt(doc: EmailDoc): string {
  const blocksDoc = describeBlocksForPrompt();
  const content = doc.data?.content ?? [];
  const docLines = content.map((c, i) => {
    const item = c as { type: string; props: Record<string, unknown> & { id?: string } };
    const preview = previewOfProps(item.props);
    return `  [${i}] id=${item.props?.id ?? "?"} type=${item.type} ${preview}`;
  });
  const currentThemeId = (doc.data?.root?.props as { theme?: string } | undefined)?.theme ?? "fresh";
  const themeList = Object.values(themes)
    .map((t) => `  - ${t.id} — ${t.name}`)
    .join("\n");

  return `You are the AI design assistant inside AI Email Builder — a drag-and-drop email tool powered by react.email.

The user describes a change in natural language. You decide which operations to apply to the email document.

# Available block types

${blocksDoc}

# Operation kinds

- add_block: insert a new block. Required: type. Optional: props (omit to use sensible defaults), index (where to insert; default = end).
- update_props: change props on an existing block. Required: id, props (partial — only include fields you want to change).
- move_block: reorder. Required: id, toIndex.
- remove_block: delete. Required: id.
- update_meta: change subject and/or preheader. Required: at least one of subject, preheader.

# Brand themes

Each email is rendered with one brand theme — it drives logo, fonts, colors, button shape, footer treatment, image radius, and section padding. The user can switch in the Puck root field or ask you to switch.

Available theme ids:
${themeList}

Current theme: ${currentThemeId}

To switch themes from chat, emit { kind: "update_meta", theme: "<id>" }.

# Current email document

Subject: ${doc.subject}
Preheader: ${doc.preheader}
Blocks:
${docLines.length > 0 ? docLines.join("\n") : "  (empty — nothing yet)"}

# Rules

1. Always respond by calling the apply_ops tool, even for greetings or questions. Use an empty ops array if no change is needed and answer in the reply.
2. Emit the "reply" field FIRST in the JSON object so the user sees it stream in immediately. Put "ops" after.
3. Reference existing blocks by their id from the document above. Never invent ids.
4. Prefer minimal updates: change one prop at a time rather than re-adding a block.
5. When adding blocks, place them in sensible positions — header at top, footer at bottom, CTAs after their motivating copy.
6. Use brand-appropriate colors as hex codes. Keep button text readable against the background. EmailButton blocks should always be center-aligned (alignment: "center") unless the user specifically asks otherwise.
7. Keep copy short — emails are skimmed, not read.
8. Reply in 1–2 sentences. Don't list the ops; the UI shows them.
9. Whenever the user asks for "two columns", "side-by-side", "left/right" content, image-left/text-right (or its reverse), or compares two things (features, plans, pros/cons), use ONE EmailColumns block — not two stacked EmailText/EmailImage blocks. EmailColumns now supports an optional image per side (leftImageUrl / rightImageUrl) above the heading + body. Leave any field that side doesn't need as an empty string.
10. Image URLs: NEVER invent URLs like "https://yourcompany.com/hero.jpg" — they'll 404 and show a broken image icon. Either:
   a. Leave imageUrl/src/leftImageUrl/rightImageUrl as "" (empty string) — the renderer hides the slot cleanly, which is usually best.
   b. Use a guaranteed-working placeholder: "https://placehold.co/600x300" for hero/image, "https://placehold.co/300x200" for column images, "https://placehold.co/120x40?text=YourLogo" for EmailHeader logos.`;
}

function previewOfProps(props: Record<string, unknown>): string {
  const fields = ["heading", "label", "body", "code", "companyName"];
  for (const f of fields) {
    const v = props[f];
    if (typeof v === "string" && v.length > 0) {
      const clipped = v.length > 60 ? v.slice(0, 57) + "…" : v;
      return `${f}=${JSON.stringify(clipped)}`;
    }
  }
  return "";
}

export type PlannerResult = { reply: string; ops: PlannerOp[] };

export type PlannerStreamEvent =
  | { type: "thinking_start" }
  | { type: "thinking_delta"; text: string }
  | { type: "thinking_end" }
  | { type: "reply_delta"; text: string }
  | { type: "op_added"; index: number; op: PlannerOp }
  | { type: "done"; result: PlannerResult }
  | { type: "error"; message: string };

export async function* streamPlan(
  opts: {
    doc: EmailDoc;
    message: string;
    history: ChatTurn[];
  },
  reqOpts?: { signal?: AbortSignal },
): AsyncGenerator<PlannerStreamEvent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    yield { type: "error", message: "ANTHROPIC_API_KEY is not set" };
    return;
  }

  const useThinking = THINKING_BUDGET > 0;
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS_OVERRIDE ?? (useThinking ? Math.max(THINKING_BUDGET + 2048, 4096) : 2048),
      ...(TEMPERATURE !== undefined ? { temperature: TEMPERATURE } : {}),
      system: systemPrompt(opts.doc),
      tools: [
        {
          name: "apply_ops",
          description: "Apply a list of operations to update the email document.",
          input_schema: opSchema,
        },
      ],
      // Forced tool-choice = progressive `input_json_delta` streaming from token 1, so
      // reply chars and each op land in the UI as they generate. Extended thinking
      // requires `auto`, which makes Claude emit free text and then dump the whole
      // tool input in one final burst — ops appear all at once. Keep thinking OFF
      // unless you specifically want deeper reasoning.
      tool_choice: useThinking
        ? { type: "auto" as const }
        : { type: "tool" as const, name: "apply_ops" },
      messages: [
        ...opts.history.map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: opts.message },
      ],
      ...(useThinking ? { thinking: { type: "enabled" as const, budget_tokens: THINKING_BUDGET } } : {}),
    },
    // Forward the client AbortSignal so Stop cancels the upstream Anthropic request
    // instead of just closing the response — otherwise we'd keep paying for tokens
    // after the user gave up.
    reqOpts?.signal ? { signal: reqOpts.signal } : undefined,
  );

  let toolJsonBuf = "";
  let lastReply = "";
  let lastEmittedOpIndex = -1;
  let thinkingOpen = false;
  // With tool_choice=auto + thinking, Claude may emit free `text_delta` BEFORE the
  // tool_use input. We stream that text to the user as "reply". When the tool input
  // arrives it will repeat the same reply field — track whether we're still in the
  // pre-tool text phase so we don't re-emit those chars from input_json_delta.
  let freeTextReply = "";

  try {
    for await (const event of stream as AsyncIterable<{
      type?: string;
      index?: number;
      content_block?: { type?: string };
      delta?: { type?: string; partial_json?: string; text?: string; thinking?: string };
    }>) {
      if (event.type === "content_block_start") {
        if (event.content_block?.type === "thinking" && !thinkingOpen) {
          thinkingOpen = true;
          yield { type: "thinking_start" };
        }
        continue;
      }
      if (event.type === "content_block_stop") {
        if (thinkingOpen && event.content_block?.type === "thinking") {
          thinkingOpen = false;
          yield { type: "thinking_end" };
        }
        continue;
      }
      if (event.type !== "content_block_delta" || !event.delta) continue;

      if (event.delta.type === "thinking_delta") {
        const text = event.delta.thinking ?? "";
        if (text) yield { type: "thinking_delta", text };
        continue;
      }

      if (event.delta.type === "input_json_delta") {
        toolJsonBuf += event.delta.partial_json ?? "";
        const partial = await parsePartialJson(toolJsonBuf);
        const value = (partial.value ?? null) as { reply?: unknown; ops?: unknown } | null;

        if (value && typeof value.reply === "string") {
          // Tool input's reply may duplicate text we already streamed via text_delta.
          // Only emit chars beyond what the user has seen.
          const alreadySeen = Math.max(lastReply.length, freeTextReply.length);
          if (value.reply.length > alreadySeen) {
            const delta = value.reply.slice(alreadySeen);
            lastReply = value.reply;
            yield { type: "reply_delta", text: delta };
          } else if (value.reply.length > lastReply.length) {
            lastReply = value.reply;
          }
        }

        if (value && Array.isArray(value.ops)) {
          const arr = value.ops as PlannerOp[];
          // Only emit ops we're confident are fully written: all but the last while parser
          // hasn't seen the closing bracket. Once the whole JSON parses cleanly, emit the rest.
          const safeCount = partial.state === "successful-parse" ? arr.length : arr.length - 1;
          for (let i = lastEmittedOpIndex + 1; i < safeCount; i++) {
            const op = arr[i];
            if (op && typeof op === "object") {
              yield { type: "op_added", index: i, op };
              lastEmittedOpIndex = i;
            }
          }
        }
        continue;
      }

      if (event.delta.type === "text_delta") {
        // Free text outside the tool call (only happens when tool_choice=auto and the
        // model chats before/instead of calling the tool). Stream it as reply but track
        // it separately so we can dedupe against the tool input's reply field.
        const text = event.delta.text ?? "";
        if (text) {
          freeTextReply += text;
          yield { type: "reply_delta", text };
        }
        continue;
      }
    }

    const final = await stream.finalMessage();
    let result: PlannerResult = { reply: lastReply || "Done.", ops: [] };
    for (const block of final.content) {
      if (block.type === "tool_use" && block.name === "apply_ops") {
        const input = block.input as { reply?: string; ops?: PlannerOp[] };
        result = {
          reply: input.reply ?? lastReply ?? "Done.",
          ops: Array.isArray(input.ops) ? input.ops : [],
        };
        break;
      }
      if (block.type === "text" && !result.ops.length && !result.reply) {
        result = { reply: block.text, ops: [] };
      }
    }
    // Emit any ops the streaming heuristic missed (e.g. the final element).
    for (let i = lastEmittedOpIndex + 1; i < result.ops.length; i++) {
      yield { type: "op_added", index: i, op: result.ops[i] };
    }
    yield { type: "done", result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Planner stream failed";
    yield { type: "error", message: msg };
  }
}

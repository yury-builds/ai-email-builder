import type { Data, DefaultComponents } from "@puckeditor/core";
import { puckConfig } from "./blocks";
import type { EmailDoc, EmailDocRootProps, PlannerOp } from "./types";

type PuckData = Data<DefaultComponents, EmailDocRootProps>;

let idCounter = 0;
function nextId(type: string): string {
  idCounter += 1;
  return `${type}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

type PuckItem = { type: string; props: Record<string, unknown> & { id: string } };

function defaults(type: string): Record<string, unknown> {
  const comp = (puckConfig.components as Record<string, { defaultProps?: Record<string, unknown> }>)[type];
  return { ...(comp?.defaultProps ?? {}) };
}

export function applyOp(doc: EmailDoc, op: PlannerOp): EmailDoc {
  const data: PuckData = doc.data ?? { content: [], root: { props: {} } };
  const content: PuckItem[] = ((data.content ?? []) as PuckItem[]).slice();

  switch (op.kind) {
    case "add_block": {
      if (!puckConfig.components[op.type as keyof typeof puckConfig.components]) return doc;
      const id = nextId(op.type);
      const item: PuckItem = { type: op.type, props: { ...defaults(op.type), ...(op.props ?? {}), id } };
      const idx = typeof op.index === "number" ? Math.max(0, Math.min(content.length, op.index)) : content.length;
      content.splice(idx, 0, item);
      return { ...doc, data: { ...data, content: content as unknown as PuckData["content"] } };
    }
    case "update_props": {
      const idx = content.findIndex((i) => i.props?.id === op.id);
      if (idx === -1) return doc;
      content[idx] = { ...content[idx], props: { ...content[idx].props, ...op.props, id: content[idx].props.id } };
      return { ...doc, data: { ...data, content: content as unknown as PuckData["content"] } };
    }
    case "move_block": {
      const idx = content.findIndex((i) => i.props?.id === op.id);
      if (idx === -1) return doc;
      const [moved] = content.splice(idx, 1);
      const target = Math.max(0, Math.min(content.length, op.toIndex));
      content.splice(target, 0, moved);
      return { ...doc, data: { ...data, content: content as unknown as PuckData["content"] } };
    }
    case "remove_block": {
      const next = content.filter((i) => i.props?.id !== op.id);
      return { ...doc, data: { ...data, content: next as unknown as PuckData["content"] } };
    }
    case "update_meta": {
      const nextSubject = op.subject ?? doc.subject;
      const nextPreheader = op.preheader ?? doc.preheader;
      if (typeof op.theme === "string" && op.theme.length > 0) {
        const nextData: PuckData = {
          ...data,
          root: { ...data.root, props: { ...(data.root?.props ?? {}), theme: op.theme } },
        };
        return { ...doc, subject: nextSubject, preheader: nextPreheader, data: nextData };
      }
      return { ...doc, subject: nextSubject, preheader: nextPreheader };
    }
    default:
      return doc;
  }
}

export function applyOps(doc: EmailDoc, ops: PlannerOp[]): EmailDoc {
  return ops.reduce((acc, op) => applyOp(acc, op), doc);
}

export function ensureIds(data: PuckData): PuckData {
  const content = ((data.content ?? []) as PuckItem[]).map((item) => {
    if (item.props?.id) return item;
    return { ...item, props: { ...item.props, id: nextId(item.type) } };
  });
  return { ...data, content: content as unknown as PuckData["content"] };
}

export function emptyDoc(subject = "Untitled email", preheader = ""): EmailDoc {
  return { subject, preheader, data: { content: [], root: { props: {} } } };
}

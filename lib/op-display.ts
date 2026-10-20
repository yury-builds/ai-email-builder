import { applyOp } from "./apply-ops";
import type { EmailDoc, PlannerOp } from "./types";

const blockLabels: Record<string, string> = {
  EmailHeader: "header",
  EmailHero: "hero",
  EmailText: "text block",
  EmailButton: "button",
  EmailImage: "image",
  EmailDivider: "divider",
  EmailColumns: "two-column section",
  EmailFooter: "footer",
  EmailCodeBlock: "code block",
};

function blockLabel(type: string | undefined): string {
  if (!type) return "block";
  return blockLabels[type] ?? type;
}

function findBlockType(doc: EmailDoc, id: string): string | undefined {
  const items = (doc.data?.content ?? []) as { type?: string; props?: { id?: string } }[];
  return items.find((i) => i.props?.id === id)?.type;
}

export function describeOp(op: PlannerOp, doc: EmailDoc): string {
  switch (op.kind) {
    case "add_block":
      return `Added ${blockLabel(op.type)}`;
    case "update_props":
      return `Updated ${blockLabel(findBlockType(doc, op.id))}`;
    case "move_block":
      return `Moved ${blockLabel(findBlockType(doc, op.id))}`;
    case "remove_block":
      return `Removed ${blockLabel(findBlockType(doc, op.id))}`;
    case "update_meta": {
      if (typeof op.theme === "string" && op.theme.length > 0) {
        return `Switched theme to ${op.theme}`;
      }
      const parts: string[] = [];
      if (op.subject !== undefined) parts.push("subject");
      if (op.preheader !== undefined) parts.push("preheader");
      if (parts.length === 0) return "Updated email";
      return `Updated ${parts.join(" + ")}`;
    }
  }
}

export function describeOps(doc: EmailDoc, ops: PlannerOp[]): string[] {
  const labels: string[] = [];
  let cur = doc;
  for (const op of ops) {
    labels.push(describeOp(op, cur));
    cur = applyOp(cur, op);
  }
  return labels;
}

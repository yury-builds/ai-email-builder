import type { EmailDoc } from "./types";
import { detectLiquidVars, renderLiquidPreview } from "./liquid";

// Personalization uses Braze Liquid (`{{${first_name}}}`, `{{custom_attribute.${tier}}}`).
// Bare `{{first_name}}` still resolves in the canvas preview for older docs, but Braze
// renders it empty — the publish check flags it.

export function detectVars(doc: EmailDoc): string[] {
  const found = new Set<string>();
  function scan(value: unknown): void {
    if (typeof value === "string") {
      for (const v of detectLiquidVars(value)) found.add(v);
    } else if (Array.isArray(value)) {
      for (const v of value) scan(v);
    } else if (value && typeof value === "object") {
      for (const v of Object.values(value as Record<string, unknown>)) scan(v);
    }
  }
  scan(doc.subject);
  scan(doc.preheader);
  scan(doc.data?.content);
  return Array.from(found).sort();
}

export function substituteVars(input: string, vars: Record<string, string> | undefined): string {
  if (!vars) return input;
  return renderLiquidPreview(input, { attributes: vars, resolveBareNames: true, keepUnresolved: true }).output;
}

function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)) as unknown as T;
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) next[k] = mapStrings(v, fn);
    return next as unknown as T;
  }
  return value;
}

export function applyVarsToDoc(doc: EmailDoc): EmailDoc {
  if (!doc.vars || Object.keys(doc.vars).length === 0) return doc;
  const sub = (s: string) => substituteVars(s, doc.vars);
  return {
    ...doc,
    subject: sub(doc.subject),
    preheader: sub(doc.preheader),
    data: { ...doc.data, content: mapStrings(doc.data.content ?? [], sub) as typeof doc.data.content },
  };
}

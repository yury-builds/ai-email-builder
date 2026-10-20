// Braze Liquid helpers, editor-agnostic.
//
// 1. protect/restore: React (and most HTML serializers) escape quotes, so
//    `{{${first_name} | default: "there"}}` would reach Braze as
//    `default: &quot;there&quot;` and break. We swap every Liquid span for an
//    inert token before rendering and put the raw Liquid back afterwards.
// 2. renderLiquidPreview: a deliberately small evaluator for previews. It covers
//    what the builder emits (attributes, custom attributes, content blocks, a few
//    filters) and reports anything else instead of guessing.

// `{{ … }}` may contain Braze's `${name}` references, so `}` is only allowed as the
// end of one of those — a plain lazy match would stop inside `{{${first_name}}}`.
const OUTPUT_SRC = String.raw`\{\{((?:\$\{[^}]*\}|[^}])*)\}\}`;
const LIQUID_RE = new RegExp(String.raw`${OUTPUT_SRC}|\{%[\s\S]*?%\}`, "g");
const TOKEN_RE = /__LQD_(\d+)__/g;

export function protectLiquid<T>(value: T, vault: string[]): T {
  if (typeof value === "string") {
    return value.replace(LIQUID_RE, (m) => {
      vault.push(m);
      return `__LQD_${vault.length - 1}__`;
    }) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => protectLiquid(v, vault)) as unknown as T;
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) next[k] = protectLiquid(v, vault);
    return next as T;
  }
  return value;
}

export function restoreLiquid(html: string, vault: string[]): string {
  return html.replace(TOKEN_RE, (m, i: string) => vault[Number(i)] ?? m);
}

/** Every `{{ … }}` / `{% … %}` span in a string. */
export function findLiquid(input: string): string[] {
  return input.match(LIQUID_RE) ?? [];
}

/** Opening/closing delimiter counts must match, or Braze rejects the message. */
export function hasUnbalancedLiquid(input: string): boolean {
  const count = (re: RegExp) => (input.match(re) ?? []).length;
  return count(/\{\{/g) !== count(/\}\}/g) || count(/\{%/g) !== count(/%\}/g);
}

export type LiquidContext = {
  attributes: Record<string, string>;
  customAttributes?: Record<string, string>;
  contentBlocks?: Record<string, string>;
  /** Builder canvas convenience: resolve bare `{{first_name}}` (Braze renders it empty). */
  resolveBareNames?: boolean;
  /** Leave unresolved output tags in place instead of rendering them empty. */
  keepUnresolved?: boolean;
};

export type LiquidPreview = { output: string; unsupported: string[] };

const OUTPUT_RE = new RegExp(OUTPUT_SRC, "g");
const ASSIGN_RE = /^\{%-?\s*assign\s+(\w+)\s*=\s*(?:'([^']*)'|"([^"]*)")\s*-?%\}$/;

export function renderLiquidPreview(
  input: string,
  ctx: LiquidContext,
  depth = 0,
  assigned: Record<string, string> = {},
): LiquidPreview {
  const unsupported: string[] = [];
  // One left-to-right pass, like Liquid: `{% assign %}` (also inside Content Blocks)
  // is visible to everything after it.
  const output = input.replace(LIQUID_RE, (match, inner: string | undefined) => {
    if (inner === undefined) {
      const a = match.match(ASSIGN_RE);
      if (a) {
        assigned[a[1]] = a[2] ?? a[3];
        return "";
      }
      // Control flow isn't evaluated; keep the tag visible and report it.
      unsupported.push(match);
      return match;
    }
    const [head, ...filters] = splitFilters(inner);
    let value = resolveExpression(head.trim(), ctx, depth, unsupported, assigned);
    for (const f of filters) {
      const r = applyFilter(value, f.trim());
      if (r === null) unsupported.push(`filter "${f.trim()}"`);
      else value = r;
    }
    if (value === undefined) return ctx.keepUnresolved ? match : "";
    return value;
  });
  return { output, unsupported: Array.from(new Set(unsupported)) };
}

/** Variables a text defines with `{% assign %}`. */
export function assignedNames(input: string): string[] {
  return Array.from(input.matchAll(/\{%-?\s*assign\s+(\w+)/g), (m) => m[1]);
}

function splitFilters(inner: string): string[] {
  // Split on `|` outside quotes.
  const parts: string[] = [];
  let buf = "";
  let quote: string | null = null;
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === "|") {
      parts.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  parts.push(buf);
  return parts;
}

function resolveExpression(
  expr: string,
  ctx: LiquidContext,
  depth: number,
  unsupported: string[],
  assigned: Record<string, string>,
): string | undefined {
  let m: RegExpMatchArray | null;
  if ((m = expr.match(/^\$\{(\w+)\}$/))) return nonEmpty(ctx.attributes[m[1]]);
  if ((m = expr.match(/^custom_attribute\.\$\{(\w+)\}$/))) {
    return nonEmpty((ctx.customAttributes ?? ctx.attributes)[m[1]]);
  }
  if ((m = expr.match(/^content_blocks\.\$\{([\w-]+)\}$/))) {
    const block = ctx.contentBlocks?.[m[1]];
    if (block === undefined) {
      unsupported.push(`missing content block "${m[1]}"`);
      return undefined;
    }
    // Braze expands Content Blocks nested once; a third level renders empty.
    if (depth >= 2) {
      unsupported.push(`content block "${m[1]}" nested deeper than Braze allows`);
      return "";
    }
    const inner = renderLiquidPreview(block, ctx, depth + 1, assigned);
    unsupported.push(...inner.unsupported);
    return inner.output;
  }
  if ((m = expr.match(/^'([^']*)'$|^"([^"]*)"$/))) return m[1] ?? m[2];
  if ((m = expr.match(/^(\w+)$/))) {
    if (m[1] in assigned) return assigned[m[1]];
    return ctx.resolveBareNames ? nonEmpty(ctx.attributes[m[1]]) : undefined;
  }
  unsupported.push(`expression "${expr}"`);
  return undefined;
}

function applyFilter(value: string | undefined, filter: string): string | undefined | null {
  const m = filter.match(/^(\w+)\s*(?::\s*(?:'([^']*)'|"([^"]*)"))?$/);
  if (!m) return null;
  const arg = m[2] ?? m[3];
  switch (m[1]) {
    case "default":
      return value === undefined || value === "" ? arg ?? "" : value;
    case "upcase":
      return value?.toUpperCase();
    case "downcase":
      return value?.toLowerCase();
    case "capitalize":
      return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    default:
      return null;
  }
}

function nonEmpty(v: string | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Attribute names referenced by personalization tags, for the variables UI. */
export function detectLiquidVars(input: string): string[] {
  const found = new Set<string>();
  for (const [, inner] of input.matchAll(OUTPUT_RE)) {
    const head = splitFilters(inner)[0].trim();
    const m =
      head.match(/^\$\{(\w+)\}$/) ?? head.match(/^custom_attribute\.\$\{(\w+)\}$/) ?? head.match(/^(\w+)$/);
    if (m) found.add(m[1]);
  }
  return Array.from(found);
}

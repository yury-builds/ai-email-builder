import { assignedNames, findLiquid, hasUnbalancedLiquid, renderLiquidPreview } from "../liquid";
import type { ContentBlockPayload, EmailTemplatePayload } from "./api";
import { byteLength } from "./transport";

// What gets published for one brand — independent of which editor produced the HTML.
// Any editor (the current Puck canvas, Beefree, Unlayer, GrapesJS…) only needs to
// produce this shape; validation and publishing don't care where it came from.

export type BrandEmailPackage = {
  brandId: string;
  brandName: string;
  workspace: string;
  template: EmailTemplatePayload;
  contentBlocks: ContentBlockPayload[];
};

export type Issue = { level: "error" | "warning"; code: string; message: string };

const KB = 1024;
const CONTENT_BLOCK_REF = /\{\{\s*content_blocks\.\$\{([\w-]+)\}\s*\}\}/g;
const UNSUBSCRIBE_RE = /\$\{(unsubscribe_url|set_user_to_unsubscribed_url)\}/;

export function validatePackage(pkg: BrandEmailPackage): Issue[] {
  const issues: Issue[] = [];
  const add = (level: Issue["level"], code: string, message: string) => issues.push({ level, code, message });
  const t = pkg.template;

  if (!t.subject.trim()) add("error", "subject-missing", "Subject line is empty.");

  const bodyBytes = byteLength(t.body);
  if (bodyBytes > 400 * KB) add("error", "body-too-large", `Template body is ${kb(bodyBytes)}; Braze allows 400 KB.`);

  // Gmail clips messages over ~102 KB — measure what the recipient gets, with blocks expanded.
  const sentBytes = byteLength(expandContentBlocks(t.body, pkg.contentBlocks));
  if (sentBytes > 102 * KB) {
    add("warning", "gmail-clipping", `Sent HTML is about ${kb(sentBytes)}; Gmail clips messages over 102 KB.`);
  }

  const blockNames = new Set(pkg.contentBlocks.map((b) => b.name));
  for (const b of pkg.contentBlocks) {
    if (byteLength(b.content) >= 50 * KB) {
      add("error", "block-too-large", `Content Block "${b.name}" is ${kb(byteLength(b.content))}; Braze allows under 50 KB.`);
    }
    if (b.name.length >= 100 || !/^[A-Za-z0-9_-]+$/.test(b.name)) {
      add("error", "block-name", `Content Block name "${b.name}" may only use letters, numbers, dashes and underscores.`);
    }
  }

  for (const ref of t.body.matchAll(CONTENT_BLOCK_REF)) {
    if (!blockNames.has(ref[1])) {
      add("warning", "external-block", `Uses Content Block "${ref[1]}", which isn't published from here — it must already exist in the "${pkg.workspace}" workspace.`);
    }
  }

  const texts: [string, string][] = [
    ["subject", t.subject],
    ["preheader", t.preheader ?? ""],
    ["body", t.body],
    ...pkg.contentBlocks.map((b) => [`block ${b.name}`, b.content] as [string, string]),
  ];
  const assigned = new Set(texts.flatMap(([, text]) => assignedNames(text)));
  for (const [where, text] of texts) {
    if (hasUnbalancedLiquid(text)) add("error", "liquid-unbalanced", `Unclosed Liquid tag in ${where}.`);
    for (const tag of findLiquid(text)) {
      const bare = tag.match(/^\{\{\s*(\w+)\s*(\|[^}]*)?\}\}$/);
      if (bare && !assigned.has(bare[1])) {
        add("warning", "liquid-bare-name", `${tag} in ${where} renders empty in Braze — use {{\${${bare[1]}}}} or {{custom_attribute.\${${bare[1]}}}}.`);
      }
    }
  }

  for (const [where, html] of [["body", t.body], ...pkg.contentBlocks.map((b) => [`block ${b.name}`, b.content])]) {
    for (const [, attr, url] of html.matchAll(/\b(src|href)="([^"]*)"/g)) {
      if (!url || url.includes("{{") || /^(mailto:|tel:|#)/.test(url)) continue;
      if (!/^[a-z]+:/i.test(url)) {
        add("error", "relative-url", `Relative URL "${url}" in ${where} won't resolve in an inbox. Set ASSET_BASE_URL or use an absolute URL.`);
      } else if (url.startsWith("http://")) {
        add(attr === "src" ? "error" : "warning", "insecure-url", `${attr} "${url}" in ${where} uses http://; use https://.`);
      } else if (/placehold\.co|example\.com/.test(url)) {
        add("warning", "placeholder-url", `Placeholder ${attr} "${url}" in ${where}.`);
      }
    }
  }

  const allHtml = [t.body, ...pkg.contentBlocks.map((b) => b.content)].join("\n");
  if (!UNSUBSCRIBE_RE.test(allHtml)) {
    add("warning", "no-unsubscribe", "No {{${unsubscribe_url}}} link — marketing email needs one (add the brand footer).");
  }

  return dedupe(issues);
}

/** Inline Content Blocks the way Braze does at send time (one nesting level). */
export function expandContentBlocks(html: string, blocks: ContentBlockPayload[]): string {
  const byName = new Map(blocks.map((b) => [b.name, b.content]));
  const expand = (s: string, depth: number): string =>
    s.replace(CONTENT_BLOCK_REF, (m, name: string) => {
      const c = byName.get(name);
      if (c === undefined) return m;
      // A block may include one more block; a third level renders empty.
      return depth >= 2 ? "" : expand(c, depth + 1);
    });
  return expand(html, 0);
}

/** Render a package as a recipient would see it, for a sample profile. */
export function previewPackage(
  pkg: BrandEmailPackage,
  attributes: Record<string, string>,
): { html: string; subject: string; unsupported: string[] } {
  const ctx = {
    attributes: { unsubscribe_url: "#unsubscribe", ...attributes },
    customAttributes: attributes,
    contentBlocks: Object.fromEntries(pkg.contentBlocks.map((b) => [b.name, b.content])),
  };
  const body = renderLiquidPreview(pkg.template.body, ctx);
  const subject = renderLiquidPreview(pkg.template.subject, ctx);
  return {
    html: body.output,
    subject: subject.output,
    unsupported: Array.from(new Set([...body.unsupported, ...subject.unsupported])),
  };
}

function kb(bytes: number): string {
  return `${(bytes / KB).toFixed(1)} KB`;
}

function dedupe(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.level}|${i.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

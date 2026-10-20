import type { Brand } from "../brands";

// Everything the builder creates in Braze is prefixed, so it can't collide with
// Content Blocks or templates teams make by hand.
//
// Staging copies live next to production ones under a suffix. A staged template only
// references staged blocks, so it can be tested in Braze without touching live sends;
// promoting copies exactly what was tested onto the production names.

export const BRAZE_PREFIX = "es_";
const STAGING_SUFFIX = "__staging";

export type Stage = "staging" | "production";
export type BrandPart = "header" | "footer" | "style";

/** Braze Content Block names: letters, digits, dashes and underscores, under 100 chars. */
export function blockName(brand: Brand, part: BrandPart, stage: Stage): string {
  const base = `${BRAZE_PREFIX}${brand.id}_${part}`.replace(/[^A-Za-z0-9_-]/g, "_");
  return stage === "staging" ? `${base}${STAGING_SUFFIX}` : base;
}

export function templateName(brand: Brand, docKey: string, stage: Stage): string {
  return `[${brand.id}] ${docKey}${stage === "staging" ? " (staging)" : ""}`;
}

/** Point every staged Content Block reference at its production name. */
export function unstageReferences(text: string): string {
  return text.replace(
    new RegExp(String.raw`\{\{\s*content_blocks\.\$\{([\w-]+)${STAGING_SUFFIX}\}\s*\}\}`, "g"),
    (_m, name: string) => `{{content_blocks.\${${name}}}}`,
  );
}

export function isStagedBlock(name: string): boolean {
  return name.endsWith(STAGING_SUFFIX);
}

export function unstagedName(name: string): string {
  return isStagedBlock(name) ? name.slice(0, -STAGING_SUFFIX.length) : name;
}

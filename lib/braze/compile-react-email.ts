import type { Brand } from "../brands";
import { protectLiquid, restoreLiquid } from "../liquid";
import { RAW_LIQUID_BLOCK, renderBlockHtml, renderEmailHtml, renderEmailText } from "../render";
import type { Theme } from "../themes";
import type { EmailDoc } from "../types";
import type { ContentBlockPayload } from "./api";
import { blockName, templateName, type Stage } from "./naming";
import type { BrandEmailPackage } from "./package";

// Adapter: current builder document (Puck JSON + react.email blocks) → BrandEmailPackage.
// This is the only editor-specific step; swapping editors means replacing this file.
//
// Header and footer blocks are replaced by references to the brand's shared Content
// Blocks, rendered from the brand registry rather than the email's own props.
//
// liveStyles (experimental): instead of baking the brand's colors and fonts into the
// HTML, every style uses a Liquid variable assigned in the brand's stylesheet Content
// Block. Changing a brand token then restyles every email that brand has in Braze,
// live ones included — templates stay byte-identical across token changes.

export type CompileOptions = { stage?: Stage; liveStyles?: boolean };

const CHROME = { EmailHeader: "header", EmailFooter: "footer" } as const;

/** Theme tokens that become Liquid variables in liveStyles mode. */
const STYLE_TOKENS = [
  "brand",
  "brandFg",
  "heading",
  "body",
  "muted",
  "border",
  "surface",
  "canvas",
  "footerBg",
  "footerInk",
  "linkColor",
  "fontHeading",
  "fontBody",
] as const satisfies readonly (keyof Theme)[];

type Item = { type: string; props: Record<string, unknown> };

export async function compileForBrand(
  doc: EmailDoc,
  brand: Brand,
  docKey: string,
  opts: CompileOptions = {},
): Promise<BrandEmailPackage> {
  const stage = opts.stage ?? "production";
  const baseTheme = { ...brand.theme, logo: absolutize(brand.theme.logo) };
  const theme: Theme = opts.liveStyles ? liquidTheme(baseTheme) : baseTheme;
  const used = new Set<"header" | "footer">();

  const content = ((doc.data.content ?? []) as Item[]).map((item) => {
    const part = CHROME[item.type as keyof typeof CHROME];
    if (part) {
      used.add(part);
      return { type: RAW_LIQUID_BLOCK, props: { liquid: blockRef(blockName(brand, part, stage)) } };
    }
    return { ...item, props: mapUrls(item.props) };
  });

  const branded: EmailDoc = {
    ...doc,
    vars: undefined, // preview values must never reach Braze
    data: {
      ...doc.data,
      content: content as EmailDoc["data"]["content"],
      root: { ...doc.data.root, props: { ...(doc.data.root?.props ?? {}), theme: brand.theme.id } },
    },
  };

  const vault: string[] = [];
  const safe = protectLiquid(branded, vault);
  let body = restoreLiquid(await renderEmailHtml(safe, { theme }), vault);
  const plaintext = restoreLiquid(await renderEmailText(safe, { theme }), vault);

  const contentBlocks: ContentBlockPayload[] = [];
  if (opts.liveStyles) {
    const name = blockName(brand, "style", stage);
    contentBlocks.push({
      name,
      description: `${brand.name} brand stylesheet (Liquid variables). Changes restyle every email that uses it, including live sends.`,
      content: stylesheetBlock(baseTheme),
    });
    // Liquid runs top to bottom, so the variables must be assigned before any use —
    // including the <body> background. The block outputs nothing but assignments.
    body = `${blockRef(name)}${body}`;
  }
  for (const part of ["header", "footer"] as const) {
    if (!used.has(part)) continue;
    const type = part === "header" ? "EmailHeader" : "EmailFooter";
    const blockVault: string[] = [];
    const props = protectLiquid(mapUrls(brand.chrome[part] as unknown as Record<string, unknown>), blockVault);
    contentBlocks.push({
      name: blockName(brand, part, stage),
      description: `${brand.name} shared ${part}. Managed by the email builder — edits made in Braze are overwritten.`,
      content: restoreLiquid(await renderBlockHtml(type, props, theme), blockVault),
    });
  }

  return {
    brandId: brand.id,
    brandName: brand.name,
    workspace: brand.workspace,
    template: {
      template_name: templateName(brand, docKey, stage),
      subject: doc.subject,
      preheader: doc.preheader,
      body,
      plaintext_body: plaintext,
    },
    contentBlocks,
  };
}

function blockRef(name: string): string {
  return `{{content_blocks.\${${name}}}}`;
}

function varName(token: string): string {
  return `es_${token.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`;
}

function liquidTheme(theme: Theme): Theme {
  const next = { ...theme } as Record<string, unknown>;
  for (const t of STYLE_TOKENS) next[t] = `{{${varName(t)}}}`;
  return next as Theme;
}

// Values land inside style="…" attributes after Liquid runs, so they're stored
// attribute-escaped (font stacks contain double quotes).
function stylesheetBlock(theme: Theme): string {
  const escape = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
  return STYLE_TOKENS.map((t) => `{% assign ${varName(t)} = '${escape(String(theme[t]))}' %}`).join("");
}

// Root-relative asset paths only work inside the app. With ASSET_BASE_URL set they're
// rewritten to absolute URLs; otherwise they're left for validation to flag.
function absolutize(url: string): string {
  const base = process.env.ASSET_BASE_URL;
  return base && url.startsWith("/") ? `${base.replace(/\/$/, "")}${url}` : url;
}

function mapUrls(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    out[k] = typeof v === "string" && /(url|src|href)$/i.test(k) ? absolutize(v) : v;
  }
  return out;
}

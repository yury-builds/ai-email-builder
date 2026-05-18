import { z } from "zod";

const align3 = z.enum(["left", "center", "right"]);
const align2 = z.enum(["left", "center"]);

export const blockSchemas = {
  EmailHeader: z.object({
    logoUrl: z.string().describe("Absolute URL to the logo image"),
    logoAlt: z.string(),
    logoWidth: z.number().describe("Pixel width, typically 80–180"),
    alignment: align3,
  }),
  EmailHero: z.object({
    heading: z.string(),
    subhead: z.string().describe("Short subtitle under the heading"),
    imageUrl: z.string().describe("Optional hero image, empty string for none"),
    imageAlt: z.string(),
    alignment: align2,
  }),
  EmailText: z.object({
    body: z.string(),
    alignment: align3,
    emphasis: z.enum(["normal", "muted", "strong"]),
  }),
  EmailButton: z.object({
    label: z.string(),
    href: z.string(),
    alignment: align3,
    color: z.string().describe("Background hex like #6366f1"),
    textColor: z.string().describe("Foreground hex"),
  }),
  EmailImage: z.object({
    src: z.string(),
    alt: z.string(),
    width: z.number(),
    href: z.string().describe("Optional click target, empty string for none"),
  }),
  EmailDivider: z.object({
    spacing: z.enum(["tight", "default", "loose"]),
  }),
  EmailColumns: z.object({
    leftImageUrl: z.string().describe("Optional image for the left column, empty string for none"),
    leftImageAlt: z.string(),
    leftHeading: z.string().describe("Optional, empty string for none"),
    leftBody: z.string().describe("Optional, empty string for none"),
    rightImageUrl: z.string().describe("Optional image for the right column, empty string for none"),
    rightImageAlt: z.string(),
    rightHeading: z.string().describe("Optional, empty string for none"),
    rightBody: z.string().describe("Optional, empty string for none"),
  }),
  EmailFooter: z.object({
    companyName: z.string(),
    address: z.string(),
    unsubscribeUrl: z.string(),
    socialLinks: z.array(z.object({ label: z.string(), href: z.string() })),
  }),
  EmailCodeBlock: z.object({
    label: z.string(),
    code: z.string(),
  }),
} as const;

export type EmailBlockType = keyof typeof blockSchemas;

export const blockShortDoc: Record<EmailBlockType, string> = {
  EmailHeader: "Top-of-email logo bar. Use once at the top.",
  EmailHero: "Big heading + subhead + optional image. Use once near the top to set the email's purpose.",
  EmailText: "Paragraph copy. Use multiple for body content.",
  EmailButton: "Call-to-action button. Limit to 1–2 per email.",
  EmailImage: "Standalone image with optional click target.",
  EmailDivider: "Horizontal rule between sections.",
  EmailColumns: "Two-column side-by-side section. Each column can hold an optional image plus an optional heading and body. Use for feature highlights, image-left/text-right or image-right/text-left layouts, or any two-up comparison.",
  EmailFooter: "Bottom footer with company info and unsubscribe link. Use once.",
  EmailCodeBlock: "Large display for verification codes, magic links, order numbers.",
};

export function describeBlocksForPrompt(): string {
  return (Object.keys(blockSchemas) as EmailBlockType[])
    .map((type) => {
      const schema = blockSchemas[type];
      const fields: string[] = [];
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      for (const [key, def] of Object.entries(shape)) {
        const d = def.description ? ` — ${def.description}` : "";
        const t = zodTypeLabel(def);
        fields.push(`    ${key}: ${t}${d}`);
      }
      return `- ${type}: ${blockShortDoc[type]}\n  props:\n${fields.join("\n")}`;
    })
    .join("\n\n");
}

function zodTypeLabel(def: z.ZodTypeAny): string {
  const t = def._def?.typeName;
  if (t === "ZodEnum") return (def as z.ZodEnum<[string, ...string[]]>).options.map((o) => `"${o}"`).join(" | ");
  if (t === "ZodNumber") return "number";
  if (t === "ZodString") return "string";
  if (t === "ZodArray") return `${zodTypeLabel((def as z.ZodArray<z.ZodTypeAny>).element)}[]`;
  if (t === "ZodObject") return "object";
  return "unknown";
}

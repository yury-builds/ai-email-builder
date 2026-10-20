import type { Brand } from "../brands";
import type { BrazeApi } from "./api";
import { blockName, isStagedBlock, templateName, unstagedName, unstageReferences } from "./naming";
import type { BrandEmailPackage } from "./package";

// Promotion re-publishes exactly what's in Braze under the staging names — not a
// fresh render of the builder document, which may have changed since it was tested.

const BLOCK_REF = /\{\{\s*content_blocks\.\$\{([\w-]+)\}\s*\}\}/g;

export async function stagedPackage(api: BrazeApi, brand: Brand, docKey: string): Promise<BrandEmailPackage> {
  const stagedName = templateName(brand, docKey, "staging");
  const summary = (await api.listEmailTemplates()).find((t) => t.template_name === stagedName);
  if (!summary) throw new Error(`Nothing staged for ${brand.name}: no template named "${stagedName}".`);
  const tpl = await api.getEmailTemplate(summary.email_template_id);

  const blockIndex = await api.listContentBlocks();
  const blocks: BrandEmailPackage["contentBlocks"] = [];
  const seen = new Set<string>();
  const collect = async (text: string) => {
    for (const [, name] of text.matchAll(BLOCK_REF)) {
      if (!isStagedBlock(name) || seen.has(name)) continue;
      seen.add(name);
      const found = blockIndex.find((b) => b.name === name);
      if (!found) throw new Error(`Staged template references "${name}", which doesn't exist in "${api.workspace}".`);
      const info = await api.getContentBlock(found.content_block_id);
      await collect(info.content); // one nesting level is all Braze expands
      blocks.push({
        name: unstagedName(name),
        description: info.description,
        content: unstageReferences(info.content),
      });
    }
  };
  await collect(tpl.body);

  // Keep the dependency order the publisher expects: style first, then header/footer.
  const order = [blockName(brand, "style", "production"), blockName(brand, "header", "production")];
  blocks.sort((a, b) => rank(order, a.name) - rank(order, b.name));

  return {
    brandId: brand.id,
    brandName: brand.name,
    workspace: brand.workspace,
    template: {
      template_name: templateName(brand, docKey, "production"),
      subject: tpl.subject,
      preheader: tpl.preheader ?? "",
      body: unstageReferences(tpl.body),
      plaintext_body: tpl.plaintext_body ?? "",
    },
    contentBlocks: blocks,
  };
}

function rank(order: string[], name: string): number {
  const i = order.indexOf(name);
  return i === -1 ? order.length : i;
}

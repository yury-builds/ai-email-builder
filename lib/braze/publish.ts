import type { BrazeApi, ContentBlockSummary, EmailTemplateSummary } from "./api";
import { validatePackage, type BrandEmailPackage, type Issue } from "./package";

// Publishing is idempotent: templates are matched by name and Content Blocks by name,
// so re-publishing updates in place, and identical content is left untouched.
//
// Two Braze behaviors shape the result notes:
//  - A template is copied into a campaign when the campaign is created, so updating it
//    only affects campaigns created afterwards.
//  - A Content Block included via Liquid is resolved at send time, so updating it
//    changes every live message that includes it, immediately.

export type PublishAction = {
  kind: "content_block" | "email_template";
  name: string;
  action: "created" | "updated" | "unchanged" | "skipped" | "failed";
  id?: string;
  note?: string;
  error?: string;
};

export type BrandPublishResult = {
  brandId: string;
  brandName: string;
  workspace: string;
  mode: "dry-run" | "live";
  ok: boolean;
  issues: Issue[];
  actions: PublishAction[];
};

type WorkspaceIndex = { templates: EmailTemplateSummary[]; blocks: ContentBlockSummary[] };

/** Publish many brand packages, listing each workspace once and brands sequentially. */
export async function publishPackages(
  packages: BrandEmailPackage[],
  apiFor: (workspace: string) => BrazeApi,
): Promise<BrandPublishResult[]> {
  const indexes = new Map<string, Promise<WorkspaceIndex>>();
  const results: BrandPublishResult[] = [];
  for (const pkg of packages) {
    const api = apiFor(pkg.workspace);
    if (!indexes.has(pkg.workspace)) {
      indexes.set(
        pkg.workspace,
        Promise.all([api.listEmailTemplates(), api.listContentBlocks()]).then(([templates, blocks]) => ({
          templates,
          blocks,
        })),
      );
    }
    let index: WorkspaceIndex;
    try {
      index = await indexes.get(pkg.workspace)!;
    } catch (err) {
      results.push(failed(pkg, api, `Couldn't list the "${pkg.workspace}" workspace: ${message(err)}`));
      continue;
    }
    results.push(await publishPackage(api, pkg, index));
  }
  return results;
}

export async function publishPackage(
  api: BrazeApi,
  pkg: BrandEmailPackage,
  index: WorkspaceIndex,
): Promise<BrandPublishResult> {
  const issues = validatePackage(pkg);
  const result: BrandPublishResult = {
    brandId: pkg.brandId,
    brandName: pkg.brandName,
    workspace: pkg.workspace,
    mode: api.mode,
    ok: false,
    issues,
    actions: [],
  };

  if (issues.some((i) => i.level === "error")) {
    result.actions.push({ kind: "email_template", name: pkg.template.template_name, action: "skipped", note: "Fix the errors first." });
    return result;
  }

  // Content Blocks first, so the template never references a block that doesn't exist.
  for (const block of pkg.contentBlocks) {
    const existing = index.blocks.find((b) => b.name === block.name);
    try {
      if (!existing) {
        const res = await api.createContentBlock({ state: "active", ...block });
        index.blocks.push({ content_block_id: res.content_block_id, name: block.name, liquid_tag: res.liquid_tag, last_edited: "" });
        result.actions.push({ kind: "content_block", name: block.name, action: "created", id: res.content_block_id });
        continue;
      }
      const info = await api.getContentBlock(existing.content_block_id);
      if (info.content === block.content) {
        result.actions.push({ kind: "content_block", name: block.name, action: "unchanged", id: existing.content_block_id });
        continue;
      }
      await api.updateContentBlock(existing.content_block_id, { content: block.content, description: block.description });
      result.actions.push({
        kind: "content_block",
        name: block.name,
        action: "updated",
        id: existing.content_block_id,
        note: "Live change: every message that includes this block sends the new version from now on.",
      });
    } catch (err) {
      result.actions.push({ kind: "content_block", name: block.name, action: "failed", error: message(err) });
      result.actions.push({ kind: "email_template", name: pkg.template.template_name, action: "skipped", note: "A Content Block failed." });
      return result;
    }
  }

  const t = pkg.template;
  const matches = index.templates.filter((x) => x.template_name === t.template_name);
  if (matches.length > 1) {
    result.issues.push({
      level: "warning",
      code: "duplicate-template-name",
      message: `${matches.length} templates are named "${t.template_name}" in "${pkg.workspace}"; updating the most recently changed one.`,
    });
  }
  const existing = matches.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  try {
    if (!existing) {
      const res = await api.createEmailTemplate(t);
      index.templates.push({ email_template_id: res.email_template_id, template_name: t.template_name, created_at: "", updated_at: "" });
      result.actions.push({ kind: "email_template", name: t.template_name, action: "created", id: res.email_template_id });
    } else {
      const info = await api.getEmailTemplate(existing.email_template_id);
      const same =
        info.body === t.body &&
        info.subject === t.subject &&
        (info.preheader ?? "") === (t.preheader ?? "") &&
        (info.plaintext_body ?? "") === (t.plaintext_body ?? "");
      if (same) {
        result.actions.push({ kind: "email_template", name: t.template_name, action: "unchanged", id: existing.email_template_id });
      } else {
        const { template_name: _name, ...fields } = t;
        await api.updateEmailTemplate(existing.email_template_id, fields);
        result.actions.push({
          kind: "email_template",
          name: t.template_name,
          action: "updated",
          id: existing.email_template_id,
          note: "Existing campaigns keep their copy; only campaigns created from now on use this version.",
        });
      }
    }
    result.ok = true;
  } catch (err) {
    result.actions.push({ kind: "email_template", name: t.template_name, action: "failed", error: message(err) });
  }
  return result;
}

function failed(pkg: BrandEmailPackage, api: BrazeApi, error: string): BrandPublishResult {
  return {
    brandId: pkg.brandId,
    brandName: pkg.brandName,
    workspace: pkg.workspace,
    mode: api.mode,
    ok: false,
    issues: validatePackage(pkg),
    actions: [{ kind: "email_template", name: pkg.template.template_name, action: "failed", error }],
  };
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

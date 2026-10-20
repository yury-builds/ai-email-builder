import type { BrazeApi } from "./api";
import { BrazeApiError } from "./transport";

// Checks what the workspace's API key can do before anything is published, so a
// missing permission shows up as one clear line instead of a half-finished publish.
// Reads are always checked. Write checks are opt-in: Braze has no delete endpoints,
// so they leave a draft Content Block (es__connection_check) behind, and template
// writes aren't tested at all — they'd leave a template nobody can remove.

export type PermissionCheck = {
  permission: string;
  status: "ok" | "missing" | "error" | "untested";
  message?: string;
};

const CHECK_BLOCK = "es__connection_check";

export async function checkConnection(api: BrazeApi, opts: { write?: boolean } = {}): Promise<PermissionCheck[]> {
  const checks: PermissionCheck[] = [];
  const run = async <T>(permission: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      const value = await fn();
      checks.push({ permission, status: "ok" });
      return value;
    } catch (err) {
      const denied = err instanceof BrazeApiError && (err.status === 401 || err.status === 403);
      checks.push({
        permission,
        status: denied ? "missing" : "error",
        message: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  };
  const untested = (permission: string, message: string) => checks.push({ permission, status: "untested", message });

  const templates = await run("templates.email.list", () => api.listEmailTemplates());
  if (templates?.length) await run("templates.email.info", () => api.getEmailTemplate(templates[0].email_template_id));
  else untested("templates.email.info", "No templates in the workspace to read yet.");

  const blocks = await run("content_blocks.list", () => api.listContentBlocks());
  if (blocks?.length) await run("content_blocks.info", () => api.getContentBlock(blocks[0].content_block_id));
  else untested("content_blocks.info", "No Content Blocks in the workspace to read yet.");

  if (opts.write) {
    const existing = blocks?.find((b) => b.name === CHECK_BLOCK);
    const content = `Connection check ${new Date().toISOString()}`;
    if (existing) {
      untested("content_blocks.create", `${CHECK_BLOCK} already exists, so create wasn't needed.`);
      await run("content_blocks.update", () => api.updateContentBlock(existing.content_block_id, { content }));
    } else {
      const created = await run("content_blocks.create", () =>
        api.createContentBlock({
          name: CHECK_BLOCK,
          content,
          state: "draft",
          description: "Created by the email builder's connection check. Safe to ignore.",
        }),
      );
      if (created) await run("content_blocks.update", () => api.updateContentBlock(created.content_block_id, { content }));
      else untested("content_blocks.update", "Skipped because create failed.");
    }
  } else {
    untested("content_blocks.create", "Run the check with write tests to verify.");
    untested("content_blocks.update", "Run the check with write tests to verify.");
  }
  untested("templates.email.create", "Verified on first publish (a test would leave an undeletable template).");
  untested("templates.email.update", "Verified on first publish.");
  return checks;
}

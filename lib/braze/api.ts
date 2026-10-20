import type { BrazeTransport } from "./transport";

// Typed client for the Braze template endpoints we publish through.
// https://www.braze.com/docs/api/endpoints/templates/

export type EmailTemplatePayload = {
  template_name: string;
  subject: string;
  body: string;
  plaintext_body?: string;
  preheader?: string;
  should_inline_css?: boolean;
};

export type ContentBlockPayload = {
  name: string;
  description?: string;
  content: string;
  state?: "active" | "draft";
};

export type EmailTemplateSummary = {
  email_template_id: string;
  template_name: string;
  created_at: string;
  updated_at: string;
};

export type EmailTemplateInfo = EmailTemplateSummary & {
  subject: string;
  preheader?: string;
  body: string;
  plaintext_body?: string;
};

export type ContentBlockSummary = {
  content_block_id: string;
  name: string;
  liquid_tag: string;
  last_edited: string;
};

export type ContentBlockInfo = ContentBlockSummary & { content: string; description?: string };

const PAGE = 1000;

export class BrazeApi {
  constructor(readonly transport: BrazeTransport) {}

  get mode() {
    return this.transport.mode;
  }

  get workspace() {
    return this.transport.workspace;
  }

  async listEmailTemplates(): Promise<EmailTemplateSummary[]> {
    const all: EmailTemplateSummary[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const res = await this.transport.request<{ templates: EmailTemplateSummary[] }>("GET", "/templates/email/list", {
        limit: PAGE,
        offset,
      });
      all.push(...res.templates);
      if (res.templates.length < PAGE) return all;
    }
  }

  getEmailTemplate(id: string): Promise<EmailTemplateInfo> {
    return this.transport.request("GET", "/templates/email/info", { email_template_id: id });
  }

  createEmailTemplate(p: EmailTemplatePayload): Promise<{ email_template_id: string }> {
    return this.transport.request("POST", "/templates/email/create", p);
  }

  updateEmailTemplate(id: string, p: Partial<EmailTemplatePayload>): Promise<unknown> {
    return this.transport.request("POST", "/templates/email/update", { email_template_id: id, ...p });
  }

  async listContentBlocks(): Promise<ContentBlockSummary[]> {
    const all: ContentBlockSummary[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const res = await this.transport.request<{ content_blocks: ContentBlockSummary[] }>(
        "GET",
        "/content_blocks/list",
        { limit: PAGE, offset },
      );
      all.push(...res.content_blocks);
      if (res.content_blocks.length < PAGE) return all;
    }
  }

  getContentBlock(id: string): Promise<ContentBlockInfo> {
    return this.transport.request("GET", "/content_blocks/info", { content_block_id: id });
  }

  createContentBlock(p: ContentBlockPayload): Promise<{ content_block_id: string; liquid_tag: string }> {
    return this.transport.request("POST", "/content_blocks/create", p);
  }

  updateContentBlock(id: string, p: Partial<ContentBlockPayload>): Promise<unknown> {
    return this.transport.request("POST", "/content_blocks/update", { content_block_id: id, ...p });
  }
}

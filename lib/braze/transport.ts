// Two interchangeable transports behind the Braze REST API client:
//  - HttpTransport talks to a real workspace.
//  - DryRunTransport is an in-process stand-in that implements the endpoints we use
//    with the limits and validation documented by Braze, and logs every request.
// BrazeApi (api.ts) builds identical requests for both, so a dry run exercises the
// exact payloads a live publish would send.

export type BrazeMethod = "GET" | "POST";

export interface BrazeTransport {
  readonly mode: "dry-run" | "live";
  readonly workspace: string;
  request<T>(method: BrazeMethod, path: string, payload?: Record<string, unknown>): Promise<T>;
}

/** The API key permission each endpoint needs. */
export const ENDPOINT_PERMISSIONS: Record<string, string> = {
  "POST /templates/email/create": "templates.email.create",
  "POST /templates/email/update": "templates.email.update",
  "GET /templates/email/list": "templates.email.list",
  "GET /templates/email/info": "templates.email.info",
  "POST /content_blocks/create": "content_blocks.create",
  "POST /content_blocks/update": "content_blocks.update",
  "GET /content_blocks/list": "content_blocks.list",
  "GET /content_blocks/info": "content_blocks.info",
};

export class BrazeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "BrazeApiError";
  }
}

// ─── Live ─────────────────────────────────────────────────────────────────────

export type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const USER_AGENT = "email-studio-builder";

export class HttpTransport implements BrazeTransport {
  readonly mode = "live" as const;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    readonly workspace: string,
    private readonly restEndpoint: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    retry: RetryOptions = {},
  ) {
    this.maxRetries = retry.maxRetries ?? 4;
    this.baseDelayMs = retry.baseDelayMs ?? 500;
    this.sleep = retry.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  // Retries 429s for every request (Braze didn't process it), and 5xx/network errors
  // only for reads and updates — retrying a create that may have landed could duplicate it.
  async request<T>(method: BrazeMethod, path: string, payload?: Record<string, unknown>): Promise<T> {
    const retryServerErrors = method === "GET" || path.endsWith("/update");
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.send(method, path, payload);
      } catch (err) {
        if (!retryServerErrors || attempt >= this.maxRetries) {
          throw new BrazeApiError(`Network error: ${err instanceof Error ? err.message : String(err)}`, 0, path);
        }
        await this.sleep(this.backoff(attempt));
        continue;
      }
      const retryable = res.status === 429 || (res.status >= 500 && retryServerErrors);
      if (retryable && attempt < this.maxRetries) {
        await this.sleep(retryAfterMs(res) ?? this.backoff(attempt));
        continue;
      }
      const data = (await res.json().catch(() => ({}))) as { message?: string; errors?: unknown };
      if (!res.ok) {
        const detail = data.errors ? ` ${JSON.stringify(data.errors)}` : "";
        throw new BrazeApiError(`${data.message ?? res.statusText}${detail}`, res.status, path);
      }
      return data as T;
    }
  }

  /** Exponential backoff with full jitter. */
  private backoff(attempt: number): number {
    return Math.random() * this.baseDelayMs * 2 ** attempt;
  }

  private send(method: BrazeMethod, path: string, payload?: Record<string, unknown>): Promise<Response> {
    let url = `${this.restEndpoint.replace(/\/$/, "")}${path}`;
    if (method === "GET" && payload) {
      const qs = new URLSearchParams(
        Object.entries(payload).map(([k, v]) => [k, String(v)] as [string, string]),
      ).toString();
      if (qs) url += `?${qs}`;
    }
    return this.fetchImpl(url, {
      method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        "user-agent": USER_AGENT,
      },
      body: method === "POST" ? JSON.stringify(payload ?? {}) : undefined,
    });
  }
}

// Braze sends Retry-After on some 429s and X-RateLimit-Reset (epoch seconds) on all.
function retryAfterMs(res: Response): number | undefined {
  const after = Number(res.headers.get("retry-after"));
  if (after > 0) return after * 1000;
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (reset > 0) return Math.min(Math.max(reset * 1000 - Date.now(), 0), 60_000);
  return undefined;
}

// ─── Dry run ──────────────────────────────────────────────────────────────────

export type DryRunTemplate = {
  email_template_id: string;
  template_name: string;
  subject: string;
  preheader: string;
  body: string;
  plaintext_body: string;
  should_inline_css?: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type DryRunContentBlock = {
  content_block_id: string;
  name: string;
  description: string;
  content: string;
  state: "active" | "draft";
  tags: string[];
  created_at: string;
  last_edited: string;
};

export type DryRunLogEntry = {
  at: string;
  method: BrazeMethod;
  path: string;
  status: number;
  /** Request payload with large string fields summarized. */
  request: Record<string, unknown>;
  error?: string;
};

export type DryRunState = {
  templates: Record<string, DryRunTemplate>;
  contentBlocks: Record<string, DryRunContentBlock>;
  log: DryRunLogEntry[];
};

export function emptyDryRunState(): DryRunState {
  return { templates: {}, contentBlocks: {}, log: [] };
}

const KB = 1024;
const TEMPLATE_BODY_LIMIT = 400 * KB;
const CONTENT_BLOCK_LIMIT = 50 * KB;
const LOG_LIMIT = 500;

export class DryRunTransport implements BrazeTransport {
  readonly mode = "dry-run" as const;

  constructor(
    readonly workspace: string,
    readonly state: DryRunState = emptyDryRunState(),
    private readonly onChange?: (state: DryRunState) => void,
    /** API key permissions to simulate as missing, e.g. ["content_blocks.update"]. */
    private readonly deniedPermissions: string[] = [],
  ) {}

  async request<T>(method: BrazeMethod, path: string, payload: Record<string, unknown> = {}): Promise<T> {
    const entry: DryRunLogEntry = {
      at: new Date().toISOString(),
      method,
      path,
      status: 200,
      request: summarize(payload),
    };
    try {
      const permission = ENDPOINT_PERMISSIONS[`${method} ${path}`];
      if (permission && this.deniedPermissions.includes(permission)) {
        throw new BrazeApiError(`This API key does not have the ${permission} permission`, 401, path);
      }
      return this.route(method, path, payload) as T;
    } catch (err) {
      const e = err instanceof BrazeApiError ? err : new BrazeApiError(String(err), 500, path);
      entry.status = e.status;
      entry.error = e.message;
      throw e;
    } finally {
      this.state.log.push(entry);
      if (this.state.log.length > LOG_LIMIT) this.state.log.splice(0, this.state.log.length - LOG_LIMIT);
      this.onChange?.(this.state);
    }
  }

  private route(method: BrazeMethod, path: string, p: Record<string, unknown>): unknown {
    const now = new Date().toISOString();
    const key = `${method} ${path}`;
    switch (key) {
      case "POST /templates/email/create": {
        requireStrings(p, ["template_name", "subject", "body"], path);
        checkBody(p.body as string, path);
        checkTags(p.tags, path);
        const id = crypto.randomUUID();
        this.state.templates[id] = {
          email_template_id: id,
          template_name: p.template_name as string,
          subject: p.subject as string,
          preheader: (p.preheader as string) ?? "",
          body: p.body as string,
          plaintext_body: (p.plaintext_body as string) ?? "",
          should_inline_css: p.should_inline_css as boolean | undefined,
          tags: [],
          created_at: now,
          updated_at: now,
        };
        return { email_template_id: id, message: "success" };
      }
      case "POST /templates/email/update": {
        const tpl = this.state.templates[p.email_template_id as string];
        if (!tpl) throw new BrazeApiError("Invalid email_template_id", 400, path);
        const fields = ["template_name", "subject", "body", "plaintext_body", "preheader", "tags", "should_inline_css"];
        if (!fields.some((f) => p[f] !== undefined)) {
          throw new BrazeApiError("You must specify at least one field to update", 400, path);
        }
        if (p.body !== undefined) checkBody(p.body as string, path);
        checkTags(p.tags, path);
        for (const f of fields) if (p[f] !== undefined) (tpl as Record<string, unknown>)[f] = p[f];
        tpl.updated_at = now;
        return { message: "success" };
      }
      case "GET /templates/email/list": {
        const all = Object.values(this.state.templates).map(
          ({ email_template_id, template_name, created_at, updated_at, tags }) => ({
            email_template_id,
            template_name,
            created_at,
            updated_at,
            tags,
          }),
        );
        const page = paginate(all, p);
        return { count: page.length, templates: page };
      }
      case "GET /templates/email/info": {
        const tpl = this.state.templates[p.email_template_id as string];
        if (!tpl) throw new BrazeApiError("Invalid email_template_id", 400, path);
        return { ...tpl, message: "success" };
      }
      case "POST /content_blocks/create": {
        requireStrings(p, ["name", "content"], path);
        checkBlockName(p.name as string, path);
        if (Object.values(this.state.contentBlocks).some((b) => b.name === p.name)) {
          throw new BrazeApiError(`Content Block name "${p.name}" already exists`, 400, path);
        }
        checkBlock(p, path);
        const id = crypto.randomUUID();
        this.state.contentBlocks[id] = {
          content_block_id: id,
          name: p.name as string,
          description: (p.description as string) ?? "",
          content: p.content as string,
          state: (p.state as "active" | "draft") ?? "active",
          tags: [],
          created_at: now,
          last_edited: now,
        };
        return { content_block_id: id, liquid_tag: liquidTag(p.name as string), created_at: now, message: "success" };
      }
      case "POST /content_blocks/update": {
        const block = this.state.contentBlocks[p.content_block_id as string];
        if (!block) throw new BrazeApiError("Invalid content_block_id", 400, path);
        if (p.name !== undefined) checkBlockName(p.name as string, path);
        checkBlock(p, path);
        for (const f of ["name", "description", "content", "state"] as const) {
          if (p[f] !== undefined) (block as Record<string, unknown>)[f] = p[f];
        }
        block.last_edited = now;
        return {
          content_block_id: block.content_block_id,
          liquid_tag: liquidTag(block.name),
          created_at: block.created_at,
          message: "success",
        };
      }
      case "GET /content_blocks/list": {
        const all = Object.values(this.state.contentBlocks).map((b) => ({
          content_block_id: b.content_block_id,
          name: b.name,
          content_type: "html",
          liquid_tag: liquidTag(b.name),
          inclusion_count: 0,
          created_at: b.created_at,
          last_edited: b.last_edited,
          tags: b.tags,
        }));
        const page = paginate(all, p);
        return { count: page.length, content_blocks: page };
      }
      case "GET /content_blocks/info": {
        const block = this.state.contentBlocks[p.content_block_id as string];
        if (!block) throw new BrazeApiError("Invalid content_block_id", 400, path);
        return { ...block, content_type: "html", liquid_tag: liquidTag(block.name), message: "success" };
      }
      default:
        throw new BrazeApiError(`Dry run doesn't implement ${key}`, 404, path);
    }
  }
}

export function liquidTag(name: string): string {
  return `{{content_blocks.\${${name}}}}`;
}

function requireStrings(p: Record<string, unknown>, fields: string[], path: string): void {
  for (const f of fields) {
    if (typeof p[f] !== "string" || (p[f] as string).length === 0) {
      throw new BrazeApiError(`${f} is required`, 400, path);
    }
  }
}

function checkBody(body: string, path: string): void {
  if (byteLength(body) > TEMPLATE_BODY_LIMIT) throw new BrazeApiError("body must be 400KB or less", 400, path);
}

function checkBlock(p: Record<string, unknown>, path: string): void {
  if (typeof p.content === "string" && byteLength(p.content) >= CONTENT_BLOCK_LIMIT) {
    throw new BrazeApiError("content must be less than 50KB", 400, path);
  }
  if (typeof p.description === "string" && p.description.length >= 250) {
    throw new BrazeApiError("description must be less than 250 characters", 400, path);
  }
  if (p.state !== undefined && p.state !== "active" && p.state !== "draft") {
    throw new BrazeApiError('state must be "active" or "draft"', 400, path);
  }
  if (typeof p.content === "string" && p.content.includes(liquidTag(String(p.name ?? "")))) {
    throw new BrazeApiError("A Content Block cannot reference itself", 400, path);
  }
  checkTags(p.tags, path);
}

function checkBlockName(name: string, path: string): void {
  if (name.length >= 100 || !/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new BrazeApiError(
      "name must be under 100 characters and contain only letters, numbers, dashes and underscores",
      400,
      path,
    );
  }
}

// Braze only accepts tags that already exist in the workspace; the dry run has none.
function checkTags(tags: unknown, path: string): void {
  if (tags === undefined) return;
  if (!Array.isArray(tags)) throw new BrazeApiError("Tags must be an array", 400, path);
  if (tags.length > 0) throw new BrazeApiError("Some tags could not be found", 400, path);
}

function paginate<T>(items: T[], p: Record<string, unknown>): T[] {
  const limit = Math.min(Number(p.limit ?? 100), 1000);
  const offset = Number(p.offset ?? 0);
  return items.slice(offset, offset + limit);
}

export function summarize(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    out[k] = typeof v === "string" && v.length > 160 ? `${v.slice(0, 120)}… (${byteLength(v)} bytes)` : v;
  }
  return out;
}

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

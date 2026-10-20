import fs from "node:fs";
import path from "node:path";
import { brands } from "../brands";
import { BrazeApi } from "./api";
import {
  DryRunTransport,
  HttpTransport,
  emptyDryRunState,
  summarize,
  type BrazeMethod,
  type BrazeTransport,
  type DryRunState,
} from "./transport";

// Server-only. The simulated Braze is the default. Real publishing needs BRAZE_MODE=live
// plus, per workspace, BRAZE_API_KEY_<WORKSPACE> and BRAZE_REST_ENDPOINT[_<WORKSPACE>]
// (e.g. https://rest.iad-01.braze.com).
//
// BRAZE_DRY_RUN_DENY=content_blocks.update,… makes the simulated Braze refuse those
// permissions, to try the connection check and failure handling.

export type Connection = "dry-run" | "braze";

const DRY_RUN_DIR = path.join(process.cwd(), ".braze-dry-run");
const ACTIVITY_DIR = path.join(process.cwd(), ".braze-activity");

export function realBrazeEnabled(): boolean {
  return process.env.BRAZE_MODE === "live";
}

function envSuffix(workspace: string): string {
  return workspace.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function realCredentials(workspace: string): { key?: string; endpoint?: string } {
  const suffix = envSuffix(workspace);
  return {
    key: process.env[`BRAZE_API_KEY_${suffix}`],
    endpoint: process.env[`BRAZE_REST_ENDPOINT_${suffix}`] ?? process.env.BRAZE_REST_ENDPOINT,
  };
}

export function apiFor(workspace: string, connection: Connection): BrazeApi {
  if (connection === "braze") {
    if (!realBrazeEnabled()) throw new Error("Real Braze is off. Set BRAZE_MODE=live on the server to enable it.");
    const { key, endpoint } = realCredentials(workspace);
    if (!key || !endpoint) {
      const suffix = envSuffix(workspace);
      throw new Error(`Workspace "${workspace}" needs BRAZE_API_KEY_${suffix} and BRAZE_REST_ENDPOINT.`);
    }
    return new BrazeApi(new ActivityLogTransport(new HttpTransport(workspace, endpoint, key)));
  }
  const deny = (process.env.BRAZE_DRY_RUN_DENY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return new BrazeApi(
    new DryRunTransport(workspace, readDryRunState(workspace), (s) => writeDryRunState(workspace, s), deny),
  );
}

/** Which workspaces the brand registry uses, and which have real credentials. */
export function brazeStatus() {
  const workspaces = Array.from(new Set(brands.map((b) => b.workspace)));
  return {
    realEnabled: realBrazeEnabled(),
    workspaces: workspaces.map((workspace) => {
      const { key, endpoint } = realCredentials(workspace);
      return { workspace, configured: Boolean(key && endpoint) };
    }),
  };
}

// ─── Activity log for real publishes (one JSON line per request) ──────────────

class ActivityLogTransport implements BrazeTransport {
  readonly mode;
  readonly workspace;

  constructor(private readonly inner: BrazeTransport) {
    this.mode = inner.mode;
    this.workspace = inner.workspace;
  }

  async request<T>(method: BrazeMethod, endpoint: string, payload?: Record<string, unknown>): Promise<T> {
    const started = Date.now();
    const entry: Record<string, unknown> = {
      at: new Date().toISOString(),
      workspace: this.workspace,
      method,
      path: endpoint,
      request: summarize(payload ?? {}),
    };
    try {
      const res = await this.inner.request<T>(method, endpoint, payload);
      entry.status = 200;
      return res;
    } catch (err) {
      entry.status = (err as { status?: number }).status ?? 0;
      entry.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      entry.ms = Date.now() - started;
      fs.mkdirSync(ACTIVITY_DIR, { recursive: true });
      fs.appendFileSync(path.join(ACTIVITY_DIR, `${fileSafe(this.workspace)}.jsonl`), `${JSON.stringify(entry)}\n`);
    }
  }
}

export function readActivity(workspace: string, limit = 200): Record<string, unknown>[] {
  try {
    const lines = fs.readFileSync(path.join(ACTIVITY_DIR, `${fileSafe(workspace)}.jsonl`), "utf8").trim().split("\n");
    return lines.slice(-limit).map((l) => JSON.parse(l) as Record<string, unknown>);
  } catch {
    return [];
  }
}

// ─── Simulated Braze state ────────────────────────────────────────────────────

function fileSafe(workspace: string): string {
  return workspace.replace(/[^\w-]/g, "_");
}

export function readDryRunState(workspace: string): DryRunState {
  try {
    return JSON.parse(fs.readFileSync(path.join(DRY_RUN_DIR, `${fileSafe(workspace)}.json`), "utf8")) as DryRunState;
  } catch {
    return emptyDryRunState();
  }
}

function writeDryRunState(workspace: string, state: DryRunState): void {
  fs.mkdirSync(DRY_RUN_DIR, { recursive: true });
  fs.writeFileSync(path.join(DRY_RUN_DIR, `${fileSafe(workspace)}.json`), JSON.stringify(state, null, 2));
}

export function listDryRunWorkspaces(): string[] {
  try {
    return fs
      .readdirSync(DRY_RUN_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export function resetDryRun(): void {
  fs.rmSync(DRY_RUN_DIR, { recursive: true, force: true });
}

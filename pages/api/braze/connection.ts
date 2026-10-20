import type { NextApiRequest, NextApiResponse } from "next";
import { apiFor, brazeStatus, type Connection } from "@/lib/braze/config";
import { checkConnection, type PermissionCheck } from "@/lib/braze/connection";

// GET: which workspaces exist and which have real credentials.
// POST { connection, workspaces?, write? }: check each workspace's API key permissions.

export type ConnectionCheckResponse = {
  results: { workspace: string; error?: string; checks: PermissionCheck[] }[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return res.status(200).json(brazeStatus());
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { connection = "dry-run", workspaces, write } = (req.body ?? {}) as {
    connection?: Connection;
    workspaces?: string[];
    write?: boolean;
  };
  const targets = workspaces?.length ? workspaces : brazeStatus().workspaces.map((w) => w.workspace);
  const results: ConnectionCheckResponse["results"] = [];
  for (const workspace of targets) {
    try {
      results.push({ workspace, checks: await checkConnection(apiFor(workspace, connection), { write }) });
    } catch (err) {
      results.push({ workspace, error: err instanceof Error ? err.message : String(err), checks: [] });
    }
  }
  return res.status(200).json({ results } satisfies ConnectionCheckResponse);
}

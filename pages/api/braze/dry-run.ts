import type { NextApiRequest, NextApiResponse } from "next";
import { listDryRunWorkspaces, readDryRunState, resetDryRun } from "@/lib/braze/config";

// Inspect (GET) or wipe (DELETE) the simulated Braze workspaces.

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "DELETE") {
    resetDryRun();
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const workspaces = listDryRunWorkspaces().map((workspace) => {
    const s = readDryRunState(workspace);
    return {
      workspace,
      templates: Object.values(s.templates).map(({ body: _b, plaintext_body: _p, ...t }) => t),
      contentBlocks: Object.values(s.contentBlocks).map(({ content: _c, ...b }) => b),
      log: s.log,
    };
  });
  return res.status(200).json({ workspaces });
}

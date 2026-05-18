import type { NextApiRequest, NextApiResponse } from "next";
import { renderEmailHtml } from "@/lib/render";
import type { EmailDoc } from "@/lib/types";

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } },
};

type Body = { doc?: EmailDoc; dark?: boolean };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const body = (req.body ?? {}) as Body;
  if (!body.doc) {
    return res.status(400).json({ error: "Missing 'doc'" });
  }
  try {
    const html = await renderEmailHtml(body.doc, { dark: body.dark });
    return res.status(200).json({ html });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    return res.status(500).json({ error: message });
  }
}

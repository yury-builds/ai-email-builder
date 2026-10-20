import type { NextApiRequest, NextApiResponse } from "next";
import { getBrand } from "@/lib/brands";
import { compileForBrand } from "@/lib/braze/compile-react-email";
import { apiFor, type Connection } from "@/lib/braze/config";
import type { Stage } from "@/lib/braze/naming";
import type { BrandEmailPackage } from "@/lib/braze/package";
import { publishPackages, type BrandPublishResult } from "@/lib/braze/publish";
import type { EmailDoc } from "@/lib/types";

// Lives under pages/ for the same reason as /api/render: @react-email/render needs
// react-dom/server, which the app router's server bundle rejects.

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

type Body = {
  doc?: EmailDoc;
  docKey?: string;
  brandIds?: string[];
  connection?: Connection;
  stage?: Stage;
  liveStyles?: boolean;
};

export type PublishResponse = {
  connection: Connection;
  stage: Stage;
  results: (BrandPublishResult & { package?: BrandEmailPackage })[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { doc, docKey, brandIds, connection = "dry-run", stage = "staging", liveStyles } = (req.body ?? {}) as Body;
  if (!doc || !docKey?.trim() || !Array.isArray(brandIds) || brandIds.length === 0) {
    return res.status(400).json({ error: "Expected doc, docKey and a non-empty brandIds array" });
  }
  const unknown = brandIds.filter((id) => !getBrand(id));
  if (unknown.length) return res.status(400).json({ error: `Unknown brands: ${unknown.join(", ")}` });

  try {
    const packages = await Promise.all(
      brandIds.map((id) => compileForBrand(doc, getBrand(id)!, docKey.trim(), { stage, liveStyles })),
    );
    const results = await publishPackages(packages, (ws) => apiFor(ws, connection));
    const byBrand = new Map(packages.map((p) => [p.brandId, p]));
    const body: PublishResponse = {
      connection,
      stage,
      results: results.map((r) => ({ ...r, package: byBrand.get(r.brandId) })),
    };
    return res.status(200).json(body);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Publish failed" });
  }
}

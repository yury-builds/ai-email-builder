import type { NextApiRequest, NextApiResponse } from "next";
import { getBrand } from "@/lib/brands";
import { apiFor, type Connection } from "@/lib/braze/config";
import type { BrandEmailPackage } from "@/lib/braze/package";
import { stagedPackage } from "@/lib/braze/promote";
import { publishPackages } from "@/lib/braze/publish";
import type { PublishResponse } from "./publish";

// Copies what's staged in Braze onto the production names, brand by brand.

type Body = { docKey?: string; brandIds?: string[]; connection?: Connection };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { docKey, brandIds, connection = "dry-run" } = (req.body ?? {}) as Body;
  if (!docKey?.trim() || !Array.isArray(brandIds) || brandIds.length === 0) {
    return res.status(400).json({ error: "Expected docKey and a non-empty brandIds array" });
  }

  try {
    const packages: BrandEmailPackage[] = [];
    const missing: PublishResponse["results"] = [];
    for (const id of brandIds) {
      const brand = getBrand(id);
      if (!brand) return res.status(400).json({ error: `Unknown brand: ${id}` });
      try {
        packages.push(await stagedPackage(apiFor(brand.workspace, connection), brand, docKey.trim()));
      } catch (err) {
        missing.push({
          brandId: brand.id,
          brandName: brand.name,
          workspace: brand.workspace,
          mode: connection === "braze" ? "live" : "dry-run",
          ok: false,
          issues: [],
          actions: [
            {
              kind: "email_template",
              name: docKey.trim(),
              action: "skipped",
              error: err instanceof Error ? err.message : String(err),
            },
          ],
        });
      }
    }
    const results = await publishPackages(packages, (ws) => apiFor(ws, connection));
    const byBrand = new Map(packages.map((p) => [p.brandId, p]));
    const body: PublishResponse = {
      connection,
      stage: "production",
      results: [...results.map((r) => ({ ...r, package: byBrand.get(r.brandId) })), ...missing],
    };
    return res.status(200).json(body);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Promote failed" });
  }
}

import { brandSeeds } from "./brand-seeds";
import { getTheme, type Theme } from "./themes";
import type { EmailFooterProps, EmailHeaderProps } from "./blocks";

// A brand = visual tokens (theme) + the parts that are shared by every email of that
// brand. Header and footer are published once per brand as Braze Content Blocks, so a
// change (new logo, new legal address) reaches live campaigns without re-publishing them.

export type Brand = {
  id: string;
  name: string;
  theme: Theme;
  workspace: string;
  chrome: {
    header: EmailHeaderProps;
    footer: EmailFooterProps;
  };
};

export const brands: Brand[] = brandSeeds.map((seed) => ({
  id: seed.id,
  name: seed.name,
  theme: getTheme(seed.id),
  workspace: seed.workspace,
  chrome: {
    // Empty logoUrl/logoAlt fall back to the theme's logo.
    header: { logoUrl: "", logoAlt: "", logoWidth: 140, alignment: seed.family === "mono" ? "left" : "center" },
    footer: {
      companyName: seed.legalName,
      address: seed.address,
      unsubscribeUrl: "{{${unsubscribe_url}}}",
      socialLinks: [{ label: "Instagram", href: `https://instagram.com/${seed.id}` }],
    },
  },
}));

export function getBrand(id: string): Brand | undefined {
  return brands.find((b) => b.id === id);
}


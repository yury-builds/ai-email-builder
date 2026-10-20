// Brand fixtures for exercising the multi-brand pipeline (21 brands across 3 Braze
// workspaces). Pure data — themes.ts derives visual tokens from these, brands.ts adds
// the Braze-facing parts. Replace with the real brand list / design-token export.

export type BrandFamily = "fresh" | "trust" | "mono";

export type BrandSeed = {
  id: string;
  name: string;
  /** Base theme whose typography, radii and spacing the brand inherits. */
  family: BrandFamily;
  /** Primary brand color; omitted for the three hand-tuned base themes. */
  color?: string;
  legalName: string;
  address: string;
  /** Braze workspace the brand's templates and Content Blocks live in. */
  workspace: string;
};

export const brandSeeds: BrandSeed[] = [
  { id: "fresh", name: "Verdant Fresh", family: "fresh", legalName: "The Avocado Studio", address: "1421 Valencia St, San Francisco, CA 94110", workspace: "na" },
  { id: "trust", name: "Clinical Trust", family: "trust", legalName: "Clinical Trust Inc.", address: "200 Clarendon St, Boston, MA 02116", workspace: "na" },
  { id: "mono", name: "Editorial Mono", family: "mono", legalName: "Editorial Mono Ltd", address: "14 Bedford Sq, London WC1B 3JA", workspace: "emea" },
  { id: "northwind", name: "Northwind Outdoors", family: "fresh", color: "#15803d", legalName: "Northwind Outdoors LLC", address: "88 Pine St, Seattle, WA 98101", workspace: "na" },
  { id: "harbor", name: "Harbor Bank", family: "trust", color: "#0e7490", legalName: "Harbor Bank N.A.", address: "1 Harbor Way, Baltimore, MD 21202", workspace: "na" },
  { id: "lumen", name: "Lumen Skincare", family: "fresh", color: "#db2777", legalName: "Lumen Beauty Inc.", address: "500 Broadway, New York, NY 10012", workspace: "na" },
  { id: "atlas", name: "Atlas Travel", family: "trust", color: "#2563eb", legalName: "Atlas Travel Group", address: "350 Mission St, San Francisco, CA 94105", workspace: "na" },
  { id: "ember", name: "Ember Coffee", family: "fresh", color: "#b45309", legalName: "Ember Roasters Co.", address: "77 Alberta St, Portland, OR 97211", workspace: "na" },
  { id: "quill", name: "Quill Journal", family: "mono", color: "#3f3f46", legalName: "Quill Media Inc.", address: "41 Union Sq W, New York, NY 10003", workspace: "na" },
  { id: "volt", name: "Volt Mobility", family: "trust", color: "#7c3aed", legalName: "Volt Mobility GmbH", address: "Torstraße 140, 10119 Berlin", workspace: "emea" },
  { id: "fjord", name: "Fjord Home", family: "mono", color: "#1e40af", legalName: "Fjord Home AS", address: "Karl Johans gate 22, 0159 Oslo", workspace: "emea" },
  { id: "olive", name: "Olive & Co", family: "fresh", color: "#4d7c0f", legalName: "Olive & Co S.r.l.", address: "Via Tornabuoni 1, 50123 Firenze", workspace: "emea" },
  { id: "meridian", name: "Meridian Insurance", family: "trust", color: "#0f766e", legalName: "Meridian Assurance SA", address: "8 Rue de la Paix, 75002 Paris", workspace: "emea" },
  { id: "kiln", name: "Kiln Ceramics", family: "mono", color: "#9a3412", legalName: "Kiln Studio BV", address: "Prinsengracht 263, 1016 GV Amsterdam", workspace: "emea" },
  { id: "pulse", name: "Pulse Fitness", family: "fresh", color: "#dc2626", legalName: "Pulse Fitness SL", address: "Carrer de Mallorca 401, 08013 Barcelona", workspace: "emea" },
  { id: "sakura", name: "Sakura Tea", family: "fresh", color: "#be185d", legalName: "Sakura Tea KK", address: "1-1 Marunouchi, Chiyoda, Tokyo 100-0005", workspace: "apac" },
  { id: "koala", name: "Koala Kids", family: "fresh", color: "#ca8a04", legalName: "Koala Kids Pty Ltd", address: "10 George St, Sydney NSW 2000", workspace: "apac" },
  { id: "jade", name: "Jade Finance", family: "trust", color: "#047857", legalName: "Jade Finance Pte Ltd", address: "1 Raffles Pl, Singapore 048616", workspace: "apac" },
  { id: "monsoon", name: "Monsoon Living", family: "mono", color: "#155e75", legalName: "Monsoon Living Pvt Ltd", address: "Bandra Kurla Complex, Mumbai 400051", workspace: "apac" },
  { id: "tide", name: "Tide Surf", family: "trust", color: "#0369a1", legalName: "Tide Surf Ltd", address: "12 Quay St, Auckland 1010", workspace: "apac" },
  { id: "saffron", name: "Saffron Kitchen", family: "fresh", color: "#c2410c", legalName: "Saffron Kitchen Sdn Bhd", address: "Jalan Ampang 50, Kuala Lumpur 50450", workspace: "apac" },
];

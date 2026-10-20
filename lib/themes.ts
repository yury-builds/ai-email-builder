import { brandSeeds } from "./brand-seeds";

export type Theme = {
  id: string;
  name: string;
  logo: string;
  logoAlt: string;
  brand: string;
  brandFg: string;
  heading: string;
  body: string;
  muted: string;
  border: string;
  surface: string;
  canvas: string;
  footerBg: string;
  footerInk: string;
  linkColor: string;
  fontHeading: string;
  fontBody: string;
  buttonRadius: number;
  buttonCase: "none" | "upper";
  buttonWeight: number;
  imageRadius: number;
  sectionPadding: number;
};

export const themes: Record<string, Theme> = {
  fresh: {
    id: "fresh",
    name: "Verdant Fresh",
    logo: "/logos/avocado-hub.png",
    logoAlt: "The Avocado Studio",
    brand: "#ea580c",
    brandFg: "#ffffff",
    heading: "#1c1917",
    body: "#292524",
    muted: "#78716c",
    border: "#e7e5e4",
    surface: "#ffffff",
    canvas: "#faf5ef",
    footerBg: "#fafaf9",
    footerInk: "#78716c",
    linkColor: "#ea580c",
    fontHeading: '"Source Serif 4", Georgia, serif',
    fontBody: '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif',
    buttonRadius: 8,
    buttonCase: "none",
    buttonWeight: 600,
    imageRadius: 8,
    sectionPadding: 24,
  },
  trust: {
    id: "trust",
    name: "Clinical Trust",
    logo: "https://placehold.co/120x40/1e3a8a/ffffff?text=Trust",
    logoAlt: "Clinical Trust",
    brand: "#1e3a8a",
    brandFg: "#ffffff",
    heading: "#0f172a",
    body: "#1e293b",
    muted: "#64748b",
    border: "#e2e8f0",
    surface: "#ffffff",
    canvas: "#f1f5f9",
    footerBg: "#0f172a",
    footerInk: "#cbd5e1",
    linkColor: "#1e3a8a",
    fontHeading: '"Inter", -apple-system, "Segoe UI", sans-serif',
    fontBody: '"Inter", -apple-system, "Segoe UI", sans-serif',
    buttonRadius: 4,
    buttonCase: "none",
    buttonWeight: 500,
    imageRadius: 4,
    sectionPadding: 32,
  },
  mono: {
    id: "mono",
    name: "Editorial Mono",
    logo: "https://placehold.co/120x40/18181b/ffffff?text=MONO",
    logoAlt: "Editorial Mono",
    brand: "#18181b",
    brandFg: "#fafaf9",
    heading: "#09090b",
    body: "#27272a",
    muted: "#71717a",
    border: "#d4d4d8",
    surface: "#fafaf9",
    canvas: "#e7e5e4",
    footerBg: "#fafaf9",
    footerInk: "#71717a",
    linkColor: "#18181b",
    fontHeading: 'Georgia, "Times New Roman", serif',
    fontBody: 'Georgia, "Times New Roman", serif',
    buttonRadius: 0,
    buttonCase: "upper",
    buttonWeight: 600,
    imageRadius: 0,
    sectionPadding: 32,
  },
};

// Derive a theme for every fixture brand from its base family + primary color.
for (const seed of brandSeeds) {
  if (themes[seed.id] || !seed.color) continue;
  const base = themes[seed.family];
  const hex = seed.color.replace("#", "");
  themes[seed.id] = {
    ...base,
    id: seed.id,
    name: seed.name,
    logo: `https://placehold.co/160x40/${hex}/ffffff/png?text=${encodeURIComponent(seed.name)}`,
    logoAlt: seed.name,
    brand: seed.color,
    linkColor: seed.color,
    footerBg: base.footerBg === base.heading ? seed.color : base.footerBg,
  };
}

export const defaultThemeId = "fresh";

export function getTheme(id: string | undefined): Theme {
  return (id && themes[id]) || themes[defaultThemeId];
}

export const themeOptions = Object.values(themes).map((t) => ({ label: t.name, value: t.id }));

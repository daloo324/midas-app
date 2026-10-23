// The Design Studio's fixed lists, from docs/prototypes/design-studio.html.
// Safe to use in client components.

export const COLOR_ROLES = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "tertiary", label: "Tertiary" },
  { key: "accent", label: "Accent" },
] as const;
export type ColorRole = (typeof COLOR_ROLES)[number]["key"];
export type Palette = Record<ColorRole, string>;

export const BLACK = "#000000";
export const WHITE = "#FFFFFF";
/** Shown when a role has no colour yet (the prototype's defaults). */
export const DEFAULT_PALETTE: Palette = {
  primary: "#0E2A36",
  secondary: "#18404F",
  tertiary: "#4F8C8F",
  accent: "#C49A47",
};

export const PALETTE_PRESETS: { name: string; colors: Palette }[] = [
  {
    name: "Midas navy & gold",
    colors: {
      primary: "#0E2A36",
      secondary: "#18404F",
      tertiary: "#4F8C8F",
      accent: "#C49A47",
    },
  },
  {
    name: "Earth & sand",
    colors: {
      primary: "#6E4A2B",
      secondary: "#B98B5E",
      tertiary: "#E6D2B5",
      accent: "#2F6B3C",
    },
  },
  {
    name: "Fresh greens",
    colors: {
      primary: "#2F6B3C",
      secondary: "#5FA05B",
      tertiary: "#BFDCA8",
      accent: "#F2CF45",
    },
  },
  {
    name: "Calm blues",
    colors: {
      primary: "#1F5E8C",
      secondary: "#4E9AC7",
      tertiary: "#BFE0F2",
      accent: "#F2A65A",
    },
  },
  {
    name: "Warm reds",
    colors: {
      primary: "#B83A2E",
      secondary: "#E0663A",
      tertiary: "#F6D9C7",
      accent: "#F2CF45",
    },
  },
  {
    name: "Plum & blush",
    colors: {
      primary: "#4B2B5E",
      secondary: "#7E4E9C",
      tertiary: "#E58AAE",
      accent: "#C49A47",
    },
  },
  {
    name: "Mono & sun",
    colors: {
      primary: "#1A1A1A",
      secondary: "#7A7A7A",
      tertiary: "#D9D9D9",
      accent: "#F2CF45",
    },
  },
  {
    name: "Teal & coral",
    colors: {
      primary: "#1D5560",
      secondary: "#4F8C8F",
      tertiary: "#CFE3E2",
      accent: "#E5735C",
    },
  },
];

export const MARK_VARIANTS = [
  { key: "full", label: "Full colour" },
  { key: "black", label: "Black" },
  { key: "white", label: "White" },
] as const;
export const MARK_FORMATS = ["svg", "png", "pdf"] as const;
export const FONT_WEIGHTS = [
  { weight: 400, label: "Regular" },
  { weight: 500, label: "Medium" },
  { weight: 600, label: "SemiBold" },
  { weight: 700, label: "Bold" },
] as const;
export const FONT_ROLES = [
  { key: "heading", label: "Heading font" },
  { key: "body", label: "Body font" },
] as const;
export const FONT_EXTS = ["ttf", "otf", "woff", "woff2"] as const;
export const EXTRA_EXTS = ["svg", "png", "jpg", "jpeg", "pdf"] as const;

export const GUIDE_CHECKS = [
  {
    key: "sheet",
    label: "Brand sheet: logo, icon, colours and fonts on one page",
  },
  { key: "clear_space", label: "Clear space around the logo and icon" },
  { key: "min_size", label: "Minimum sizes for print and screen" },
  { key: "do_dont", label: "Do and don't examples" },
  { key: "pairings", label: "Colour pairings and contrast" },
  { key: "extras", label: "Patterns, graphic elements and other designs" },
] as const;

export const KIT_TOTAL = 25;

/** The file extensions a kit slot accepts (mirrors kit_slot_accepts in the database). */
export function slotExtensions(slot: string): readonly string[] {
  const m = /^(logo|icon)_(full|black|white)_(svg|png|pdf)$/.exec(slot);
  if (m) return [m[3]];
  if (/^font_(heading|body)_(400|500|600|700)$/.test(slot)) return FONT_EXTS;
  if (slot === "guide_pdf") return ["pdf"];
  if (slot === "extra") return EXTRA_EXTS;
  return [];
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

export function slotAccepts(slot: string, fileName: string): boolean {
  return slotExtensions(slot).includes(extensionOf(fileName));
}

export const LETTERING_STYLES = [
  "Classic serif",
  "Clean modern",
  "Friendly rounded",
  "Bold & condensed",
  "Handwritten",
] as const;

export const FONT_PAIRINGS: {
  heading: string;
  body: string;
  style: (typeof LETTERING_STYLES)[number];
  use: string;
}[] = [
  {
    heading: "Playfair Display",
    body: "Source Sans 3",
    style: "Classic serif",
    use: "Established, premium, professional services",
  },
  {
    heading: "Cormorant Garamond",
    body: "Montserrat",
    style: "Classic serif",
    use: "Luxury, beauty, hospitality",
  },
  {
    heading: "DM Serif Display",
    body: "DM Sans",
    style: "Classic serif",
    use: "Editorial, modern retail",
  },
  {
    heading: "Libre Baskerville",
    body: "Oswald",
    style: "Classic serif",
    use: "Heritage, law, finance",
  },
  {
    heading: "Manrope",
    body: "Work Sans",
    style: "Clean modern",
    use: "Consulting, B2B, real estate",
  },
  {
    heading: "Space Grotesk",
    body: "IBM Plex Sans",
    style: "Clean modern",
    use: "Tech, fintech, startups",
  },
  {
    heading: "Raleway",
    body: "Open Sans",
    style: "Clean modern",
    use: "Corporate, NGOs, safe choice",
  },
  {
    heading: "Fraunces",
    body: "Figtree",
    style: "Friendly rounded",
    use: "Cafés, crafts, warm brands",
  },
  {
    heading: "Nunito",
    body: "Nunito Sans",
    style: "Friendly rounded",
    use: "Schools, health, community",
  },
  {
    heading: "Poppins",
    body: "Lora",
    style: "Friendly rounded",
    use: "Lifestyle, food, wellness",
  },
  {
    heading: "Anton",
    body: "Roboto",
    style: "Bold & condensed",
    use: "Sport, events, promotions",
  },
  {
    heading: "Bebas Neue",
    body: "Montserrat",
    style: "Bold & condensed",
    use: "Fitness, retail sales, nightlife",
  },
  {
    heading: "Archivo Black",
    body: "Work Sans",
    style: "Bold & condensed",
    use: "Streetwear, logistics, construction",
  },
  {
    heading: "Caveat",
    body: "Quicksand",
    style: "Handwritten",
    use: "Bakeries, gifts, personal brands",
  },
];

const SERIF = new Set([
  "Playfair Display",
  "Cormorant Garamond",
  "DM Serif Display",
  "Libre Baskerville",
  "Fraunces",
  "Lora",
]);
/** A CSS font stack for a family name, with a sensible fallback. */
export function fontStack(
  family: string | null | undefined,
  fallback = "Arial, sans-serif",
): string {
  if (!family) return fallback;
  const safe = family.replace(/['";\\]/g, "");
  return `'${safe}', ${SERIF.has(safe) ? "Georgia, serif" : safe === "Caveat" ? "cursive" : fallback}`;
}

export const INSPIRATION_TAGS = [
  "Post",
  "Story",
  "Reel",
  "Ad",
  "Typography",
  "Colour",
  "Layout",
  "Photography",
  "Illustration",
] as const;

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** CMYK percentages from RGB. Approximate: printers convert with their own profiles. */
export function hexToCmyk(hex: string): [number, number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [c, m, y, k].map((v) => Math.round(v * 100)) as [
    number,
    number,
    number,
    number,
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 4.5 or more: body text; 3 to 4.5: large text only; under 3: avoid (04-creative.md). */
export function contrastVerdict(ratio: number): {
  label: string;
  pill: string;
} {
  if (ratio >= 4.5) return { label: "Body text OK", pill: "s-good" };
  if (ratio >= 3) return { label: "Large text only", pill: "s-warn" };
  return { label: "Avoid", pill: "s-bad" };
}

/** Black or white, whichever reads better on the colour. */
export function textOn(bg: string): string {
  return contrastRatio(WHITE, bg) >= contrastRatio(BLACK, bg) ? WHITE : BLACK;
}

export function paletteOf(
  colors: Partial<Record<string, string>> | null | undefined,
): Palette {
  return {
    primary: colors?.primary ?? DEFAULT_PALETTE.primary,
    secondary: colors?.secondary ?? DEFAULT_PALETTE.secondary,
    tertiary: colors?.tertiary ?? DEFAULT_PALETTE.tertiary,
    accent: colors?.accent ?? DEFAULT_PALETTE.accent,
  };
}

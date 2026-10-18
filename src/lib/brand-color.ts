/**
 * The academy colour: one of the tuned presets in globals.css, or a custom
 * hex. A custom colour must keep white button text readable (WCAG AA, 4.5:1).
 */
export const COLOR_PRESETS = [
  { value: "fazam", label: "Fazam" },
  { value: "zinc", label: "Graphite" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "rose", label: "Red" },
] as const;

const HEX = /^#[0-9a-f]{6}$/;
export const isCustomColor = (v: string | null | undefined) => !!v && HEX.test(v);

/** Contrast of white text on this colour, 1 to 21. */
export function contrastWithWhite(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

export const readableOnWhite = (hex: string) => contrastWithWhite(hex) >= 4.5;

/** What <html> gets: the preset name, or "custom" plus the colour as a CSS variable. */
export function themeAttributes(color: string | null | undefined) {
  if (color && isCustomColor(color)) return { "data-theme-color": "custom", style: { "--brand-custom": color } as React.CSSProperties };
  return { "data-theme-color": color && COLOR_PRESETS.some((p) => p.value === color) ? color : "fazam" };
}

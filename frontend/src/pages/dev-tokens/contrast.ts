/**
 * Live contrast-ratio measurement (m12b-contract.md §10/§12). Deliberately
 * reads computed colors from real rendered DOM nodes carrying our Tailwind
 * token classes rather than duplicating hex literals here — this file lives
 * under pages/dev-tokens, which is NOT exempt from the "no raw hex in
 * src/" grep check (only styles/tokens.css and components/ui/ are), and
 * measuring the actual rendered pixels is also strictly more honest: it
 * verifies what the browser really painted, not a hand-copied duplicate
 * that could silently drift from tokens.css.
 */

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function parseRgb(rgb: string): [number, number, number] {
  const parts = rgb.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return [0, 0, 0];
  const [r, g, b] = parts.map(Number);
  return [r, g, b];
}

export function contrastRatio(fgRgb: string, bgRgb: string): number {
  const [r1, g1, b1] = parseRgb(fgRgb);
  const [r2, g2, b2] = parseRgb(bgRgb);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

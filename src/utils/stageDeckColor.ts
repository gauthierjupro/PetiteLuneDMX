/** Couleur par défaut du plateau scène (plan 2D + mesh 3D). */
export const DEFAULT_STAGE_DECK_COLOR = '#3f4f63';

export function normalizeStageDeckColor(input: string | undefined): string {
  if (!input || typeof input !== 'string') return DEFAULT_STAGE_DECK_COLOR;
  const hex = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex.toLowerCase()}`;
  return DEFAULT_STAGE_DECK_COLOR;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeStageDeckColor(hex).replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function stageDeckPlanFillRgba(hex: string, alpha = 0.32): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function stageDeckPlanBorderRgba(hex: string, alpha = 0.5): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Teinte assombrie pour l’émission 3D (lisible sans HDR). */
export function stageDeckEmissiveHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const dim = (n: number) =>
    Math.min(255, Math.max(0, Math.round(n * 0.28)))
      .toString(16)
      .padStart(2, '0');
  return `#${dim(r)}${dim(g)}${dim(b)}`;
}

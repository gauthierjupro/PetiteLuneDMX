// Utilitaires de conversion de couleurs pour l'application DMX

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Conversion HSV vers RGB (plus intuitif pour le sélecteur carré)
 */
export const hsvToRgb = (h: number, s: number, v: number): RGB => {
  s /= 100; v /= 100;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
    default: r = 0, g = 0, b = 0;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

/**
 * Conversion RGB vers HSV
 */
export const rgbToHsv = (r: number, g: number, b: number): HSV => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h, s = max === 0 ? 0 : d / max, v = max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

/**
 * Conversion HSL vers RGB pour l'effet Rainbow
 */
export const hslToRgb = (h: number, s: number, l: number): RGB => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
};

/**
 * Conversion RGB vers HSL
 */
export const rgbToHsl = (r: number, g: number, b: number): HSL => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

/**
 * Palette de 8 Couleurs Essentielles (Kit de survie optimisé RGB + CMY)
 */
export const standardColors = [
  { hex: '#FFCC99', r: 255, g: 204, b: 153, name: 'Bastard Amber (R02)', cat: 'Face/Visage' },
  { hex: '#FF9900', r: 255, g: 153, b: 0,   name: 'Deep Golden Amber (L135)', cat: 'Soleil/Feu' },
  { hex: '#FF0000', r: 255, g: 0, b: 0,     name: 'Primary Red (L106)', cat: 'Passion/Energie' },
  { hex: '#00FF00', r: 0, g: 255, b: 0,     name: 'Primary Green (L139)', cat: 'Nature/Etrange' },
  { hex: '#00FFFF', r: 0, g: 255, b: 255,   name: 'Peacock Blue (L115)', cat: 'Cyan/Aquatique' },
  { hex: '#B0C4DE', r: 176, g: 196, b: 222, name: 'Steel Blue (L117)', cat: 'Froid/Industriel' },
  { hex: '#FF00FF', r: 255, g: 0, b: 255,   name: 'Dark Magenta (L046)', cat: 'Fête/Concert' },
  { hex: '#3600BD', r: 54, g: 0, b: 189,   name: 'Congo Blue (L181)', cat: 'UV/Nuit Noire' }
];

import type { GroupMovement, MovementShape, Point2D } from '../types';

function regularPolygonPreviewPoint(
  u: number,
  sides: number,
  sizePan: number,
  sizeTilt: number,
  scale = 1
): { x: number; y: number } {
  const n = Math.max(3, sides);
  let t = ((u % 1) + 1) % 1;
  const verts: { x: number; y: number }[] = [];
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
    verts.push({
      x: Math.cos(a) * sizePan * scale,
      y: Math.sin(a) * sizeTilt * scale,
    });
  }
  const seg = t * n;
  const i = Math.floor(seg) % n;
  const frac = seg - Math.floor(seg);
  const p1 = verts[i];
  const p2 = verts[(i + 1) % n];
  return {
    x: p1.x + (p2.x - p1.x) * frac,
    y: p1.y + (p2.y - p1.y) * frac,
  };
}

function rectanglePreviewPoint(u: number, w: number, h: number): { x: number; y: number } {
  const ww = Math.max(Math.abs(w), 1e-6);
  const hh = Math.max(Math.abs(h), 1e-6);
  let t = ((u % 1) + 1) % 1;
  let d = t * 4 * (ww + hh);
  if (d < 2 * ww) return { x: -ww + d, y: hh };
  d -= 2 * ww;
  if (d < 2 * hh) return { x: ww, y: hh - d };
  d -= 2 * hh;
  if (d < 2 * ww) return { x: ww - d, y: -hh };
  d -= 2 * ww;
  return { x: -ww, y: -hh + d };
}

function clamp255(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)));
}

/** Décalage pan/tilt par rapport au centre (aligné moteur Rust). */
export function computeShapeOffset(
  shape: MovementShape,
  phase: number,
  sizePanRaw: number,
  sizeTiltRaw: number,
  customPoints?: Point2D[]
): { ox: number; oy: number } {
  const sizePan = sizePanRaw / 2;
  const sizeTilt = sizeTiltRaw / 2;
  let ox = 0;
  let oy = 0;

  switch (shape) {
    case 'circle':
      ox = Math.cos(phase) * sizePan;
      oy = Math.sin(phase) * sizeTilt;
      break;
    case 'square': {
      const s = (sizePan + sizeTilt) / 2;
      const u = (phase / (Math.PI * 2)) % 1;
      const pt = rectanglePreviewPoint(u, s, s);
      ox = pt.x;
      oy = pt.y;
      break;
    }
    case 'rectangle': {
      const u = (phase / (Math.PI * 2)) % 1;
      const pt = rectanglePreviewPoint(u, sizePan, sizeTilt);
      ox = pt.x;
      oy = pt.y;
      break;
    }
    case 'triangle': {
      const u = (phase / (Math.PI * 2)) % 1;
      const pt = regularPolygonPreviewPoint(u, 3, sizePan, sizeTilt);
      ox = pt.x;
      oy = pt.y;
      break;
    }
    case 'diamond': {
      const u = (phase / (Math.PI * 2)) % 1;
      const pt = regularPolygonPreviewPoint(u, 4, sizePan, sizeTilt, 0.70710678);
      ox = pt.x;
      oy = pt.y;
      break;
    }
    case 'pentagon': {
      const u = (phase / (Math.PI * 2)) % 1;
      const pt = regularPolygonPreviewPoint(u, 5, sizePan, sizeTilt);
      ox = pt.x;
      oy = pt.y;
      break;
    }
    case 'eight':
      ox = Math.cos(phase) * sizePan;
      oy = Math.sin(phase * 2) * (sizeTilt / 2);
      break;
    case 'pan_sweep':
      ox = Math.cos(phase) * sizePan;
      break;
    case 'tilt_sweep':
      oy = Math.sin(phase) * sizeTilt;
      break;
    case 'custom': {
      const pts = customPoints ?? [];
      if (pts.length > 1) {
        const total = pts.length;
        const t = phase % total;
        const i = Math.floor(t);
        const nextI = (i + 1) % total;
        const frac = t - i;
        const p1 = pts[i];
        const p2 = pts[nextI];
        ox = (p1.x + (p2.x - p1.x) * frac - 127) * (sizePanRaw / 128);
        oy = (p1.y + (p2.y - p1.y) * frac - 127) * (sizeTiltRaw / 128);
      }
      break;
    }
    case 'none':
    default:
      break;
  }

  return { ox, oy };
}

export interface MotionPreviewDot {
  index: number;
  pan: number;
  tilt: number;
}

/** Positions live sur le pad pour chaque lyre (centre propre + phase / fan). */
export function computeGroupMotionPreviewDots(
  config: GroupMovement,
  centers: { pan: number; tilt: number }[],
  fixtureCount: number,
  elapsedSec: number
): MotionPreviewDot[] {
  if (config.shape === 'none' || fixtureCount <= 0) return [];

  const speed = config.speed / 50;
  const basePhase = elapsedSec * speed;
  const fan = config.fan ?? 0;
  const sizePan = config.sizePan ?? 64;
  const sizeTilt = config.sizeTilt ?? 64;
  const dots: MotionPreviewDot[] = [];

  for (let index = 0; index < fixtureCount; index++) {
    const centerPan = centers[index]?.pan ?? 127;
    const centerTilt = centers[index]?.tilt ?? 127;
    const phase = basePhase + index * (fan / 255) * Math.PI * 2;
    let { ox, oy } = computeShapeOffset(
      config.shape,
      phase,
      sizePan,
      sizeTilt,
      config.customPoints
    );
    if (config.invert180 && index % 2 !== 0) {
      ox = -ox;
      oy = -oy;
    }
    dots.push({
      index,
      pan: clamp255(centerPan + ox),
      tilt: clamp255(centerTilt + oy),
    });
  }

  return dots;
}

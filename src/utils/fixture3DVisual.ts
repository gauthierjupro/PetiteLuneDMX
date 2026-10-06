import type { Fixture } from '../types';

/** Style de rendu 3D (proche des visualiseurs type Capture / WYSIWYG). */
export type Fixture3DBeamStyle = 'moving_spot' | 'par_wash' | 'flood' | 'bar';

const META = (f: Fixture) =>
  `${f.name} ${f.model} ${f.manufacturer}`.toLowerCase();

export function inferFixture3DBeamStyle(fixture: Fixture): Fixture3DBeamStyle {
  if (fixture.type === 'Moving Head') return 'moving_spot';
  if (fixture.type === 'Laser') return 'moving_spot';

  const n = META(fixture);

  if (fixture.type === 'Effect' || /gigabar|barre|bar\b|strip|batten|linear|xtrem/.test(n)) {
    return 'bar';
  }

  if (/flood|panel|blinder|matrix|flat par/.test(n)) {
    return 'flood';
  }

  if (
    fixture.type === 'RGB' ||
    /par\b|party|tcl|can\b|wash|slim|tri/.test(n)
  ) {
    return 'par_wash';
  }

  if (fixture.type === 'Other') return 'par_wash';
  return 'par_wash';
}

/** Demi-angle du faisceau (rad) — wash plus ouvert, spot étroit. */
export function fixture3DBeamAngleRad(style: Fixture3DBeamStyle): number {
  switch (style) {
    case 'flood':
      return 0.52;
    case 'par_wash':
      return 0.42;
    case 'bar':
      return 0.38;
    default:
      return 0.32;
  }
}

/** Rayon du pool au sol (m), plafonné pour ne pas saturer toute la salle. */
export function fixture3DPoolRadiusM(
  style: Fixture3DBeamStyle,
  dropToFloorM: number,
  roomWidthM: number,
  roomDepthM: number
): number {
  const drop = Math.max(0.35, dropToFloorM);
  const halfAngle = fixture3DBeamAngleRad(style);
  const raw = Math.tan(halfAngle) * drop * 1.05;
  const roomCap = Math.min(roomWidthM, roomDepthM) * (style === 'moving_spot' ? 0.38 : 0.48);
  const styleCap =
    style === 'flood'
      ? 5.5
      : style === 'par_wash'
        ? 4
        : style === 'bar'
          ? 4.5
          : 3.2;
  return Math.min(raw, roomCap, styleCap);
}

export function fixture3DPoolOpacity(style: Fixture3DBeamStyle): number {
  switch (style) {
    case 'flood':
      return 0.14;
    case 'par_wash':
      return 0.16;
    case 'bar':
      return 0.15;
    default:
      return 0.28;
  }
}

export function clampBeamSpreadPercent(value?: number): number {
  const n = value ?? 100;
  return Math.min(200, Math.max(25, Math.round(n)));
}

export function clampBeamVisualPercent(value?: number): number {
  const n = value ?? 100;
  return Math.min(100, Math.max(10, Math.round(n)));
}

export function fixture3DWashConeOpacity(style: Fixture3DBeamStyle): number {
  switch (style) {
    case 'flood':
      return 0.1;
    case 'par_wash':
      return 0.12;
    case 'bar':
      return 0.11;
    default:
      return 0.35;
  }
}

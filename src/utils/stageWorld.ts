import type { StageFixturePosition, StageSceneElement } from '../types';
import { clampPercent } from './stageSnap';
import type { StageDecorSettings } from './stageDecorSettings';
import {
  isPointOnStageDeck,
  stageDeckBounds,
  stageFloorHeightForPlanPoint,
  stageRoomBounds,
} from './stageDecorSettings';
import {
  isMusicianKind,
  isSpeakerKind,
  isWedgeMonitorKind,
} from './stageSceneElements';

/** Éléments posés au sol (pieds / base), pas en hauteur truss. */
export function isStageFloorBoundElement(kind: StageSceneElement['kind']): boolean {
  return (
    isMusicianKind(kind) ||
    isSpeakerKind(kind) ||
    isWedgeMonitorKind(kind) ||
    kind === 'dj_booth'
  );
}

/** Hauteur max de levage fixture (m) au-dessus du sol local. */
export function stageMaxFixtureLiftM(decor: StageDecorSettings): number {
  const h = decor.roomHeight ?? 14;
  return Math.min(Math.max(h * 0.42, 3), 12);
}

/** Sol local (estrade ou public) à la position monde (X, Z). */
export function stageFloorHeightAt(x: number, z: number, decor: StageDecorSettings): number {
  if (isPointOnStageDeck(x, z, decor)) {
    return stageDeckBounds(decor).elevation;
  }
  return 0;
}

/** Plan % (2D) → monde Three.js, aligné sur les murs 3D. */
export function stagePositionToWorld3D(
  p: StageFixturePosition,
  decor: StageDecorSettings
): [number, number, number] {
  const b = stageRoomBounds(decor);
  const xPct = p.x ?? 50;
  const yPct = p.y ?? 50;
  const zPct = p.z ?? 100;

  const x = -b.L + (xPct / 100) * b.width;
  const z = -b.back + (yPct / 100) * b.depth;

  const floorY = stageFloorHeightAt(x, z, decor);
  const lift = stageMaxFixtureLiftM(decor);
  const y = floorY + (zPct / 100) * lift;

  return [x, y, z];
}

/**
 * Éléments décor scène → monde 3D.
 * Musiciens / enceintes / DJ : pieds sur le plateau (Z plan ignoré pour la hauteur truss).
 */
export function stageSceneElementToWorld3D(
  el: Pick<StageSceneElement, 'x' | 'y' | 'z' | 'kind'>,
  decor: StageDecorSettings
): [number, number, number] {
  const b = stageRoomBounds(decor);
  const xPct = el.x ?? 50;
  const yPct = el.y ?? 50;

  const x = -b.L + (xPct / 100) * b.width;
  const z = -b.back + (yPct / 100) * b.depth;

  if (isStageFloorBoundElement(el.kind)) {
    const floorY = stageFloorHeightForPlanPoint(xPct, yPct, decor);
    const podiumLiftM = Math.min(0.5, Math.max(0, (el.z / 100) * 0.5));
    return [x, floorY + podiumLiftM, z];
  }

  return stagePositionToWorld3D(
    { id: 0, x: xPct, y: yPct, z: el.z ?? 0 },
    decor
  );
}

/** Inverse de stageSceneElementToWorld3D (monde → plan %). */
export function world3DToStageSceneElementPosition(
  x: number,
  y: number,
  z: number,
  kind: StageSceneElement['kind'],
  decor: StageDecorSettings
): Pick<StageSceneElement, 'x' | 'y' | 'z'> {
  const b = stageRoomBounds(decor);
  const xPct = b.width > 0 ? ((x + b.L) / b.width) * 100 : 50;
  const yPct = b.depth > 0 ? ((z + b.back) / b.depth) * 100 : 50;

  if (isStageFloorBoundElement(kind)) {
    const floorY = stageFloorHeightForPlanPoint(xPct, yPct, decor);
    const podiumLiftM = Math.min(0.5, Math.max(0, y - floorY));
    const zPct = podiumLiftM > 0 ? (podiumLiftM / 0.5) * 100 : 0;
    return {
      x: clampPercent(xPct),
      y: clampPercent(yPct),
      z: clampPercent(zPct),
    };
  }

  const plan = world3DToStagePosition(x, y, z, decor);
  return {
    x: plan.x ?? 50,
    y: plan.y ?? 50,
    z: plan.z ?? 0,
  };
}

/** Inverse de stagePositionToWorld3D (monde → plan %). */
export function world3DToStagePosition(
  x: number,
  y: number,
  z: number,
  decor: StageDecorSettings
): Pick<StageFixturePosition, 'x' | 'y' | 'z'> {
  const b = stageRoomBounds(decor);
  const lift = stageMaxFixtureLiftM(decor);
  const floorY = stageFloorHeightAt(x, z, decor);

  const xPct = b.width > 0 ? ((x + b.L) / b.width) * 100 : 50;
  const yPct = b.depth > 0 ? ((z + b.back) / b.depth) * 100 : 50;
  const zPct = lift > 0 ? ((y - floorY) / lift) * 100 : 0;

  return {
    x: clampPercent(xPct),
    y: clampPercent(yPct),
    z: clampPercent(zPct),
  };
}

export function stageRotationToEuler(rotationX = 0, rotationY = 0): [number, number, number] {
  return [
    (rotationX * Math.PI) / 180,
    (-rotationY * Math.PI) / 180,
    0,
  ];
}

export function eulerToStageRotation(rx: number, ry: number): {
  rotationX: number;
  rotationY: number;
} {
  let rotationY = Math.round((-ry * 180) / Math.PI);
  rotationY = ((rotationY % 360) + 360) % 360;
  const rotationX = Math.round(Math.max(-90, Math.min(90, (rx * 180) / Math.PI)));
  return { rotationX, rotationY };
}

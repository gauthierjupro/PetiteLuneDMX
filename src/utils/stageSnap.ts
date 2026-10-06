import type { StageFixturePosition, StageSceneElement } from '../types';
import { sameFixtureId } from './stagePositions';

export const DEFAULT_SNAP_STEP = 5;

/** Masquer les libellés des pastilles sous ce zoom plan (1 = 100 %). */
export const PLAN_LABEL_MIN_ZOOM = 0.78;

export type StageSnapPreset = 'percent5' | 'meter1' | 'meter2';

export function resolveStageSnapSteps(
  preset: StageSnapPreset,
  roomWidthM: number,
  roomDepthM: number
): { stepX: number; stepY: number; label: string } {
  if (preset === 'percent5') {
    return { stepX: DEFAULT_SNAP_STEP, stepY: DEFAULT_SNAP_STEP, label: '5 %' };
  }
  const meters = preset === 'meter1' ? 1 : 2;
  const stepX =
    roomWidthM > 0 ? clampPercent((meters / roomWidthM) * 100) : DEFAULT_SNAP_STEP;
  const stepY =
    roomDepthM > 0 ? clampPercent((meters / roomDepthM) * 100) : DEFAULT_SNAP_STEP;
  return { stepX, stepY, label: `${meters} m` };
}

export function clampPercent(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Accroche les projecteurs déplacés (typiquement au relâchement du drag). */
export function snapStageFixturePositions(
  positions: StageFixturePosition[],
  selectedIds: number[],
  snapEnabled: boolean,
  snapStep: number,
  snapStepY: number = snapStep
): StageFixturePosition[] {
  if (!snapEnabled || selectedIds.length === 0) return positions;
  return positions.map((p) => {
    if (!selectedIds.some((id) => sameFixtureId(id, p.id))) return p;
    return {
      ...p,
      x: snapPercent(p.x ?? 50, snapStep, true),
      y: snapPercent(p.y ?? 50, snapStepY, true),
    };
  });
}

/** Accroche les éléments scène déplacés (relâchement drag). */
export function snapSceneElementsPositions(
  elements: StageSceneElement[],
  selectedIds: string[],
  snapEnabled: boolean,
  snapStep: number,
  snapStepY: number = snapStep
): StageSceneElement[] {
  if (!snapEnabled || selectedIds.length === 0) return elements;
  const idSet = new Set(selectedIds);
  return elements.map((el) => {
    if (!idSet.has(el.id)) return el;
    return {
      ...el,
      x: snapPercent(el.x, snapStep, true),
      y: snapPercent(el.y, snapStepY, true),
    };
  });
}

export function snapPercent(value: number, step: number, enabled: boolean): number {
  const clamped = clampPercent(value);
  if (!enabled || step <= 0) return clamped;
  return clampPercent(Math.round(clamped / step) * step);
}

export type StageAlignMode =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'centerX'
  | 'centerY';

/** `room` = marges plan (8/50/92 %) · `selection` = boîte englobante entre objets. */
export type StageAlignScope = 'room' | 'selection';

const ALIGN_ROOM_VALUE: Record<StageAlignMode, number> = {
  left: 8,
  right: 92,
  top: 8,
  bottom: 92,
  centerX: 50,
  centerY: 50,
};

function alignAxisValue(
  mode: StageAlignMode,
  scope: StageAlignScope,
  values: number[]
): number | null {
  if (values.length === 0) return null;
  if (scope === 'room') return ALIGN_ROOM_VALUE[mode];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const center = (min + max) / 2;
  switch (mode) {
    case 'left':
      return min;
    case 'right':
      return max;
    case 'centerX':
      return clampPercent(center);
    case 'top':
      return min;
    case 'bottom':
      return max;
    case 'centerY':
      return clampPercent(center);
    default:
      return null;
  }
}

/** Aligne la sélection sur une marge ou le centre du plan (%). */
export function alignStageSelection(
  positions: StageFixturePosition[],
  selectedIds: number[],
  mode: StageAlignMode,
  scope: StageAlignScope = 'room'
): StageFixturePosition[] {
  if (selectedIds.length === 0) return positions;

  const idSet = new Set(selectedIds.map(Number));
  const selected = positions.filter((p) => idSet.has(Number(p.id)));
  const xs = selected.map((p) => p.x ?? 50);
  const ys = selected.map((p) => p.y ?? 50);

  const targetX =
    mode === 'left' || mode === 'right' || mode === 'centerX'
      ? alignAxisValue(mode, scope, xs)
      : null;
  const targetY =
    mode === 'top' || mode === 'bottom' || mode === 'centerY'
      ? alignAxisValue(mode, scope, ys)
      : null;

  return positions.map((p) => {
    if (!idSet.has(Number(p.id))) return p;
    if (targetX != null) return { ...p, x: targetX };
    if (targetY != null) return { ...p, y: targetY };
    return p;
  });
}

/** Aligne les éléments scène (musiciens, enceintes décor) sur le plan (%). */
export function alignSceneElementSelection(
  elements: StageSceneElement[],
  selectedIds: string[],
  mode: StageAlignMode,
  scope: StageAlignScope = 'room'
): StageSceneElement[] {
  if (selectedIds.length === 0) return elements;
  const idSet = new Set(selectedIds);
  const selected = elements.filter((el) => idSet.has(el.id));
  const xs = selected.map((el) => el.x);
  const ys = selected.map((el) => el.y);

  const targetX =
    mode === 'left' || mode === 'right' || mode === 'centerX'
      ? alignAxisValue(mode, scope, xs)
      : null;
  const targetY =
    mode === 'top' || mode === 'bottom' || mode === 'centerY'
      ? alignAxisValue(mode, scope, ys)
      : null;

  return elements.map((el) => {
    if (!idSet.has(el.id)) return el;
    if (targetX != null) return { ...el, x: targetX };
    if (targetY != null) return { ...el, y: targetY };
    return el;
  });
}

export function nudgeStageSelection(
  positions: StageFixturePosition[],
  selectedIds: number[],
  dx: number,
  dy: number,
  snapEnabled: boolean,
  snapStep: number,
  snapStepY: number = snapStep
): StageFixturePosition[] {
  if (selectedIds.length === 0) return positions;

  return positions.map((p) => {
    if (!selectedIds.some((id) => sameFixtureId(id, p.id))) return p;
    const nx = snapPercent((p.x ?? 50) + dx, snapStep, snapEnabled);
    const ny = snapPercent((p.y ?? 50) + dy, snapStepY, snapEnabled);
    return { ...p, x: nx, y: ny };
  });
}

export function nudgeStageSelectionZ(
  positions: StageFixturePosition[],
  selectedIds: number[],
  dz: number,
  snapEnabled: boolean,
  snapStep: number
): StageFixturePosition[] {
  if (selectedIds.length === 0) return positions;

  return positions.map((p) => {
    if (!selectedIds.some((id) => sameFixtureId(id, p.id))) return p;
    const nz = snapPercent((p.z ?? 50) + dz, snapStep, snapEnabled);
    return { ...p, z: nz };
  });
}

export function setStageSelectionZ(
  positions: StageFixturePosition[],
  selectedIds: number[],
  z: number,
  snapEnabled: boolean,
  snapStep: number
): StageFixturePosition[] {
  if (selectedIds.length === 0) return positions;
  const target = snapPercent(z, snapStep, snapEnabled);

  return positions.map((p) => {
    if (!selectedIds.some((id) => sameFixtureId(id, p.id))) return p;
    return { ...p, z: target };
  });
}

export type StageDistributeAxis = 'x' | 'y';

/** Sur quelle étendue % répartir les objets sélectionnés. */
export type StageDistributeSpan = 'selection' | 'stage' | 'room';

export type StagePlanDistributeBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

/** Valeurs % espacées entre min et max ; si tout est au même point, étale sur une bande par défaut. */
function distributeAxisValues(
  entries: { id: number | string; value: number }[],
  snapEnabled: boolean,
  snapStep: number,
  fixedSpan?: { min: number; max: number },
  snapStepAxis: number = snapStep
): Map<number | string, number> {
  const out = new Map<number | string, number>();
  if (entries.length < 2) return out;

  const sorted = [...entries].sort((a, b) => a.value - b.value);
  let min: number;
  let max: number;
  if (fixedSpan) {
    min = clampPercent(Math.min(fixedSpan.min, fixedSpan.max));
    max = clampPercent(Math.max(fixedSpan.min, fixedSpan.max));
  } else {
    min = sorted[0]!.value;
    max = sorted[sorted.length - 1]!.value;
  }
  let span = max - min;
  if (span < 1 && !fixedSpan) {
    const mid = clampPercent(min);
    const half = Math.min(35, 25);
    min = clampPercent(mid - half);
    max = clampPercent(mid + half);
    span = max - min;
  }
  if (span < 1) return out;

  const steps = sorted.length - 1;
  sorted.forEach((entry, index) => {
    const raw = min + (span * index) / steps;
    out.set(entry.id, snapPercent(raw, snapStepAxis, snapEnabled));
  });
  return out;
}

function distributeSpanForAxis(
  axis: StageDistributeAxis,
  span: StageDistributeSpan,
  bounds?: StagePlanDistributeBounds
): { min: number; max: number } | undefined {
  if (span === 'selection' || !bounds) return undefined;
  if (axis === 'x') return { min: bounds.xMin, max: bounds.xMax };
  return { min: bounds.yMin, max: bounds.yMax };
}

/** Répartit uniformément entre le min et le max de la sélection sur un axe (%). */
export function distributeStageSelection(
  positions: StageFixturePosition[],
  selectedIds: number[],
  axis: StageDistributeAxis,
  snapEnabled: boolean,
  snapStep: number,
  span: StageDistributeSpan = 'selection',
  bounds?: StagePlanDistributeBounds,
  snapStepY: number = snapStep
): StageFixturePosition[] {
  if (selectedIds.length < 2) return positions;

  const selected = positions.filter((p) =>
    selectedIds.some((id) => sameFixtureId(id, p.id))
  );
  if (selected.length < 2) return positions;

  const key = axis === 'x' ? 'x' : 'y';
  const stepAxis = axis === 'x' ? snapStep : snapStepY;
  const valueById = distributeAxisValues(
    selected.map((p) => ({ id: Number(p.id), value: p[key] ?? 50 })),
    snapEnabled,
    snapStep,
    distributeSpanForAxis(axis, span, bounds),
    stepAxis
  );

  return positions.map((p) => {
    const nextVal = valueById.get(Number(p.id));
    if (nextVal === undefined) return p;
    return axis === 'x' ? { ...p, x: nextVal } : { ...p, y: nextVal };
  });
}

/** Espacement uniforme pour les éléments scène (musiciens, enceintes décor). */
export function distributeSceneElementSelection(
  elements: StageSceneElement[],
  selectedIds: string[],
  axis: StageDistributeAxis,
  snapEnabled: boolean,
  snapStep: number,
  span: StageDistributeSpan = 'selection',
  bounds?: StagePlanDistributeBounds,
  snapStepY: number = snapStep
): StageSceneElement[] {
  if (selectedIds.length < 2) return elements;
  const idSet = new Set(selectedIds);
  const selected = elements.filter((el) => idSet.has(el.id));
  if (selected.length < 2) return elements;

  const key = axis === 'x' ? 'x' : 'y';
  const stepAxis = axis === 'x' ? snapStep : snapStepY;
  const valueById = distributeAxisValues(
    selected.map((el) => ({ id: el.id, value: el[key] ?? 50 })),
    snapEnabled,
    snapStep,
    distributeSpanForAxis(axis, span, bounds),
    stepAxis
  );

  return elements.map((el) => {
    const nextVal = valueById.get(el.id);
    if (nextVal === undefined) return el;
    return axis === 'x' ? { ...el, x: nextVal } : { ...el, y: nextVal };
  });
}

export function moveStageSelectionByDelta(
  positions: StageFixturePosition[],
  selectedIds: number[],
  deltaX: number,
  deltaY: number,
  snapEnabled: boolean,
  snapStep: number,
  snapStepY: number = snapStep
): StageFixturePosition[] {
  if (selectedIds.length === 0) return positions;

  return positions.map((p) => {
    if (!selectedIds.some((id) => sameFixtureId(id, p.id))) return p;
    return {
      ...p,
      x: snapPercent((p.x ?? 50) + deltaX, snapStep, snapEnabled),
      y: snapPercent((p.y ?? 50) + deltaY, snapStepY, snapEnabled),
    };
  });
}

export function moveSceneElementsByDelta(
  elements: StageSceneElement[],
  selectedIds: string[],
  deltaX: number,
  deltaY: number,
  snapEnabled: boolean,
  snapStep: number,
  snapStepY: number = snapStep
): StageSceneElement[] {
  if (selectedIds.length === 0) return elements;
  const idSet = new Set(selectedIds);
  return elements.map((el) => {
    if (!idSet.has(el.id)) return el;
    return {
      ...el,
      x: snapPercent(el.x + deltaX, snapStep, snapEnabled),
      y: snapPercent(el.y + deltaY, snapStepY, snapEnabled),
    };
  });
}

export function nudgeSceneElementsZ(
  elements: StageSceneElement[],
  selectedIds: string[],
  dz: number,
  snapEnabled: boolean,
  snapStep: number
): StageSceneElement[] {
  if (selectedIds.length === 0) return elements;
  const idSet = new Set(selectedIds);
  return elements.map((el) => {
    if (!idSet.has(el.id)) return el;
    return { ...el, z: snapPercent(el.z + dz, snapStep, snapEnabled) };
  });
}

export function setSceneElementsZ(
  elements: StageSceneElement[],
  selectedIds: string[],
  z: number,
  snapEnabled: boolean,
  snapStep: number
): StageSceneElement[] {
  if (selectedIds.length === 0) return elements;
  const idSet = new Set(selectedIds);
  const target = snapPercent(z, snapStep, snapEnabled);
  return elements.map((el) => (idSet.has(el.id) ? { ...el, z: target } : el));
}

/** Points % dans le rectangle (normalisé). */
export function isPlanPointInMarquee(
  x: number,
  y: number,
  rect: { xMin: number; xMax: number; yMin: number; yMax: number }
): boolean {
  const xMin = Math.min(rect.xMin, rect.xMax);
  const xMax = Math.max(rect.xMin, rect.xMax);
  const yMin = Math.min(rect.yMin, rect.yMax);
  const yMax = Math.max(rect.yMin, rect.yMax);
  return x >= xMin && x <= xMax && y >= yMin && y <= yMax;
}

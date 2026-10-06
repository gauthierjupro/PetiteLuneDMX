import type { StageSceneElement, StageSceneElementKind } from '../types';
import { setLocalStorageJsonDebounced } from './localStorageDebounced';
import {
  DEFAULT_STAGE_DECOR,
  isPointOnStageDeckPlan,
  stageDeckPlanInsetsPercent,
  stagePublicBoundaryPlanY,
} from './stageDecorSettings';

export const STAGE_SCENE_ELEMENTS_KEY = 'stage_scene_elements';
export const STAGE_SCENE_ELEMENTS_EVENT = 'pldmx:stage_scene_elements';
export const MAX_STAGE_SCENE_ELEMENTS = 32;

export const SCENE_ELEMENT_ADD_OPTIONS: { kind: StageSceneElementKind; label: string }[] = [
  { kind: 'speaker', label: 'Enceinte' },
  { kind: 'wedge_monitor', label: 'Retour (wedge)' },
  { kind: 'vocalist', label: 'Chanteur' },
  { kind: 'guitarist', label: 'Guitariste' },
  { kind: 'bassist', label: 'Bassiste' },
  { kind: 'drummer', label: 'Batterie' },
  { kind: 'keyboardist', label: 'Claviers' },
  { kind: 'dj_booth', label: 'DJ' },
];

/** Y % sur le plan, à l’intérieur du rectangle scène (défaut décor). */
function defaultBandPlanY(fractionFromBack: number): number {
  const decor = DEFAULT_STAGE_DECOR;
  const yMax = stagePublicBoundaryPlanY(decor);
  return Math.min(yMax - 3, Math.max(8, yMax * fractionFromBack));
}

export function defaultStageSceneElements(): StageSceneElement[] {
  return [
    { id: 'sp-l', kind: 'speaker_l', name: 'Enceinte G', x: 28, y: defaultBandPlanY(0.88), z: 0, enabled: true },
    { id: 'sp-r', kind: 'speaker_r', name: 'Enceinte D', x: 72, y: defaultBandPlanY(0.88), z: 0, enabled: true },
    {
      id: 'wed-l',
      kind: 'wedge_monitor',
      name: 'Retour G',
      x: 42,
      y: defaultBandPlanY(0.8),
      z: 0,
      enabled: true,
    },
    {
      id: 'wed-r',
      kind: 'wedge_monitor',
      name: 'Retour D',
      x: 58,
      y: defaultBandPlanY(0.8),
      z: 0,
      enabled: true,
    },
    { id: 'voc', kind: 'vocalist', name: 'Chanteur', x: 50, y: defaultBandPlanY(0.78), z: 0, enabled: true },
    { id: 'gtr', kind: 'guitarist', name: 'Guitariste', x: 32, y: defaultBandPlanY(0.62), z: 0, enabled: true },
    { id: 'bas', kind: 'bassist', name: 'Bassiste', x: 68, y: defaultBandPlanY(0.62), z: 0, enabled: true },
    { id: 'drm', kind: 'drummer', name: 'Batterie', x: 50, y: defaultBandPlanY(0.28), z: 0, enabled: true },
    { id: 'key', kind: 'keyboardist', name: 'Claviers', x: 22, y: defaultBandPlanY(0.42), z: 0, enabled: true },
    { id: 'dj', kind: 'dj_booth', name: 'DJ', x: 50, y: defaultBandPlanY(0.5), z: 0, enabled: false },
  ];
}

/** Remet musiciens / DJ sur le plateau (migration données existantes). */
export function normalizeSceneElementForStage(
  el: StageSceneElement,
  decor = DEFAULT_STAGE_DECOR
): StageSceneElement {
  if (!isMusicianKind(el.kind) && el.kind !== 'dj_booth') {
    return el;
  }
  const insets = stageDeckPlanInsetsPercent(decor);
  const yMax = stagePublicBoundaryPlanY(decor) - 2;
  let { x, y } = el;
  if (!isPointOnStageDeckPlan(x, y, decor)) {
    x = Math.min(100 - insets.right - 2, Math.max(insets.left + 2, x));
    y = Math.min(yMax, Math.max(5, y));
  }
  return { ...el, x, y, z: 0 };
}

export function loadStageSceneElements(): StageSceneElement[] {
  try {
    const raw = localStorage.getItem(STAGE_SCENE_ELEMENTS_KEY);
    if (!raw) return defaultStageSceneElements();
    const parsed = JSON.parse(raw) as StageSceneElement[];
    if (!Array.isArray(parsed)) return defaultStageSceneElements();
    return mergeStageSceneElements(parsed);
  } catch {
    return defaultStageSceneElements();
  }
}

export function mergeStageSceneElements(saved: StageSceneElement[]): StageSceneElement[] {
  const defaults = defaultStageSceneElements();
  const byId = new Map(saved.map((e) => [e.id, e]));
  const defaultIds = new Set(defaults.map((d) => d.id));
  const mergedDefaults = defaults.map((d) =>
    normalizeSceneElementForStage({ ...d, ...byId.get(d.id) })
  );
  const extras = saved
    .filter((e) => e.id && !defaultIds.has(e.id))
    .map((e) => normalizeSceneElementForStage(e));
  return [...mergedDefaults, ...extras];
}

export function persistStageSceneElements(elements: StageSceneElement[]): void {
  setLocalStorageJsonDebounced(STAGE_SCENE_ELEMENTS_KEY, elements, 300);
  window.dispatchEvent(new CustomEvent(STAGE_SCENE_ELEMENTS_EVENT, { detail: elements }));
}

export function isMusicianKind(kind: StageSceneElement['kind']): boolean {
  return (
    kind === 'vocalist' ||
    kind === 'guitarist' ||
    kind === 'bassist' ||
    kind === 'drummer' ||
    kind === 'keyboardist'
  );
}

export function isSpeakerKind(kind: StageSceneElement['kind']): boolean {
  return kind === 'speaker_l' || kind === 'speaker_r' || kind === 'speaker';
}

export function isWedgeMonitorKind(kind: StageSceneElement['kind']): boolean {
  return kind === 'wedge_monitor';
}

/** Enceintes (PA + retours) — visibilité couche « Son ». */
export function isStageSpeakerElementKind(kind: StageSceneElement['kind']): boolean {
  return isSpeakerKind(kind) || isWedgeMonitorKind(kind);
}

/** Style plan 2D (bordure + fond) par type d’élément. */
export function sceneElementPlanClass(kind: StageSceneElementKind): string {
  switch (kind) {
    case 'vocalist':
      return 'border-violet-400/60 bg-violet-500/20';
    case 'guitarist':
      return 'border-amber-500/60 bg-amber-500/20';
    case 'bassist':
      return 'border-blue-500/60 bg-blue-500/20';
    case 'drummer':
      return 'border-red-500/60 bg-red-500/20';
    case 'keyboardist':
      return 'border-cyan-500/60 bg-cyan-500/20';
    case 'dj_booth':
      return 'border-fuchsia-500/60 bg-fuchsia-500/20';
    case 'speaker_l':
    case 'speaker_r':
    case 'speaker':
      return 'border-slate-400/50 bg-slate-600/25';
    case 'wedge_monitor':
      return 'border-emerald-500/55 bg-emerald-500/15';
    default:
      return 'border-white/10 bg-slate-900/85';
  }
}

export function suggestSceneElementName(
  kind: StageSceneElementKind,
  existing: StageSceneElement[]
): string {
  if (isSpeakerKind(kind)) {
    const n = existing.filter((e) => isSpeakerKind(e.kind)).length + 1;
    return `Enceinte ${n}`;
  }
  if (isWedgeMonitorKind(kind)) {
    const n = existing.filter((e) => isWedgeMonitorKind(e.kind)).length + 1;
    return `Retour ${n}`;
  }
  const labels: Partial<Record<StageSceneElementKind, string>> = {
    vocalist: 'Chanteur',
    guitarist: 'Guitariste',
    bassist: 'Bassiste',
    drummer: 'Batterie',
    keyboardist: 'Claviers',
    dj_booth: 'DJ',
  };
  const base = labels[kind] ?? 'Élément';
  const same = existing.filter((e) => e.kind === kind).length + 1;
  return same > 1 ? `${base} ${same}` : base;
}

export function createSceneElement(
  kind: StageSceneElementKind,
  existing: StageSceneElement[]
): StageSceneElement {
  const id = `el-${kind}-${Date.now().toString(36)}`;
  const slot = existing.length;
  return {
    id,
    kind,
    name: suggestSceneElementName(kind, existing),
    x: 25 + (slot % 6) * 10,
    y: 35 + Math.floor(slot / 6) * 12,
    z: 0,
    enabled: true,
  };
}

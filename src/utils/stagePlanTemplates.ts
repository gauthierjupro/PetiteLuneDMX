import type { Fixture, StageFixturePosition, StageSceneElement } from '../types';
import type { StageDecorSettings } from './stageDecorSettings';
import { defaultStageSceneElements } from './stageSceneElements';
import { clampPercent, snapPercent } from './stageSnap';

export type StagePlanTemplateId = 'mobile_stage_t' | 'dj_compact' | 'led_back_bar';

export interface StagePlanTemplateMeta {
  id: StagePlanTemplateId;
  label: string;
  description: string;
}

export const STAGE_PLAN_TEMPLATES: StagePlanTemplateMeta[] = [
  {
    id: 'mobile_stage_t',
    label: 'Scène mobile · pieds en T',
    description:
      'Lyres en T au fond, PAR sur les pieds avant, musiciens + retours — format classique 5–8 musiciens.',
  },
  {
    id: 'dj_compact',
    label: 'Prestation DJ compacte',
    description: 'Table DJ au centre, barre LED / PAR au fond, lyres sur les côtés.',
  },
  {
    id: 'led_back_bar',
    label: 'Barre de LED de fond',
    description: 'Wash / PAR alignés au fond, effets et lyres vers le public.',
  },
];

type FixtureBuckets = {
  moving: Fixture[];
  par: Fixture[];
  laser: Fixture[];
  effect: Fixture[];
  other: Fixture[];
};

function bucketFixtures(fixtures: Fixture[]): FixtureBuckets {
  const buckets: FixtureBuckets = {
    moving: [],
    par: [],
    laser: [],
    effect: [],
    other: [],
  };
  for (const f of fixtures) {
    if (f.type === 'Moving Head') buckets.moving.push(f);
    else if (f.type === 'RGB') buckets.par.push(f);
    else if (f.type === 'Laser') buckets.laser.push(f);
    else if (f.type === 'Effect') buckets.effect.push(f);
    else buckets.other.push(f);
  }
  return buckets;
}

function spreadAlongX(
  items: Fixture[],
  y: number,
  xMin: number,
  xMax: number,
  z: number,
  out: Map<number, { x: number; y: number; z: number }>
): void {
  if (items.length === 0) return;
  const span = Math.max(0, xMax - xMin);
  items.forEach((f, i) => {
    const t = items.length === 1 ? 0.5 : i / (items.length - 1);
    out.set(f.id, {
      x: clampPercent(xMin + span * t),
      y: clampPercent(y),
      z,
    });
  });
}

function snap5(v: number): number {
  return snapPercent(v, 5, true);
}

function mergeAssignments(
  fixtures: Fixture[],
  current: StageFixturePosition[],
  assignments: Map<number, { x: number; y: number; z: number }>
): StageFixturePosition[] {
  return fixtures.map((f) => {
    const prev = current.find((p) => Number(p.id) === Number(f.id));
    const placed = assignments.get(f.id);
    const defaultZ = f.type === 'Moving Head' || f.type === 'Laser' ? 0 : 100;
    return {
      id: f.id,
      x: snap5(placed?.x ?? prev?.x ?? 50),
      y: snap5(placed?.y ?? prev?.y ?? 50),
      z: placed?.z ?? prev?.z ?? defaultZ,
      rotationY: prev?.rotationY,
      rotationX: prev?.rotationX,
      beamShape: prev?.beamShape,
      beamWidth: prev?.beamWidth,
      beamSpread: prev?.beamSpread,
      beamVisual: prev?.beamVisual,
      visible: prev?.visible,
    };
  });
}

function mobileStageTPositions(
  fixtures: Fixture[],
  assignments: Map<number, { x: number; y: number; z: number }>
): void {
  const { moving, par, laser, effect } = bucketFixtures(fixtures);
  spreadAlongX(moving.slice(0, 3), 18, 30, 70, 0, assignments);
  if (moving.length > 3) {
    spreadAlongX(moving.slice(3, 6), 28, 38, 62, 0, assignments);
  }
  if (moving.length > 6) {
    spreadAlongX(moving.slice(6), 38, 25, 75, 0, assignments);
  }
  spreadAlongX(par.slice(0, 2), 72, 22, 38, 100, assignments);
  if (par.length > 2) spreadAlongX(par.slice(2, 4), 72, 62, 78, 100, assignments);
  if (par.length > 4) spreadAlongX(par.slice(4), 58, 20, 80, 100, assignments);
  spreadAlongX(laser, 65, 40, 60, 0, assignments);
  spreadAlongX(effect, 48, 35, 65, 50, assignments);
}

function djCompactPositions(
  fixtures: Fixture[],
  assignments: Map<number, { x: number; y: number; z: number }>
): void {
  const { moving, par, laser, effect } = bucketFixtures(fixtures);
  spreadAlongX(par, 14, 18, 82, 100, assignments);
  spreadAlongX(moving.slice(0, 2), 42, 24, 38, 0, assignments);
  if (moving.length > 2) spreadAlongX(moving.slice(2, 4), 42, 62, 76, 0, assignments);
  if (moving.length > 4) spreadAlongX(moving.slice(4), 52, 30, 70, 0, assignments);
  spreadAlongX(laser, 55, 45, 55, 0, assignments);
  spreadAlongX(effect, 62, 35, 65, 40, assignments);
}

function ledBackBarPositions(
  fixtures: Fixture[],
  assignments: Map<number, { x: number; y: number; z: number }>
): void {
  const { moving, par, laser, effect, other } = bucketFixtures(fixtures);
  const washes = [...par, ...other];
  spreadAlongX(washes, 12, 12, 88, 100, assignments);
  spreadAlongX(moving.slice(0, 2), 55, 28, 42, 0, assignments);
  if (moving.length > 2) spreadAlongX(moving.slice(2, 4), 55, 58, 72, 0, assignments);
  if (moving.length > 4) spreadAlongX(moving.slice(4), 68, 25, 75, 0, assignments);
  spreadAlongX(laser, 48, 35, 65, 0, assignments);
  spreadAlongX(effect, 40, 40, 60, 60, assignments);
}

function sceneForMobileT(): StageSceneElement[] {
  const base = defaultStageSceneElements();
  const patch = (id: string, x: number, y: number, enabled = true) => {
    const el = base.find((e) => e.id === id);
    if (!el) return null;
    return { ...el, x: snap5(x), y: snap5(y), enabled, z: 0 };
  };
  return [
    patch('sp-l', 26, 82)!,
    patch('sp-r', 74, 82)!,
    patch('wed-l', 40, 74)!,
    patch('wed-r', 60, 74)!,
    patch('voc', 50, 68)!,
    patch('gtr', 32, 58)!,
    patch('bas', 68, 58)!,
    patch('drm', 50, 32)!,
    patch('key', 22, 48)!,
    patch('dj', 50, 50, false)!,
  ].filter(Boolean) as StageSceneElement[];
}

function sceneForDjCompact(): StageSceneElement[] {
  const base = defaultStageSceneElements();
  const patch = (id: string, x: number, y: number, enabled: boolean) => {
    const el = base.find((e) => e.id === id);
    if (!el) return null;
    return { ...el, x: snap5(x), y: snap5(y), enabled, z: 0 };
  };
  return [
    patch('sp-l', 22, 78, true)!,
    patch('sp-r', 78, 78, true)!,
    patch('wed-l', 38, 70, false)!,
    patch('wed-r', 62, 70, false)!,
    patch('voc', 50, 60, false)!,
    patch('gtr', 30, 55, false)!,
    patch('bas', 70, 55, false)!,
    patch('drm', 50, 35, false)!,
    patch('key', 20, 45, false)!,
    patch('dj', 50, 58, true)!,
  ].filter(Boolean) as StageSceneElement[];
}

function sceneForLedBar(): StageSceneElement[] {
  const base = defaultStageSceneElements();
  const patch = (id: string, enabled: boolean) => {
    const el = base.find((e) => e.id === id);
    if (!el) return null;
    return { ...el, enabled, x: snap5(el.x), y: snap5(el.y), z: 0 };
  };
  return base.map((el) => {
    if (el.id === 'sp-l' || el.id === 'sp-r') {
      return { ...el, x: snap5(el.id === 'sp-l' ? 24 : 76), y: snap5(85), enabled: true, z: 0 };
    }
    return patch(el.id, false) ?? el;
  });
}

function decorForTemplate(id: StagePlanTemplateId): Partial<StageDecorSettings> {
  switch (id) {
    case 'mobile_stage_t':
      return {
        stageWidthM: 72,
        stageDepthM: 44,
        showBandMusicians: true,
        showDjBooth: false,
        showAudience: true,
      };
    case 'dj_compact':
      return {
        stageWidthM: 56,
        stageDepthM: 36,
        showBandMusicians: false,
        showDjBooth: true,
        showAudience: true,
        stageElevationM: 0.25,
      };
    case 'led_back_bar':
      return {
        stageWidthM: 88,
        stageDepthM: 40,
        showBandMusicians: false,
        showDjBooth: false,
        showTruss: true,
      };
    default:
      return {};
  }
}

export interface StagePlanTemplateApplyResult {
  positions: StageFixturePosition[];
  sceneElements: StageSceneElement[];
  decorPatch: Partial<StageDecorSettings>;
}

export function applyStagePlanTemplate(
  templateId: StagePlanTemplateId,
  fixtures: Fixture[],
  currentPositions: StageFixturePosition[]
): StagePlanTemplateApplyResult {
  const assignments = new Map<number, { x: number; y: number; z: number }>();

  if (templateId === 'mobile_stage_t') mobileStageTPositions(fixtures, assignments);
  else if (templateId === 'dj_compact') djCompactPositions(fixtures, assignments);
  else ledBackBarPositions(fixtures, assignments);

  let sceneElements: StageSceneElement[];
  if (templateId === 'mobile_stage_t') sceneElements = sceneForMobileT();
  else if (templateId === 'dj_compact') sceneElements = sceneForDjCompact();
  else sceneElements = sceneForLedBar();

  return {
    positions: mergeAssignments(fixtures, currentPositions, assignments),
    sceneElements,
    decorPatch: decorForTemplate(templateId),
  };
}

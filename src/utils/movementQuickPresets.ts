import type {
  CustomMovementSlotId,
  GroupMovement,
  MovementShape,
} from '../types';

export const DEFAULT_GROUP_MOVEMENT: GroupMovement = {
  shape: 'none',
  speed: 128,
  sizePan: 64,
  sizeTilt: 64,
  fan: 0,
  invert180: false,
};

export type { CustomMovementSlotId };

export type QuickMovementPresetId =
  | 'circle_wide'
  | 'square'
  | 'rectangle'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'scan_pan'
  | 'scan_tilt'
  | 'infinity'
  | CustomMovementSlotId;

/** Formes rapides (hors Perso 1–4). */
export type StandardShapePresetId = Exclude<
  QuickMovementPresetId,
  CustomMovementSlotId
>;

export const CUSTOM_MOVEMENT_SLOT_IDS: CustomMovementSlotId[] = [
  'custom_1',
  'custom_2',
  'custom_3',
  'custom_4',
];

export function isCustomMovementSlotId(
  id: QuickMovementPresetId
): id is CustomMovementSlotId {
  return (CUSTOM_MOVEMENT_SLOT_IDS as string[]).includes(id);
}

export interface QuickMovementPreset {
  id: QuickMovementPresetId;
  label: string;
  hint: string;
  movement: GroupMovement;
}

export const QUICK_MOVEMENT_PRESETS: QuickMovementPreset[] = [
  {
    id: 'circle_wide',
    label: 'Cercle',
    hint: 'Cercle autour du centre',
    movement: {
      shape: 'circle',
      speed: 120,
      sizePan: 88,
      sizeTilt: 72,
      fan: 40,
      invert180: false,
    },
  },
  {
    id: 'square',
    label: 'Carré',
    hint: 'Parcours carré (pan = tilt)',
    movement: {
      shape: 'square',
      speed: 110,
      sizePan: 80,
      sizeTilt: 80,
      fan: 32,
      invert180: false,
    },
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    hint: 'Parcours rectangulaire (pan plus large)',
    movement: {
      shape: 'rectangle',
      speed: 105,
      sizePan: 110,
      sizeTilt: 55,
      fan: 40,
      invert180: false,
    },
  },
  {
    id: 'triangle',
    label: 'Triangle',
    hint: 'Parcours triangulaire',
    movement: {
      shape: 'triangle',
      speed: 108,
      sizePan: 78,
      sizeTilt: 78,
      fan: 36,
      invert180: false,
    },
  },
  {
    id: 'diamond',
    label: 'Losange',
    hint: 'Parcours en losange (carré pivoté)',
    movement: {
      shape: 'diamond',
      speed: 108,
      sizePan: 82,
      sizeTilt: 82,
      fan: 36,
      invert180: false,
    },
  },
  {
    id: 'pentagon',
    label: 'Pentagone',
    hint: 'Parcours pentagonal',
    movement: {
      shape: 'pentagon',
      speed: 102,
      sizePan: 72,
      sizeTilt: 72,
      fan: 40,
      invert180: false,
    },
  },
  {
    id: 'scan_pan',
    label: 'Scan ↔',
    hint: 'Balayage horizontal (Dynamo, scans)',
    movement: {
      shape: 'pan_sweep',
      speed: 110,
      sizePan: 110,
      sizeTilt: 24,
      fan: 64,
      invert180: true,
    },
  },
  {
    id: 'scan_tilt',
    label: 'Scan ↕',
    hint: 'Balayage vertical',
    movement: {
      shape: 'tilt_sweep',
      speed: 100,
      sizePan: 24,
      sizeTilt: 100,
      fan: 0,
      invert180: false,
    },
  },
  {
    id: 'infinity',
    label: 'Infini',
    hint: 'Figure en 8',
    movement: {
      shape: 'eight',
      speed: 120,
      sizePan: 72,
      sizeTilt: 72,
      fan: 40,
      invert180: false,
    },
  },
];

export const CUSTOM_MOVEMENT_SLOT_PRESETS: {
  id: CustomMovementSlotId;
  label: string;
  hint: string;
}[] = [
  { id: 'custom_1', label: 'Perso 1', hint: 'Emplacement libre — clic droit pour mémoriser le mouvement en cours' },
  { id: 'custom_2', label: 'Perso 2', hint: 'Emplacement libre — clic droit pour mémoriser le mouvement en cours' },
  { id: 'custom_3', label: 'Perso 3', hint: 'Emplacement libre — clic droit pour mémoriser le mouvement en cours' },
  { id: 'custom_4', label: 'Perso 4', hint: 'Emplacement libre — clic droit pour mémoriser le mouvement en cours' },
];

/** Tous les boutons Trajectoires (formes + Perso). */
export const MOVEMENT_BUTTON_PRESETS: QuickMovementPreset[] = [
  ...QUICK_MOVEMENT_PRESETS,
  ...CUSTOM_MOVEMENT_SLOT_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    hint: p.hint,
    movement: {
      ...DEFAULT_GROUP_MOVEMENT,
      shape: 'custom' as const,
      customPoints: [],
    },
  })),
];

export function getStopGroupMovement(): GroupMovement {
  return { ...DEFAULT_GROUP_MOVEMENT, shape: 'none' };
}

export function getQuickMovementPreset(id: QuickMovementPresetId): GroupMovement {
  if (isCustomMovementSlotId(id)) {
    return { ...DEFAULT_GROUP_MOVEMENT, shape: 'custom', customPoints: [] };
  }
  const found = QUICK_MOVEMENT_PRESETS.find((p) => p.id === id);
  return found ? { ...found.movement } : { ...DEFAULT_GROUP_MOVEMENT };
}

export function mergeGroupMovement(
  prev: GroupMovement | undefined,
  patch: Partial<GroupMovement>
): GroupMovement {
  return { ...(prev ?? DEFAULT_GROUP_MOVEMENT), ...patch };
}

export function movementShapeLabel(shape: MovementShape): string {
  switch (shape) {
    case 'circle':
      return 'Cercle';
    case 'square':
      return 'Carré';
    case 'rectangle':
      return 'Rectangle';
    case 'triangle':
      return 'Triangle';
    case 'diamond':
      return 'Losange';
    case 'pentagon':
      return 'Pentagone';
    case 'eight':
      return 'Infini';
    case 'pan_sweep':
      return 'Scan ↔';
    case 'tilt_sweep':
      return 'Scan ↕';
    case 'custom':
      return 'Perso';
    case 'none':
    default:
      return 'Fixe';
  }
}

import type { GroupMovement, MovementShape } from '../types';
import { LIVE_MACRO_HELP } from './liveMacros';

export type LyreStatusBadgeTone = 'amber' | 'cyan' | 'indigo' | 'purple';

export interface LyreStatusBadge {
  id: string;
  label: string;
  tone: LyreStatusBadgeTone;
}

export function movementShapeShortLabel(shape: MovementShape): string {
  switch (shape) {
    case 'circle':
      return 'Cercle';
    case 'square':
      return 'Carré';
    case 'rectangle':
      return 'Rect';
    case 'triangle':
      return 'Tri';
    case 'diamond':
      return 'Los.';
    case 'pentagon':
      return 'Penta';
    case 'eight':
      return 'Infini';
    case 'pan_sweep':
      return 'Pan';
    case 'tilt_sweep':
      return 'Tilt';
    case 'custom':
      return 'Forme perso';
    case 'none':
    default:
      return '';
  }
}

export function lyreStatusBadges(params: {
  pulse: boolean;
  autoColor: boolean;
  autoGobo: boolean;
  movement?: GroupMovement;
  motionLive?: boolean;
}): LyreStatusBadge[] {
  const badges: LyreStatusBadge[] = [];

  if (params.pulse) {
    badges.push({
      id: 'pulse',
      label: LIVE_MACRO_HELP.U3.shortLabel,
      tone: 'amber',
    });
  }
  if (params.autoColor) {
    badges.push({
      id: 'auto-color',
      label: LIVE_MACRO_HELP.U1.shortLabel,
      tone: 'cyan',
    });
  }
  if (params.autoGobo) {
    badges.push({
      id: 'auto-gobo',
      label: LIVE_MACRO_HELP.U6.shortLabel,
      tone: 'indigo',
    });
  }

  const shape = params.movement?.shape ?? 'none';
  const shapeLabel = movementShapeShortLabel(shape);
  if (shape !== 'none' && shapeLabel) {
    badges.push({
      id: 'shape',
      label: shapeLabel,
      tone: 'purple',
    });
  } else if (params.motionLive) {
    badges.push({
      id: 'motion-live',
      label: 'Mouvement',
      tone: 'purple',
    });
  }

  return badges;
}

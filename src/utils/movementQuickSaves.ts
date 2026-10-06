import type {
  CustomTrajectory,
  GroupMovement,
  QuickMovementSavedState,
} from '../types';
import type { MovementCenterSaveFields } from './groupMovementCenters';
import {
  getQuickMovementPreset,
  isCustomMovementSlotId,
  mergeGroupMovement,
  type QuickMovementPresetId,
} from './movementQuickPresets';
import { movementFromCustomTrajectory } from './movementCustomSlots';

export function getQuickMovementSave(
  saves: Record<string, Partial<Record<string, QuickMovementSavedState>>>,
  groupId: string,
  presetId: QuickMovementPresetId
): QuickMovementSavedState | undefined {
  return saves[groupId]?.[presetId];
}

export function removeQuickMovementSave(
  saves: Record<string, Partial<Record<string, QuickMovementSavedState>>>,
  groupId: string,
  presetId: QuickMovementPresetId
): Record<string, Partial<Record<string, QuickMovementSavedState>>> {
  const groupSaves = { ...(saves[groupId] ?? {}) };
  delete groupSaves[presetId];
  return { ...saves, [groupId]: groupSaves };
}

export function hasQuickMovementSave(
  saves: Record<string, Partial<Record<string, QuickMovementSavedState>>>,
  groupId: string,
  presetId: QuickMovementPresetId
): boolean {
  return getQuickMovementSave(saves, groupId, presetId) != null;
}

/** Mémorise réglages + centre pour le bouton cliqué ; la forme reste celle du bouton. */
export function buildQuickMovementSaveForButton(
  presetId: QuickMovementPresetId,
  current: GroupMovement | undefined,
  centerPan: number,
  centerTilt: number,
  trajectory?: CustomTrajectory,
  centerFields?: MovementCenterSaveFields
): QuickMovementSavedState {
  const base = getQuickMovementPreset(presetId);
  const live = mergeGroupMovement(base, current ?? {});

  if (isCustomMovementSlotId(presetId)) {
    if (!trajectory) {
      throw new Error('custom slot save requires trajectory');
    }
    const movement = movementFromCustomTrajectory(trajectory, {
      speed: live.speed,
      sizePan: live.sizePan,
      sizeTilt: live.sizeTilt,
      fan: live.fan,
      invert180: live.invert180,
    });
    return { movement, centerPan, centerTilt, ...centerFields };
  }

  return {
    movement: {
      shape: base.shape,
      speed: live.speed,
      sizePan: live.sizePan,
      sizeTilt: live.sizeTilt,
      fan: live.fan,
      invert180: live.invert180,
    },
    centerPan,
    centerTilt,
    ...centerFields,
  };
}

export function resolveQuickMovementApply(
  presetId: QuickMovementPresetId,
  saved: QuickMovementSavedState | undefined,
  trajectory?: CustomTrajectory
): { movement: GroupMovement; centerPan: number; centerTilt: number } | null {
  if (isCustomMovementSlotId(presetId) && !trajectory) {
    return null;
  }

  const base = getQuickMovementPreset(presetId);

  if (isCustomMovementSlotId(presetId) && trajectory) {
    const params = saved
      ? {
          speed: saved.movement.speed,
          sizePan: saved.movement.sizePan,
          sizeTilt: saved.movement.sizeTilt,
          fan: saved.movement.fan,
          invert180: saved.movement.invert180,
        }
      : {
          speed: base.speed,
          sizePan: base.sizePan,
          sizeTilt: base.sizeTilt,
          fan: base.fan,
          invert180: base.invert180,
        };
    return {
      movement: movementFromCustomTrajectory(trajectory, params),
      centerPan: saved?.centerPan ?? 127,
      centerTilt: saved?.centerTilt ?? 127,
    };
  }

  if (saved) {
    return {
      movement: {
        ...base,
        shape: base.shape,
        speed: saved.movement.speed,
        sizePan: saved.movement.sizePan,
        sizeTilt: saved.movement.sizeTilt,
        fan: saved.movement.fan,
        invert180: saved.movement.invert180,
      },
      centerPan: saved.centerPan,
      centerTilt: saved.centerTilt,
    };
  }

  return {
    movement: { ...base },
    centerPan: 127,
    centerTilt: 127,
  };
}

/** Valeurs usine au clic droit « Réinitialiser » (50 % vitesse/amplitude, écart 0, centre, sans symétrie). */
export const QUICK_MOVEMENT_FACTORY = {
  speed: 128,
  sizePan: 128,
  sizeTilt: 128,
  fan: 0,
  invert180: false,
  centerPan: 127,
  centerTilt: 127,
} as const;

export function buildQuickMovementResetForButton(
  presetId: QuickMovementPresetId,
  trajectory?: CustomTrajectory
): {
  movement: GroupMovement;
  centerPan: number;
  centerTilt: number;
} | null {
  if (isCustomMovementSlotId(presetId) && !trajectory) {
    return null;
  }

  const factoryParams = {
    speed: QUICK_MOVEMENT_FACTORY.speed,
    sizePan: QUICK_MOVEMENT_FACTORY.sizePan,
    sizeTilt: QUICK_MOVEMENT_FACTORY.sizeTilt,
    fan: QUICK_MOVEMENT_FACTORY.fan,
    invert180: QUICK_MOVEMENT_FACTORY.invert180,
  };

  if (isCustomMovementSlotId(presetId) && trajectory) {
    return {
      movement: movementFromCustomTrajectory(trajectory, factoryParams),
      centerPan: QUICK_MOVEMENT_FACTORY.centerPan,
      centerTilt: QUICK_MOVEMENT_FACTORY.centerTilt,
    };
  }

  const base = getQuickMovementPreset(presetId);
  return {
    movement: {
      ...base,
      shape: base.shape,
      ...factoryParams,
    },
    centerPan: QUICK_MOVEMENT_FACTORY.centerPan,
    centerTilt: QUICK_MOVEMENT_FACTORY.centerTilt,
  };
}

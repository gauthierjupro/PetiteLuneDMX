import type { GroupMovement, MovementPreset, MovementShape } from '../types';

export const MOVEMENT_PRESET_SLOT_COUNT = 4;

export function defaultMovementPresets(): MovementPreset[] {
  return Array.from({ length: MOVEMENT_PRESET_SLOT_COUNT }, (_, i) => ({
    shape: 'none',
    speed: 128,
    sizePan: 64,
    sizeTilt: 64,
    fan: 0,
    invert180: false,
    label: `MVT ${i + 1}`,
  }));
}

export function getGroupMovementPresets(
  map: Record<string, MovementPreset[]>,
  groupId: string
): MovementPreset[] {
  const list = map[groupId];
  if (!list || list.length === 0) return defaultMovementPresets();
  const copy = [...list];
  while (copy.length < MOVEMENT_PRESET_SLOT_COUNT) {
    copy.push({ ...defaultMovementPresets()[copy.length] });
  }
  return copy.slice(0, MOVEMENT_PRESET_SLOT_COUNT);
}

export function movementPresetHasData(preset: MovementPreset): boolean {
  return (
    preset.shape !== 'none' ||
    preset.speed !== 128 ||
    preset.sizePan !== 64 ||
    preset.sizeTilt !== 64 ||
    preset.fan !== 0 ||
    preset.invert180
  );
}

export function movementPresetFromConfig(
  config: GroupMovement,
  label: string
): MovementPreset {
  return {
    shape: config.shape,
    speed: config.speed,
    sizePan: config.sizePan ?? 64,
    sizeTilt: config.sizeTilt ?? 64,
    fan: config.fan ?? 0,
    invert180: !!config.invert180,
    label,
    customPoints: config.customPoints ? [...config.customPoints] : undefined,
  };
}

export function groupMovementFromPreset(preset: MovementPreset): GroupMovement {
  return {
    shape: preset.shape as MovementShape,
    speed: preset.speed,
    sizePan: preset.sizePan,
    sizeTilt: preset.sizeTilt,
    fan: preset.fan,
    invert180: preset.invert180,
    customPoints: preset.customPoints ? [...preset.customPoints] : undefined,
  };
}

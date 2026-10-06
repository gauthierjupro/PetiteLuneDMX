import type {
  CustomMovementSlotLink,
  CustomTrajectory,
  GroupCustomMovementSlotLinks,
  GroupMovement,
  Point2D,
  QuickMovementSavedState,
  CustomMovementSlotId,
} from '../types';
import {
  QUICK_MOVEMENT_PRESETS,
  isCustomMovementSlotId,
  type QuickMovementPresetId,
  type StandardShapePresetId,
} from './movementQuickPresets';
import {
  buildQuickMovementResetForButton,
  buildQuickMovementSaveForButton,
  hasQuickMovementSave,
  resolveQuickMovementApply,
} from './movementQuickSaves';
import type { GroupQuickMovementSaves } from '../types';
import type { MovementCenterSaveFields } from './groupMovementCenters';

export type PersoSlotLink =
  | { type: 'trajectory'; trajectoryId: string }
  | { type: 'shape'; presetId: StandardShapePresetId };

export function trajectoryPointsEqual(
  a?: Point2D[],
  b?: Point2D[]
): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((p, i) => p.x === b[i].x && p.y === b[i].y);
}

export function findTrajectoryByPoints(
  trajectories: CustomTrajectory[] | undefined,
  points?: Point2D[]
): CustomTrajectory | undefined {
  if (!trajectories?.length || !points?.length) return undefined;
  return trajectories.find((t) => trajectoryPointsEqual(t.points, points));
}

/** Lien bibliothèque déduit du mouvement affiché (forme ou trajectoire perso). */
export function inferPersoSlotLinkFromMovement(
  config: GroupMovement | undefined,
  trajectories: CustomTrajectory[]
): PersoSlotLink | undefined {
  if (!config || config.shape === 'none') return undefined;
  if (config.shape === 'custom') {
    const matched = findTrajectoryByPoints(trajectories, config.customPoints);
    if (!matched) return undefined;
    return { type: 'trajectory', trajectoryId: matched.id };
  }
  const preset = QUICK_MOVEMENT_PRESETS.find(
    (p) => p.movement.shape === config.shape
  );
  if (!preset) return undefined;
  return { type: 'shape', presetId: preset.id as StandardShapePresetId };
}

export function parsePersoSlotLink(
  raw: CustomMovementSlotLink | undefined
): PersoSlotLink | undefined {
  if (!raw) return undefined;
  if (raw.shapePresetId) {
    return { type: 'shape', presetId: raw.shapePresetId as StandardShapePresetId };
  }
  if (raw.trajectoryId) {
    return { type: 'trajectory', trajectoryId: raw.trajectoryId };
  }
  return undefined;
}

export function getPersoSlotLink(
  links: GroupCustomMovementSlotLinks,
  groupId: string,
  slotId: QuickMovementPresetId
): PersoSlotLink | undefined {
  return getMovementPresetLink(links, groupId, slotId);
}

/** Lien bibliothèque → bouton ; repli si ancienne save sans lien explicite. */
export function getMovementPresetLink(
  links: GroupCustomMovementSlotLinks,
  groupId: string,
  presetId: QuickMovementPresetId,
  quickSaves?: GroupQuickMovementSaves
): PersoSlotLink | undefined {
  const explicit = parsePersoSlotLink(links[groupId]?.[presetId]);
  if (explicit) return explicit;
  if (
    quickSaves &&
    !isCustomMovementSlotId(presetId) &&
    hasQuickMovementSave(quickSaves, groupId, presetId)
  ) {
    return { type: 'shape', presetId: presetId as StandardShapePresetId };
  }
  return undefined;
}

export function isPersoSlotProgrammed(
  link: PersoSlotLink | undefined
): link is PersoSlotLink {
  return link != null;
}

export function getLinkedTrajectory(
  links: GroupCustomMovementSlotLinks,
  trajectoriesByGroup: Record<string, CustomTrajectory[]>,
  groupId: string,
  slotId: CustomMovementSlotId
): CustomTrajectory | undefined {
  const link = getPersoSlotLink(links, groupId, slotId);
  if (!link || link.type !== 'trajectory') return undefined;
  return (trajectoriesByGroup[groupId] ?? []).find((t) => t.id === link.trajectoryId);
}

export function pruneSlotLinksAfterTrajectoryDelete(
  links: GroupCustomMovementSlotLinks,
  groupId: string,
  trajectoryId: string
): GroupCustomMovementSlotLinks {
  const groupLinks = links[groupId];
  if (!groupLinks) return links;
  let changed = false;
  const nextGroup = { ...groupLinks };
  for (const slotId of Object.keys(nextGroup) as CustomMovementSlotId[]) {
    if (nextGroup[slotId]?.trajectoryId === trajectoryId) {
      delete nextGroup[slotId];
      changed = true;
    }
  }
  if (!changed) return links;
  return { ...links, [groupId]: nextGroup };
}

export function isCustomSlotActive(
  config: GroupMovement,
  trajectory: CustomTrajectory | undefined
): boolean {
  if (!trajectory || config.shape !== 'custom') return false;
  return trajectoryPointsEqual(config.customPoints, trajectory.points);
}

function isShapePresetActive(
  config: GroupMovement,
  presetId: StandardShapePresetId
): boolean {
  const preset = QUICK_MOVEMENT_PRESETS.find((p) => p.id === presetId);
  if (!preset) return false;
  return config.shape === preset.movement.shape;
}

export function isPersoSlotActive(
  config: GroupMovement,
  link: PersoSlotLink | undefined,
  trajectories: CustomTrajectory[]
): boolean {
  if (!link) return false;
  if (link.type === 'shape') return isShapePresetActive(config, link.presetId);
  const traj = trajectories.find((t) => t.id === link.trajectoryId);
  return isCustomSlotActive(config, traj);
}

function truncateButtonLabel(label: string): string {
  const t = label.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 9)}…`;
}

export function persoSlotDisplayLabel(
  slotLabel: string,
  link: PersoSlotLink | undefined,
  trajectories: CustomTrajectory[]
): string {
  if (!link) return slotLabel;
  if (link.type === 'shape') {
    const preset = QUICK_MOVEMENT_PRESETS.find((p) => p.id === link.presetId);
    const label = preset?.label ?? slotLabel;
    return truncateButtonLabel(label);
  }
  const traj = trajectories.find((t) => t.id === link.trajectoryId);
  if (!traj?.label) return slotLabel;
  return truncateButtonLabel(traj.label);
}

/** Libellé bouton trajectoire (nom perso ou forme / trajectoire liée). */
export function movementButtonLabel(
  defaultLabel: string,
  rawLink: CustomMovementSlotLink | undefined,
  parsedLink: PersoSlotLink | undefined,
  trajectories: CustomTrajectory[]
): string {
  const custom = rawLink?.displayName?.trim();
  if (custom) return truncateButtonLabel(custom);
  if (!parsedLink) return defaultLabel;
  return persoSlotDisplayLabel(defaultLabel, parsedLink, trajectories);
}

export function movementButtonLabelForRename(
  defaultLabel: string,
  rawLink: CustomMovementSlotLink | undefined,
  parsedLink: PersoSlotLink | undefined,
  trajectories: CustomTrajectory[]
): string {
  const custom = rawLink?.displayName?.trim();
  if (custom) return custom;
  if (!parsedLink) return defaultLabel;
  if (parsedLink.type === 'shape') {
    return (
      QUICK_MOVEMENT_PRESETS.find((p) => p.id === parsedLink.presetId)?.label ??
      defaultLabel
    );
  }
  return (
    trajectories.find((t) => t.id === parsedLink.trajectoryId)?.label?.trim() ??
    defaultLabel
  );
}

export function rawLinkForPreset(
  links: GroupCustomMovementSlotLinks,
  groupId: string,
  presetId: QuickMovementPresetId
): CustomMovementSlotLink | undefined {
  return links[groupId]?.[presetId];
}

export function applyMovementButtonDisplayName(
  links: GroupCustomMovementSlotLinks,
  groupId: string,
  presetId: QuickMovementPresetId,
  displayName: string,
  parsedLink: PersoSlotLink
): GroupCustomMovementSlotLinks {
  const base =
    parsedLink.type === 'shape'
      ? slotLinkForShape(parsedLink.presetId)
      : slotLinkForTrajectory(parsedLink.trajectoryId);
  return {
    ...links,
    [groupId]: {
      ...(links[groupId] ?? {}),
      [presetId]: { ...base, displayName },
    },
  };
}

export function persoSlotAffectationLabel(
  link: PersoSlotLink,
  trajectories: CustomTrajectory[]
): string {
  if (link.type === 'shape') {
    return QUICK_MOVEMENT_PRESETS.find((p) => p.id === link.presetId)?.label ?? link.presetId;
  }
  return trajectories.find((t) => t.id === link.trajectoryId)?.label ?? 'Trajectoire';
}

export function movementFromCustomTrajectory(
  trajectory: CustomTrajectory,
  params: Pick<
    GroupMovement,
    'speed' | 'sizePan' | 'sizeTilt' | 'fan' | 'invert180'
  >
): GroupMovement {
  return {
    shape: 'custom',
    customPoints: trajectory.points.map((p) => ({ ...p })),
    ...params,
  };
}

export function resolvePersoSlotApply(
  slotId: QuickMovementPresetId,
  link: PersoSlotLink,
  saved: QuickMovementSavedState | undefined,
  trajectories: CustomTrajectory[]
): { movement: GroupMovement; centerPan: number; centerTilt: number } | null {
  if (link.type === 'shape') {
    return resolveQuickMovementApply(link.presetId, saved);
  }
  const traj = trajectories.find((t) => t.id === link.trajectoryId);
  if (!traj) return null;
  return resolveQuickMovementApply(slotId, saved, traj);
}

export function buildQuickMovementSaveForPersoSlot(
  slotId: QuickMovementPresetId,
  link: PersoSlotLink,
  current: GroupMovement | undefined,
  centerPan: number,
  centerTilt: number,
  trajectories: CustomTrajectory[],
  centerFields?: MovementCenterSaveFields
): QuickMovementSavedState {
  if (link.type === 'shape') {
    return buildQuickMovementSaveForButton(
      link.presetId,
      current,
      centerPan,
      centerTilt,
      undefined,
      centerFields
    );
  }
  const traj = trajectories.find((t) => t.id === link.trajectoryId);
  if (!traj) throw new Error('trajectory missing for perso save');
  return buildQuickMovementSaveForButton(
    slotId,
    current,
    centerPan,
    centerTilt,
    traj,
    centerFields
  );
}

export function buildQuickMovementResetForPersoSlot(
  slotId: QuickMovementPresetId,
  link: PersoSlotLink,
  trajectories: CustomTrajectory[]
): { movement: GroupMovement; centerPan: number; centerTilt: number } | null {
  if (link.type === 'shape') {
    return buildQuickMovementResetForButton(link.presetId);
  }
  const traj = trajectories.find((t) => t.id === link.trajectoryId);
  return buildQuickMovementResetForButton(slotId, traj);
}

export function slotLinkForTrajectory(trajectoryId: string): CustomMovementSlotLink {
  return { trajectoryId };
}

export function slotLinkForShape(
  presetId: StandardShapePresetId
): CustomMovementSlotLink {
  return { shapePresetId: presetId };
}

export function slotIdFromPresetId(
  id: QuickMovementPresetId
): CustomMovementSlotId | undefined {
  return isCustomMovementSlotId(id) ? id : undefined;
}

export function clearCustomSlotLink(
  links: GroupCustomMovementSlotLinks,
  groupId: string,
  slotId: QuickMovementPresetId
): GroupCustomMovementSlotLinks {
  const groupLinks = { ...(links[groupId] ?? {}) };
  delete groupLinks[slotId];
  return { ...links, [groupId]: groupLinks };
}

/** @deprecated use persoSlotDisplayLabel */
export function customSlotButtonLabel(
  slotLabel: string,
  trajectory: CustomTrajectory | undefined
): string {
  if (!trajectory?.label) return slotLabel;
  const t = trajectory.label.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 9)}…`;
}

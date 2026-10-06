import type { Dispatch, SetStateAction } from 'react';
import type {
  CalibrationSettings,
  Fixture,
  GroupPosition,
  GroupPositionMemoryMode,
} from '../types';
import { fixtureChannelIndex } from './fixtureDmxChannels';
import { loadFixtureProfilesFromStorage } from '../hooks/useFixtureProfiles';

export type FixturePanTiltPoint = { x: number; y: number };

function fixtureKey(fixtureId: number): string {
  return String(fixtureId);
}

export function getMovingHeadIds(
  fixtureIds: number[],
  isMovingHead: (id: number) => boolean
): number[] {
  return fixtureIds.filter(isMovingHead);
}

export function getFixturePanTiltFromPosition(
  position: GroupPosition,
  fixtureId: number
): FixturePanTiltPoint {
  const per = position.perFixture?.[fixtureKey(fixtureId)];
  if (per) return per;
  return { x: position.x, y: position.y };
}

export function setFixturePanTiltOnPosition(
  position: GroupPosition,
  fixtureId: number,
  x: number,
  y: number
): GroupPosition {
  return {
    ...position,
    x,
    y,
    perFixture: {
      ...(position.perFixture ?? {}),
      [fixtureKey(fixtureId)]: { x, y },
    },
  };
}

export function positionPreviewDots(
  position: GroupPosition,
  movingHeadIds: number[]
): FixturePanTiltPoint[] {
  if (movingHeadIds.length === 0) {
    return [{ x: position.x, y: position.y }];
  }
  return movingHeadIds.map((id) => getFixturePanTiltFromPosition(position, id));
}

/** Vrai si les lyres n’ont pas toutes le même pan/tilt mémorisé. */
export function positionHasDistinctPerFixture(
  position: GroupPosition,
  movingHeadIds: number[]
): boolean {
  if (movingHeadIds.length < 2) return false;
  const pts = movingHeadIds.map((id) => getFixturePanTiltFromPosition(position, id));
  const { x, y } = pts[0];
  return pts.some((p) => p.x !== x || p.y !== y);
}

export function positionMemoryPerFixtureVisual(
  position: GroupPosition,
  movingHeadIds: number[]
): boolean {
  return positionHasDistinctPerFixture(position, movingHeadIds);
}

export function positionMemoryDisplayDots(
  position: GroupPosition,
  movingHeadIds: number[]
): FixturePanTiltPoint[] {
  if (movingHeadIds.length <= 1) {
    return [{ x: position.x, y: position.y }];
  }
  if (positionHasDistinctPerFixture(position, movingHeadIds)) {
    return positionPreviewDots(position, movingHeadIds);
  }
  return [{ x: position.x, y: position.y }];
}

export function getGroupPositionMemoryMode(
  groupId: string,
  modes: Record<string, GroupPositionMemoryMode> | undefined
): GroupPositionMemoryMode {
  return modes?.[groupId] ?? 'linked';
}

function clamp255(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

export function readLogicalPanTiltFromChannels(
  fixture: Fixture,
  channels: number[],
  calibration: CalibrationSettings | undefined
): FixturePanTiltPoint {
  const cal = calibration ?? {
    invertPan: false,
    invertTilt: false,
    offsetPan: 0,
    offsetTilt: 0,
  };
  const profiles = loadFixtureProfilesFromStorage();
  const panIdx = fixtureChannelIndex(fixture, 'pan', profiles);
  const tiltIdx = fixtureChannelIndex(fixture, 'tilt', profiles);
  let pan = panIdx != null ? channels[panIdx] ?? 127 : 127;
  let tilt = tiltIdx != null ? channels[tiltIdx] ?? 127 : 127;
  if (cal.invertPan) pan = 255 - pan;
  if (cal.invertTilt) tilt = 255 - tilt;
  pan = clamp255(pan - (cal.offsetPan || 0));
  tilt = clamp255(tilt - (cal.offsetTilt || 0));
  return { x: pan, y: tilt };
}

export function captureGroupPositionFromLive(
  position: GroupPosition,
  movingHeadIds: number[],
  linkedPanTilt: FixturePanTiltPoint,
  readFixturePanTilt: (fixtureId: number) => FixturePanTiltPoint,
  memoryMode: GroupPositionMemoryMode = 'linked'
): GroupPosition {
  if (movingHeadIds.length <= 1 || memoryMode === 'linked') {
    return {
      ...position,
      x: linkedPanTilt.x,
      y: linkedPanTilt.y,
      perFixture: undefined,
      memoryLinked: true,
    };
  }
  let next: GroupPosition = {
    ...position,
    x: linkedPanTilt.x,
    y: linkedPanTilt.y,
    perFixture: {},
    memoryLinked: false,
  };
  for (const id of movingHeadIds) {
    const pt = readFixturePanTilt(id);
    next = setFixturePanTiltOnPosition(next, id, pt.x, pt.y);
  }
  return next;
}

/** Positions mémorisées en centre lié (y compris anciennes données sans flag). */
export function isLinkedMemoryPosition(
  position: GroupPosition,
  movingHeadIds: number[]
): boolean {
  if (position.memoryLinked === false) return false;
  if (position.memoryLinked === true) return true;
  return !positionHasDistinctPerFixture(position, movingHeadIds);
}

export type SendMovementFn = (
  fixtureIds: number[],
  pan: number,
  tilt: number,
  groupId: string,
  options?: { onlyFixtureId?: number }
) => void;

/** Rappelle une position mémorisée en envoyant un pan/tilt par lyre. */
export function recallGroupPosition(
  position: GroupPosition,
  movingHeadIds: number[],
  fixtureIds: number[],
  groupId: string,
  sendMovement: SendMovementFn
): void {
  if (movingHeadIds.length === 0) {
    sendMovement(fixtureIds, position.x, position.y, groupId);
    return;
  }
  const linked = isLinkedMemoryPosition(position, movingHeadIds);
  if (linked) {
    sendMovement(fixtureIds, position.x, position.y, groupId);
    return;
  }
  const distinct = positionHasDistinctPerFixture(position, movingHeadIds);
  if (!distinct) {
    const { x, y } = getFixturePanTiltFromPosition(position, movingHeadIds[0]!);
    sendMovement(fixtureIds, x, y, groupId);
    return;
  }
  for (const id of movingHeadIds) {
    const { x, y } = getFixturePanTiltFromPosition(position, id);
    sendMovement(fixtureIds, x, y, groupId, { onlyFixtureId: id });
  }
}

export type RecalledPositionStateSync = {
  setGroupPan: Dispatch<SetStateAction<Record<string, number>>>;
  setGroupTilt: Dispatch<SetStateAction<Record<string, number>>>;
  setGroupMovementCenters: Dispatch<
    SetStateAction<Record<string, Record<string, { x: number; y: number }>>>
  >;
  setGroupMovementCenterLinked?: Dispatch<SetStateAction<Record<string, boolean>>>;
};

/** Aligne pan/tilt Live et centres de forme avec une position mémorisée rappelée. */
export function syncRecalledPositionGroupState(
  position: GroupPosition,
  movingHeadIds: number[],
  groupId: string,
  sync: RecalledPositionStateSync
): void {
  sync.setGroupPan((prev) => ({ ...prev, [groupId]: position.x }));
  sync.setGroupTilt((prev) => ({ ...prev, [groupId]: position.y }));

  if (movingHeadIds.length === 0) return;

  const linked = isLinkedMemoryPosition(position, movingHeadIds);

  if (linked) {
    const groupMap: Record<string, { x: number; y: number }> = {};
    for (const id of movingHeadIds) {
      groupMap[fixtureKey(id)] = { x: position.x, y: position.y };
    }
    sync.setGroupMovementCenters((prev) => ({
      ...prev,
      [groupId]: { ...(prev[groupId] ?? {}), ...groupMap },
    }));
    sync.setGroupMovementCenterLinked?.((prev) => ({ ...prev, [groupId]: true }));
    return;
  }

  const groupMap: Record<string, { x: number; y: number }> = {};
  for (const id of movingHeadIds) {
    const pt = getFixturePanTiltFromPosition(position, id);
    groupMap[fixtureKey(id)] = { x: pt.x, y: pt.y };
  }
  sync.setGroupMovementCenters((prev) => ({
    ...prev,
    [groupId]: { ...(prev[groupId] ?? {}), ...groupMap },
  }));
  sync.setGroupMovementCenterLinked?.((prev) => ({ ...prev, [groupId]: false }));
}

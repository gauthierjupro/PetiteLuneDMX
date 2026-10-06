import type { Dispatch, SetStateAction } from 'react';
import type { QuickMovementSavedState } from '../types';

/** Centre pan/tilt de la forme par lyre (clé fixture = id en string). */
export type GroupMovementCenters = Record<
  string,
  Record<string, { x: number; y: number }>
>;

export type MovementCenterSaveFields = Pick<
  QuickMovementSavedState,
  'movementCenterLinked' | 'movementCentersPerFixture'
>;

export function snapshotMovementCenterFields(
  groupId: string,
  centerLinked: boolean,
  groupPan: Record<string, number>,
  groupTilt: Record<string, number>,
  centers: GroupMovementCenters | undefined
): MovementCenterSaveFields & { centerPan: number; centerTilt: number } {
  return {
    centerPan: groupPan[groupId] ?? 127,
    centerTilt: groupTilt[groupId] ?? 127,
    movementCenterLinked: centerLinked,
    movementCentersPerFixture: centerLinked
      ? undefined
      : { ...(centers?.[groupId] ?? {}) },
  };
}

export function applySavedMovementCenters(
  saved: QuickMovementSavedState | undefined,
  groupId: string,
  fixtureIds: number[],
  movingHeadIds: number[],
  sendMovement: (
    ids: number[],
    pan: number,
    tilt: number,
    gid: string,
    options?: { onlyFixtureId?: number }
  ) => void,
  setGroupMovementCenterLinked: Dispatch<
    SetStateAction<Record<string, boolean>>
  >
): void {
  if (!saved) return;
  const linked = saved.movementCenterLinked !== false;
  setGroupMovementCenterLinked((prev) => ({ ...prev, [groupId]: linked }));

  if (linked || movingHeadIds.length < 2) {
    sendMovement(
      fixtureIds,
      saved.centerPan,
      saved.centerTilt,
      groupId
    );
    return;
  }

  const per = saved.movementCentersPerFixture ?? {};
  movingHeadIds.forEach((id) => {
    const c = per[String(id)] ?? {
      x: saved.centerPan,
      y: saved.centerTilt,
    };
    sendMovement(fixtureIds, c.x, c.y, groupId, { onlyFixtureId: id });
  });
}

export function isGroupMovementCenterLinked(
  groupId: string,
  linked: Record<string, boolean> | undefined
): boolean {
  return linked?.[groupId] !== false;
}

export function getFixtureMovementCenter(
  groupId: string,
  fixtureId: number,
  groupPan: Record<string, number>,
  groupTilt: Record<string, number>,
  centers: GroupMovementCenters | undefined
): { pan: number; tilt: number } {
  const gp = groupPan[groupId] ?? 127;
  const gt = groupTilt[groupId] ?? 127;
  const pf = centers?.[groupId]?.[String(fixtureId)];
  return pf ? { pan: pf.x, tilt: pf.y } : { pan: gp, tilt: gt };
}

export function movementCenterListForHeads(
  groupId: string,
  headIds: number[],
  groupPan: Record<string, number>,
  groupTilt: Record<string, number>,
  centers: GroupMovementCenters | undefined,
  linked: boolean
): { pan: number; tilt: number }[] {
  if (linked || headIds.length === 0) {
    const pan = groupPan[groupId] ?? 127;
    const tilt = groupTilt[groupId] ?? 127;
    return headIds.map(() => ({ pan, tilt }));
  }
  return headIds.map((id) =>
    getFixtureMovementCenter(groupId, id, groupPan, groupTilt, centers)
  );
}

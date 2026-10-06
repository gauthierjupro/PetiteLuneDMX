import type { GroupPosition } from '../types';

export const DEFAULT_GROUP_CENTER_POSITION: GroupPosition = {
  x: 127,
  y: 127,
  label: 'Centre',
};

export type GroupCenterPositions = Record<string, GroupPosition>;

export function getGroupCenterPosition(
  groupId: string,
  centers: GroupCenterPositions | undefined
): GroupPosition {
  return centers?.[groupId] ?? DEFAULT_GROUP_CENTER_POSITION;
}

import type { Group, RgbColor } from '../types';

export function findGroupForFixture(
  groups: Group[],
  fixtureId: number
): Group | undefined {
  return groups.find((g) =>
    g.fixtureIds.some((id) => Number(id) === Number(fixtureId))
  );
}

export function groupColorOrDefault(
  groupColors: Record<string, RgbColor>,
  groupId: string | undefined
): RgbColor {
  if (!groupId) return { r: 100, g: 116, b: 139 };
  return groupColors[groupId] ?? { r: 100, g: 116, b: 139 };
}

export function rgbColorToCss(c: RgbColor, alpha = 1): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

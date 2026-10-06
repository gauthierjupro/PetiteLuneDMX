import type { Fixture, StageFixturePosition } from '../types';
import { setLocalStorageJsonDebounced } from './localStorageDebounced';

export const STAGE_POSITIONS_KEY = 'stage_positions';
export const STAGE_POSITIONS_EVENT = 'pldmx:stage_positions';

export function generateDefaultPositions(fixtures: Fixture[]): StageFixturePosition[] {
  return fixtures.map((f, i) => ({
    id: f.id,
    x: 10 + (i % 6) * 15,
    y: 10 + Math.floor(i / 6) * 20,
    z: f.type === 'Moving Head' ? 0 : 100,
  }));
}

/** Fusionne le stockage avec le patch courant (garde les positions existantes, ajoute les nouveaux). */
export function mergeStagePositions(
  fixtures: Fixture[],
  saved: StageFixturePosition[] | null
): StageFixturePosition[] {
  if (!saved || saved.length === 0) {
    return generateDefaultPositions(fixtures);
  }

  let finalPositions = saved.filter((p) =>
    fixtures.some((f) => Number(f.id) === Number(p.id))
  );

  const newFixtures = fixtures.filter(
    (f) => !finalPositions.some((p) => Number(p.id) === Number(f.id))
  );

  if (newFixtures.length > 0) {
    const defaults = generateDefaultPositions(fixtures);
    const newPositions = newFixtures.map((f) => {
      const def = defaults.find((d) => Number(d.id) === Number(f.id));
      return def || { id: f.id, x: 50, y: 50, z: 100 };
    });
    finalPositions = [...finalPositions, ...newPositions];
  }

  return finalPositions;
}

export function loadStagePositions(fixtures: Fixture[]): StageFixturePosition[] {
  const savedStr = localStorage.getItem(STAGE_POSITIONS_KEY);
  if (!savedStr) {
    return generateDefaultPositions(fixtures);
  }
  try {
    const saved = JSON.parse(savedStr) as StageFixturePosition[];
    return mergeStagePositions(fixtures, saved);
  } catch (e) {
    console.error('Erreur parsing stage_positions:', e);
    return generateDefaultPositions(fixtures);
  }
}

export function persistStagePositions(positions: StageFixturePosition[]): void {
  setLocalStorageJsonDebounced(STAGE_POSITIONS_KEY, positions, 300);
  window.dispatchEvent(
    new CustomEvent(STAGE_POSITIONS_EVENT, { detail: positions })
  );
}

export function sameFixtureId(a: number | string, b: number | string): boolean {
  return Number(a) === Number(b);
}

export function isStageFixtureVisible(pos: StageFixturePosition): boolean {
  return pos.visible !== false;
}

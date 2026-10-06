import { describe, expect, it } from 'vitest';
import {
  mergeStagePositions,
  generateDefaultPositions,
  isStageFixtureVisible,
} from './stagePositions';
import type { Fixture } from '../types';

const fixtures: Fixture[] = [
  { id: 1, name: 'A', manufacturer: 'X', model: 'Y', address: 1, channels: 5, type: 'RGB' },
  { id: 2, name: 'B', manufacturer: 'X', model: 'Y', address: 10, channels: 9, type: 'Moving Head' },
];

describe('mergeStagePositions', () => {
  it('garde les positions existantes et ajoute les nouveaux fixtures', () => {
    const saved = [{ id: 1, x: 20, y: 30, z: 50 }];
    const merged = mergeStagePositions(fixtures, saved);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.id === 1)?.x).toBe(20);
    expect(merged.some((p) => p.id === 2)).toBe(true);
  });

  it('génère des défauts si saved null', () => {
    const merged = mergeStagePositions(fixtures, null);
    expect(merged).toEqual(generateDefaultPositions(fixtures));
  });
});

describe('isStageFixtureVisible', () => {
  it('visible par défaut, masqué si visible === false', () => {
    expect(isStageFixtureVisible({ id: 1, x: 0, y: 0 })).toBe(true);
    expect(isStageFixtureVisible({ id: 1, x: 0, y: 0, visible: false })).toBe(false);
  });
});

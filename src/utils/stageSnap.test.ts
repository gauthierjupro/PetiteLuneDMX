import { describe, expect, it } from 'vitest';
import {
  alignSceneElementSelection,
  alignStageSelection,
  distributeStageSelection,
  isPlanPointInMarquee,
  resolveStageSnapSteps,
  snapPercent,
  snapStageFixturePositions,
  nudgeStageSelection,
  nudgeStageSelectionZ,
  setStageSelectionZ,
  nudgeSceneElementsZ,
  setSceneElementsZ,
} from './stageSnap';
import type { StageSceneElement } from '../types';

describe('stageSnap', () => {
  it('snapPercent rounds to step when enabled', () => {
    expect(snapPercent(47, 5, true)).toBe(45);
    expect(snapPercent(47, 5, false)).toBe(47);
  });

  it('snapStageFixturePositions accroche au relâchement', () => {
    const positions = [{ id: 1, x: 47, y: 53, z: 50 }];
    const next = snapStageFixturePositions(positions, [1], true, 5, 5);
    expect(next[0].x).toBe(45);
    expect(next[0].y).toBe(55);
  });

  it('alignSceneElementSelection moves y for top', () => {
    const elements: StageSceneElement[] = [
      {
        id: 'a',
        kind: 'guitarist',
        name: 'G',
        x: 50,
        y: 80,
        z: 50,
        enabled: true,
      },
    ];
    const next = alignSceneElementSelection(elements, ['a'], 'top');
    expect(next[0].y).toBe(8);
  });

  it('alignStageSelection moves x for left (salle)', () => {
    const positions = [
      { id: 1, x: 30, y: 50 },
      { id: 2, x: 70, y: 50 },
    ];
    const next = alignStageSelection(positions, [1], 'left', 'room');
    expect(next[0].x).toBe(8);
    expect(next[1].x).toBe(70);
  });

  it('alignStageSelection aligns selection edges together', () => {
    const positions = [
      { id: 1, x: 30, y: 40 },
      { id: 2, x: 70, y: 60 },
    ];
    const left = alignStageSelection(positions, [1, 2], 'left', 'selection');
    expect(left[0].x).toBe(30);
    expect(left[1].x).toBe(30);
    const centerY = alignStageSelection(positions, [1, 2], 'centerY', 'selection');
    expect(centerY[0].y).toBe(50);
    expect(centerY[1].y).toBe(50);
  });

  it('nudgeStageSelection shifts selected ids', () => {
    const positions = [{ id: 1, x: 50, y: 50 }];
    const next = nudgeStageSelection(positions, [1], 5, 0, true, 5);
    expect(next[0].x).toBe(55);
  });

  it('nudgeStageSelectionZ and setStageSelectionZ affect only selection', () => {
    const positions = [
      { id: 1, x: 50, y: 50, z: 40 },
      { id: 2, x: 50, y: 50, z: 60 },
    ];
    const nudged = nudgeStageSelectionZ(positions, [1, 2], 5, true, 5);
    expect(nudged[0].z).toBe(45);
    expect(nudged[1].z).toBe(65);
    const flat = setStageSelectionZ(nudged, [1, 2], 30, true, 5);
    expect(flat[0].z).toBe(30);
    expect(flat[1].z).toBe(30);
  });

  it('nudgeSceneElementsZ and setSceneElementsZ', () => {
    const elements: StageSceneElement[] = [
      {
        id: 'a',
        kind: 'vocalist',
        name: 'V',
        x: 50,
        y: 50,
        z: 10,
        enabled: true,
      },
      {
        id: 'b',
        kind: 'guitarist',
        name: 'G',
        x: 50,
        y: 50,
        z: 20,
        enabled: true,
      },
    ];
    const nudged = nudgeSceneElementsZ(elements, ['a', 'b'], 5, true, 5);
    expect(nudged[0].z).toBe(15);
    expect(nudged[1].z).toBe(25);
    const flat = setSceneElementsZ(nudged, ['a'], 0, true, 5);
    expect(flat[0].z).toBe(0);
    expect(flat[1].z).toBe(25);
  });

  it('distributeStageSelection spreads on x', () => {
    const positions = [
      { id: 1, x: 10, y: 50 },
      { id: 2, x: 90, y: 50 },
    ];
    const next = distributeStageSelection(positions, [1, 2], 'x', false, 5);
    expect(next[0].x).toBe(10);
    expect(next[1].x).toBe(90);
    const three = [
      { id: 1, x: 10, y: 50 },
      { id: 2, x: 50, y: 50 },
      { id: 3, x: 90, y: 50 },
    ];
    const spread = distributeStageSelection(three, [1, 2, 3], 'x', false, 5);
    expect(spread[1].x).toBe(50);
  });

  it('distributeStageSelection spreads stacked fixtures', () => {
    const positions = [
      { id: 1, x: 50, y: 40 },
      { id: 2, x: 50, y: 40 },
      { id: 3, x: 50, y: 40 },
    ];
    const next = distributeStageSelection(positions, [1, 2, 3], 'x', false, 5);
    expect(next[0].x).toBeLessThan(next[1].x!);
    expect(next[1].x).toBeLessThan(next[2].x!);
  });

  it('resolveStageSnapSteps uses room meters on axes', () => {
    const steps = resolveStageSnapSteps('meter1', 20, 40);
    expect(steps.label).toBe('1 m');
    expect(steps.stepX).toBeCloseTo(5, 1);
    expect(steps.stepY).toBeCloseTo(2.5, 1);
  });

  it('isPlanPointInMarquee detects inside rect', () => {
    expect(isPlanPointInMarquee(50, 50, { xMin: 10, xMax: 90, yMin: 10, yMax: 90 })).toBe(
      true
    );
    expect(isPlanPointInMarquee(5, 50, { xMin: 10, xMax: 90, yMin: 10, yMax: 90 })).toBe(
      false
    );
  });

  it('distributeStageSelection uses room span on x', () => {
    const positions = [
      { id: 1, x: 50, y: 50 },
      { id: 2, x: 55, y: 50 },
    ];
    const bounds = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    const next = distributeStageSelection(
      positions,
      [1, 2],
      'x',
      false,
      5,
      'room',
      bounds
    );
    expect(next[0].x).toBe(0);
    expect(next[1].x).toBe(100);
  });
});

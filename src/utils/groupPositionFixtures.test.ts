import { describe, expect, it, vi } from 'vitest';
import {
  captureGroupPositionFromLive,
  getFixturePanTiltFromPosition,
  positionMemoryDisplayDots,
  recallGroupPosition,
  setFixturePanTiltOnPosition,
  syncRecalledPositionGroupState,
} from './groupPositionFixtures';
import type { GroupPosition } from '../types';

describe('groupPositionFixtures', () => {
  it('uses shared x/y when no per-fixture entry', () => {
    const pos: GroupPosition = { x: 100, y: 120, label: 'A' };
    expect(getFixturePanTiltFromPosition(pos, 42)).toEqual({ x: 100, y: 120 });
  });

  it('shows one dot when all heads share the same pan/tilt', () => {
    const pos: GroupPosition = { x: 127, y: 127, label: 'A' };
    const dots = positionMemoryDisplayDots(pos, [1, 2]);
    expect(dots).toEqual([{ x: 127, y: 127 }]);
  });

  it('shows per-head dots when stored values differ across heads', () => {
    const pos: GroupPosition = {
      x: 127,
      y: 127,
      label: 'A',
      perFixture: { '1': { x: 50, y: 200 } },
    };
    const dots = positionMemoryDisplayDots(pos, [1, 2]);
    expect(dots).toEqual([
      { x: 50, y: 200 },
      { x: 127, y: 127 },
    ]);
  });

  it('shows per-head dots when per-fixture values differ', () => {
    let pos: GroupPosition = { x: 127, y: 127, label: 'A' };
    pos = setFixturePanTiltOnPosition(pos, 1, 10, 20);
    pos = setFixturePanTiltOnPosition(pos, 2, 30, 40);
    const dots = positionMemoryDisplayDots(pos, [1, 2]);
    expect(dots).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
  });

  it('recalls linked group with one send when all heads share pan/tilt', () => {
    const pos: GroupPosition = { x: 60, y: 70, label: 'A' };
    const send = vi.fn();
    recallGroupPosition(pos, [1, 2], [1, 2], 'g1', send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith([1, 2], 60, 70, 'g1');
  });

  it('recalls each fixture in per_fixture storage', () => {
    let pos: GroupPosition = { x: 127, y: 127, label: 'A' };
    pos = setFixturePanTiltOnPosition(pos, 1, 11, 22);
    pos = setFixturePanTiltOnPosition(pos, 2, 33, 44);
    const send = vi.fn();
    recallGroupPosition(pos, [1, 2], [1, 2], 'g1', send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, [1, 2], 11, 22, 'g1', {
      onlyFixtureId: 1,
    });
    expect(send).toHaveBeenNthCalledWith(2, [1, 2], 33, 44, 'g1', {
      onlyFixtureId: 2,
    });
  });

  it('capture linked clears perFixture', () => {
    const base: GroupPosition = {
      x: 1,
      y: 2,
      label: 'X',
      perFixture: { '1': { x: 9, y: 9 } },
    };
    const out = captureGroupPositionFromLive(
      base,
      [1, 2],
      { x: 80, y: 90 },
      () => ({ x: 10, y: 20 }),
      'linked'
    );
    expect(out).toEqual({
      x: 80,
      y: 90,
      label: 'X',
      perFixture: undefined,
      memoryLinked: true,
    });
  });

  it('recall linked position forces centre lié state', () => {
    const pos: GroupPosition = {
      x: 100,
      y: 110,
      label: 'P1',
      memoryLinked: true,
    };
    const setLinked = vi.fn((fn: (p: Record<string, boolean>) => Record<string, boolean>) =>
      fn({})
    );
    syncRecalledPositionGroupState(pos, [1, 2], 'g1', {
      setGroupPan: vi.fn(),
      setGroupTilt: vi.fn(),
      setGroupMovementCenters: vi.fn(),
      setGroupMovementCenterLinked: setLinked as never,
    });
    expect(setLinked).toHaveBeenCalled();
    expect(setLinked.mock.results[0]?.value).toEqual({ g1: true });
  });
});

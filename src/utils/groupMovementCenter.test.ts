import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GROUP_CENTER_POSITION,
  getGroupCenterPosition,
} from './groupMovementCenter';

describe('getGroupCenterPosition', () => {
  it('returns default when group has no saved center', () => {
    expect(getGroupCenterPosition('g1', {})).toEqual(DEFAULT_GROUP_CENTER_POSITION);
  });

  it('returns saved center for group', () => {
    const saved = { x: 100, y: 140, label: 'Home' };
    expect(getGroupCenterPosition('g1', { g1: saved })).toEqual(saved);
  });
});

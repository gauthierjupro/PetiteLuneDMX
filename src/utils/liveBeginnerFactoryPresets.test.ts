import { describe, expect, it } from 'vitest';
import {
  ambiancePresetsAreEmpty,
  buildBeginnerFactoryPresets,
  mergeBeginnerFactoryPresets,
} from './liveBeginnerFactoryPresets';
import type { AmbiancePreset, Group } from '../types';

const groups: Group[] = [
  {
    id: 'g1',
    name: 'PAR',
    fixtureIds: [1],
    isAmbiance: true,
  },
];

describe('liveBeginnerFactoryPresets', () => {
  it('detects empty presets', () => {
    const presets: Record<string, AmbiancePreset> = {
      '1': { name: 'A', groupStates: {} },
    };
    expect(ambiancePresetsAreEmpty(presets)).toBe(true);
  });

  it('builds three factory scenes for ambiance groups', () => {
    const factory = buildBeginnerFactoryPresets(groups);
    expect(factory['1']?.name).toBe('Douce');
    expect(factory['2']?.name).toBe('Fête');
    expect(Object.keys(factory['1']!.groupStates)).toContain('g1');
  });

  it('merges only when all slots empty', () => {
    const empty: Record<string, AmbiancePreset> = {
      '1': { name: 'Ambiance 1', groupStates: {} },
    };
    const merged = mergeBeginnerFactoryPresets(empty, groups);
    expect(merged?.['1'].name).toBe('Douce');

    const filled: Record<string, AmbiancePreset> = {
      '1': { name: 'Custom', groupStates: { g1: { dim: 1, str: 0, color: { r: 0, g: 0, b: 0 }, auto: false, pulse: false } } },
    };
    expect(mergeBeginnerFactoryPresets(filled, groups)).toBeNull();
  });
});

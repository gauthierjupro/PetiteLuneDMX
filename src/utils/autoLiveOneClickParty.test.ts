import { describe, expect, it } from 'vitest';
import type { AmbiancePreset, Fixture, Group } from '../types';
import { pickEnergyLookSlots, pickOneClickPartyPresetId } from './autoLiveOneClickParty';

const presets: Record<string, AmbiancePreset> = {
  '1': { name: 'Douce', groupStates: { g1: { dim: 200, str: 0, color: { r: 1, g: 1, b: 1 }, auto: false, pulse: false } } },
  '2': { name: 'Fête', groupStates: { g1: { dim: 255, str: 0, color: { r: 1, g: 1, b: 1 }, auto: false, pulse: false } } },
  '3': { name: 'Rouge intense', groupStates: { g1: { dim: 255, str: 0, color: { r: 1, g: 1, b: 1 }, auto: false, pulse: false } } },
};

describe('autoLiveOneClickParty', () => {
  it('associe calm / build / peak aux noms de scènes', () => {
    expect(pickEnergyLookSlots(presets)).toEqual({
      calmSlot: '1',
      buildSlot: '2',
      peakSlot: '3',
    });
  });

  it('choisit club pour parc riche avec lyres', () => {
    const fixtures: Fixture[] = [
      {
        id: 1,
        name: 'MH',
        manufacturer: 'X',
        model: 'Y',
        address: 1,
        channels: 16,
        type: 'Moving Head',
      },
    ];
    const groups: Group[] = [
      { id: 'a', name: 'A', fixtureIds: [1], isAmbiance: true },
      { id: 'b', name: 'B', fixtureIds: [1], isAmbiance: true },
      { id: 'c', name: 'C', fixtureIds: [1], isAmbiance: true },
    ];
    expect(pickOneClickPartyPresetId(groups, fixtures, ['a', 'b', 'c'])).toBe('club');
  });
});

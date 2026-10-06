import { describe, expect, it } from 'vitest';
import type { FixtureProfile } from '../types';
import {
  createProfileFromFixture,
  hasLibraryProfileForFixture,
  listMissingProfilesFromPatch,
} from './fixtureProfileFromPatch';

describe('fixtureProfileFromPatch', () => {
  it('detects missing library profile', () => {
    const profiles: FixtureProfile[] = [
      {
        id: 'a',
        name: 'X',
        manufacturer: 'Stairville',
        model: 'LED Flood Panel 150',
        channels: 8,
        type: 'RGB',
        channelDefs: Array.from({ length: 8 }, (_, i) => ({
          index: i + 1,
          name: `C${i + 1}`,
          type: 'other' as const,
        })),
      },
    ];
    expect(
      hasLibraryProfileForFixture(
        { manufacturer: 'BoomToneDJ', model: 'Dynamo Scan LED', name: 'Dynamo [1]' },
        profiles
      )
    ).toBe(false);
  });

  it('creates moving head profile from patched fixture', () => {
    const draft = createProfileFromFixture({
      id: 14,
      name: 'Dynamo Scan LED [15]',
      manufacturer: 'BoomToneDJ',
      model: 'Dynamo Scan LED',
      address: 300,
      channels: 9,
      type: 'Moving Head',
    });
    expect(draft.channels).toBe(9);
    expect(draft.channelDefs[0].type).toBe('pan');
    expect(draft.manufacturer).toBe('BoomToneDJ');
  });

  it('listMissingProfilesFromPatch dedupes by manufacturer/model', () => {
    const fixtures = [
      {
        id: 14,
        name: 'Dynamo [15]',
        manufacturer: 'BoomToneDJ',
        model: 'Dynamo Scan LED',
        address: 300,
        channels: 9,
        type: 'Moving Head' as const,
      },
      {
        id: 15,
        name: 'Dynamo [16]',
        manufacturer: 'BoomToneDJ',
        model: 'Dynamo Scan LED',
        address: 309,
        channels: 9,
        type: 'Moving Head' as const,
      },
    ];
    const missing = listMissingProfilesFromPatch(fixtures, []);
    expect(missing).toHaveLength(1);
  });
});

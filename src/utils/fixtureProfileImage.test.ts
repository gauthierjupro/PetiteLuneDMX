import { describe, expect, it } from 'vitest';
import {
  findProfileForFixture,
  isAllowedProfileImageUrl,
  isEmbeddedProfileImage,
  resolveFixtureProfileImageUrl,
} from './fixtureProfileImage';
import type { FixtureProfile } from '../types';

const profiles: FixtureProfile[] = [
  {
    id: 'prof_a',
    name: 'A',
    manufacturer: 'Brand',
    model: 'X1',
    channels: 1,
    type: 'RGB',
    channelDefs: [{ index: 1, name: 'D', type: 'dimmer' }],
    imageUrl: 'https://example.com/light.jpg',
  },
];

describe('fixtureProfileImage', () => {
  it('isAllowedProfileImageUrl accepts https and data urls', () => {
    expect(isAllowedProfileImageUrl('https://x/y.png')).toBe(true);
    expect(isAllowedProfileImageUrl('data:image/png;base64,abc')).toBe(true);
    expect(isAllowedProfileImageUrl('javascript:alert(1)')).toBe(false);
  });

  it('isEmbeddedProfileImage detects data urls only', () => {
    expect(isEmbeddedProfileImage('data:image/jpeg;base64,x')).toBe(true);
    expect(isEmbeddedProfileImage('https://x/y.png')).toBe(false);
  });

  it('resolveFixtureProfileImageUrl uses profileId then manufacturer/model', () => {
    const byId = resolveFixtureProfileImageUrl(
      { profileId: 'prof_a', manufacturer: 'Other', model: 'Z' },
      profiles
    );
    expect(byId).toBe('https://example.com/light.jpg');
    const byMatch = resolveFixtureProfileImageUrl(
      { manufacturer: 'Brand', model: 'X1' },
      profiles
    );
    expect(byMatch).toBe('https://example.com/light.jpg');
  });

  it('findProfileForFixture matches id first', () => {
    const p = findProfileForFixture(
      { profileId: 'prof_a', manufacturer: 'Brand', model: 'X1', name: 'A' },
      profiles
    );
    expect(p?.id).toBe('prof_a');
  });

  it('findProfileForFixture matches patch vs librairie (modèle proche)', () => {
    const lib: FixtureProfile[] = [
      {
        id: 'stairville_flood_150',
        name: 'LED Flood Panel 150',
        manufacturer: 'Stairville',
        model: 'Flood 150',
        channels: 8,
        type: 'RGB',
        channelDefs: [
          { index: 1, name: 'D', type: 'dimmer' },
          { index: 2, name: 'R', type: 'red' },
          { index: 3, name: 'G', type: 'green' },
          { index: 4, name: 'B', type: 'blue' },
          { index: 5, name: 'S', type: 'strobe' },
          { index: 6, name: 'M', type: 'other' },
          { index: 7, name: 'Sp', type: 'speed' },
          { index: 8, name: 'W', type: 'white' },
        ],
        imageUrl: 'data:image/jpeg;base64,abc',
      },
    ];
    const p = findProfileForFixture(
      {
        manufacturer: 'Stairville',
        model: 'LED Flood Panel 150',
        name: 'LED Flood Panel 150 [1]',
      },
      lib
    );
    expect(p?.id).toBe('stairville_flood_150');
    expect(
      resolveFixtureProfileImageUrl(
        {
          manufacturer: 'Stairville',
          model: 'LED Flood Panel 150',
          name: 'LED Flood Panel 150 [1]',
        },
        lib
      )
    ).toBe('data:image/jpeg;base64,abc');
  });
});

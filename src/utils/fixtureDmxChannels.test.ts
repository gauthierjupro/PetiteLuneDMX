import { describe, expect, it } from 'vitest';
import { fixtureChannelIndex, resolveFixtureChannelDefs } from './fixtureDmxChannels';
import type { Fixture, FixtureProfile } from '../types';

const dynamoProfile: FixtureProfile = {
  id: 'boomtone_dynamo_scan',
  name: 'Dynamo Scan LED',
  manufacturer: 'BoomToneDJ',
  model: 'Dynamo Scan LED',
  channels: 9,
  type: 'Moving Head',
  channelDefs: [
    { index: 1, name: 'Pan', type: 'pan' },
    { index: 2, name: 'Tilt', type: 'tilt' },
    { index: 3, name: 'Pan fin', type: 'other' },
    { index: 4, name: 'Tilt fin', type: 'other' },
    { index: 5, name: 'Vitesse', type: 'speed' },
    { index: 6, name: 'Couleur', type: 'color' },
    { index: 7, name: 'Gobo', type: 'gobo' },
    { index: 8, name: 'Dimmer', type: 'dimmer' },
    { index: 9, name: 'Strobe', type: 'strobe' },
  ],
};

const dynamo: Fixture = {
  id: 14,
  name: 'Dynamo Scan LED [15]',
  manufacturer: 'BoomToneDJ',
  model: 'Dynamo Scan LED',
  address: 300,
  channels: 9,
  type: 'Moving Head',
  profileId: 'boomtone_dynamo_scan',
};

describe('fixtureDmxChannels', () => {
  it('mappe le dimmer Dynamo sur le canal 8 (index 307)', () => {
    expect(fixtureChannelIndex(dynamo, 'dimmer', [dynamoProfile])).toBe(306);
    expect(fixtureChannelIndex(dynamo, 'tilt', [dynamoProfile])).toBe(300);
  });

  it('template Effect pour Xtrem LED', () => {
    const xtrem: Fixture = {
      id: 10,
      name: 'Xtrem LED [11]',
      manufacturer: 'BoomToneDJ',
      model: 'Xtrem LED',
      address: 1,
      channels: 6,
      type: 'Effect',
    };
    const defs = resolveFixtureChannelDefs(xtrem, []);
    expect(defs.find((d) => d.type === 'dimmer')?.index).toBe(6);
    expect(defs.find((d) => d.type === 'color')?.index).toBe(3);
  });
});

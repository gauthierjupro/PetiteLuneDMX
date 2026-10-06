import { describe, expect, it } from 'vitest';
import {
  colorGroupIdsForAutoLive,
  pulseGroupIdsForAutoLive,
} from './autoLiveGroups';
import type { Fixture, Group } from '../types';

const fixtures: Fixture[] = [
  {
    id: 1,
    name: 'PAR',
    manufacturer: 'X',
    model: 'Y',
    address: 1,
    channels: 5,
    type: 'RGB',
  },
  {
    id: 2,
    name: 'Spot',
    manufacturer: 'X',
    model: 'Z',
    address: 10,
    channels: 9,
    type: 'Moving Head',
  },
];

describe('autoLiveGroups', () => {
  it('pulse priorise les groupes ambiance', () => {
    const groups: Group[] = [
      { id: 'amb', name: 'Amb', fixtureIds: [1], isAmbiance: true },
      { id: 'lyr', name: 'Lyres', fixtureIds: [2] },
    ];
    expect(pulseGroupIdsForAutoLive(groups, fixtures)).toEqual(['amb']);
  });

  it('couleur inclut lyres hors ambiance dédiée', () => {
    const groups: Group[] = [{ id: 'lyr', name: 'Lyres', fixtureIds: [2] }];
    expect(colorGroupIdsForAutoLive(groups, fixtures)).toEqual(['lyr']);
  });

  it('pulse inclut un groupe Dynamo sans ambiance', () => {
    const dynamo: Fixture = {
      id: 3,
      name: 'Dynamo [15]',
      manufacturer: 'BoomToneDJ',
      model: 'Dynamo Scan LED',
      address: 20,
      channels: 9,
      type: 'Moving Head',
    };
    const groups: Group[] = [{ id: 'dyn', name: 'Scans', fixtureIds: [3] }];
    expect(pulseGroupIdsForAutoLive(groups, [...fixtures, dynamo])).toEqual(['dyn']);
    expect(colorGroupIdsForAutoLive(groups, [...fixtures, dynamo])).toEqual(['dyn']);
  });

  it('pulse et couleur incluent un groupe laser WOOKIE', () => {
    const laser: Fixture = {
      id: 4,
      name: 'Wookie [1]',
      manufacturer: 'Cameo',
      model: 'WOOKIE 200 R',
      address: 30,
      channels: 9,
      type: 'Laser',
    };
    const groups: Group[] = [{ id: 'las', name: 'Laser', fixtureIds: [4] }];
    expect(pulseGroupIdsForAutoLive(groups, [laser])).toEqual(['las']);
    expect(colorGroupIdsForAutoLive(groups, [laser])).toEqual(['las']);
  });
});

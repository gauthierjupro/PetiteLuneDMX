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
});

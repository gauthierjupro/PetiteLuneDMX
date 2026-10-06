import { describe, expect, it } from 'vitest';
import {
  getLiveAmbianceGroups,
  getLiveLyreDisplayGroups,
  getLiveLyreGroups,
  getLiveSpecialGroups,
  getLiveUnassignedGroups,
  isLiveOrphanLyreGroup,
} from './liveGroups';
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

describe('liveGroups', () => {
  it('inclut les PAR sans case Ambiance', () => {
    const groups: Group[] = [{ id: 'front', name: 'Front', fixtureIds: [1] }];
    expect(getLiveAmbianceGroups(groups, fixtures).map((g) => g.id)).toEqual(['front']);
  });

  it('affiche les Dynamo orphelins comme carte Live', () => {
    const withDynamo: Fixture[] = [
      ...fixtures,
      {
        id: 3,
        name: 'Dynamo [15]',
        manufacturer: 'BoomToneDJ',
        model: 'Dynamo Scan LED',
        address: 300,
        channels: 9,
        type: 'Moving Head',
      },
    ];
    const groups: Group[] = [{ id: 'lyr', name: 'Lyres PicoSpot', fixtureIds: [2] }];
    const display = getLiveLyreDisplayGroups(groups, withDynamo);
    expect(display.some((g) => g.id === 'lyr')).toBe(true);
    const dynamoCard = display.find((g) => g.fixtureIds.includes(3));
    expect(dynamoCard).toBeDefined();
    expect(dynamoCard && isLiveOrphanLyreGroup(dynamoCard)).toBe(true);
    expect(dynamoCard?.name).toBe('Dynamo Scan LED');
  });

  it('exclut les groupes lyre-only sans ambiance', () => {
    const groups: Group[] = [{ id: 'lyr', name: 'Lyres', fixtureIds: [2] }];
    expect(getLiveAmbianceGroups(groups, fixtures)).toEqual([]);
    expect(getLiveLyreGroups(groups, fixtures).map((g) => g.id)).toEqual(['lyr']);
  });

  it('case Ambiance seule : colonne Mouvements seulement si Mouvement coché', () => {
    const groups: Group[] = [
      { id: 'mix', name: 'Mix', fixtureIds: [1, 2], isAmbiance: true },
    ];
    expect(getLiveAmbianceGroups(groups, fixtures).map((g) => g.id)).toEqual(['mix']);
    expect(getLiveLyreGroups(groups, fixtures).map((g) => g.id)).toEqual([]);

    const both: Group[] = [
      { id: 'mix', name: 'Mix', fixtureIds: [1, 2], isAmbiance: true, isMovement: true },
    ];
    expect(getLiveLyreGroups(both, fixtures).map((g) => g.id)).toEqual(['mix']);
  });

  it('inclut les Xtrem / Effect dans ambiance Live', () => {
    const effectFixtures: Fixture[] = [
      ...fixtures,
      {
        id: 3,
        name: 'Xtrem',
        manufacturer: 'BoomToneDJ',
        model: 'Xtrem LED',
        address: 1,
        channels: 6,
        type: 'Effect',
      },
    ];
    const groups: Group[] = [{ id: 'xt', name: 'Xtrem', fixtureIds: [3] }];
    expect(getLiveAmbianceGroups(groups, effectFixtures).map((g) => g.id)).toEqual(['xt']);
  });

  it('reconnaît un scan Effect avec pan/tilt comme lyre Live', () => {
    const dynamo: Fixture = {
      id: 4,
      name: 'Dynamo',
      manufacturer: 'B',
      model: 'Dynamo Scan LED',
      address: 40,
      channels: 9,
      type: 'Effect',
    };
    const groups: Group[] = [{ id: 'lyres', name: 'LYRES', fixtureIds: [4] }];
    expect(getLiveLyreGroups(groups, [dynamo]).map((g) => g.id)).toEqual(['lyres']);
    expect(getLiveUnassignedGroups(groups, [dynamo])).toEqual([]);
  });

  it('place un laser seul en colonne Spéciaux (auto)', () => {
    const groups: Group[] = [
      {
        id: 'laser',
        name: 'Divers FX',
        fixtureIds: [3],
      },
    ];
    const laserFixtures: Fixture[] = [
      ...fixtures,
      {
        id: 3,
        name: 'L',
        manufacturer: 'L',
        model: 'L',
        address: 20,
        channels: 2,
        type: 'Laser',
      },
    ];
    expect(getLiveSpecialGroups(groups, laserFixtures).map((g) => g.id)).toEqual(['laser']);
    expect(getLiveUnassignedGroups(groups, laserFixtures)).toEqual([]);
  });

  it('groupe Spéciaux explicite : hors Ambiance et Mouvements', () => {
    const laserFixtures: Fixture[] = [
      ...fixtures,
      {
        id: 3,
        name: 'L',
        manufacturer: 'Cameo',
        model: 'WOOKIE 200 R',
        address: 20,
        channels: 9,
        type: 'Laser',
      },
    ];
    const groups: Group[] = [
      { id: 'divers', name: 'Divers', fixtureIds: [3], isSpecial: true },
    ];
    expect(getLiveSpecialGroups(groups, laserFixtures).map((g) => g.id)).toEqual(['divers']);
    expect(getLiveLyreGroups(groups, laserFixtures)).toEqual([]);
    expect(getLiveAmbianceGroups(groups, laserFixtures)).toEqual([]);
  });

  it('affiche un groupe laser avec case Mouvement en colonne Mouvements', () => {
    const laserFixtures: Fixture[] = [
      ...fixtures,
      {
        id: 3,
        name: 'L',
        manufacturer: 'L',
        model: 'L',
        address: 20,
        channels: 2,
        type: 'Laser',
      },
    ];
    const groups: Group[] = [
      { id: 'laser', name: 'Laser', fixtureIds: [3], isMovement: true },
    ];
    expect(getLiveLyreGroups(groups, laserFixtures).map((g) => g.id)).toEqual(['laser']);
    expect(getLiveUnassignedGroups(groups, laserFixtures)).toEqual([]);
    expect(getLiveAmbianceGroups(groups, laserFixtures)).toEqual([]);
  });
});

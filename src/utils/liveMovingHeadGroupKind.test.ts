import { describe, expect, it } from 'vitest';
import { movingHeadGroupKind } from './liveMovingHeadGroupKind';
import type { Fixture, Group } from '../types';

const fixtures: Fixture[] = [
  {
    id: 1,
    name: 'P1',
    manufacturer: 'F',
    model: 'PicoSpot 20',
    address: 1,
    channels: 9,
    type: 'Moving Head',
  },
  {
    id: 2,
    name: 'D1',
    manufacturer: 'B',
    model: 'Dynamo Scan LED',
    address: 10,
    channels: 9,
    type: 'Moving Head',
  },
];

describe('movingHeadGroupKind', () => {
  it('détecte un groupe Dynamo', () => {
    const g: Group = { id: 'scans', name: 'Dynamo', fixtureIds: [2] };
    expect(movingHeadGroupKind(g, fixtures)).toBe('scan_dynamo');
  });

  it('détecte un groupe Lyre PicoSpot', () => {
    const g: Group = { id: 'lyr', name: 'Lyres PicoSpot', fixtureIds: [1] };
    expect(movingHeadGroupKind(g, fixtures)).toBe('lyre');
  });
});

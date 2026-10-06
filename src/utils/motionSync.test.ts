import { describe, expect, it } from 'vitest';
import type { Fixture, Group } from '../types';
import {
  LIVE_ORPHAN_LYRE_GROUP_PREFIX,
} from './liveGroups';
import { buildLiveMotionPayload, hasActiveLiveMotion } from './motionSync';

const dynamo: Fixture = {
  id: 5,
  name: 'Dynamo [15]',
  manufacturer: 'BoomToneDJ',
  model: 'Dynamo Scan LED',
  address: 300,
  channels: 9,
  type: 'Moving Head',
};

describe('motionSync', () => {
  it('sync les mouvements des cartes lyre orphelines (ex. Dynamo hors groupe Patch)', () => {
    const groups: Group[] = [];
    const orphanId = `${LIVE_ORPHAN_LYRE_GROUP_PREFIX}Dynamo Scan LED`;
    const payload = buildLiveMotionPayload(
      groups,
      [dynamo],
      {
        [orphanId]: {
          shape: 'circle',
          speed: 100,
          sizePan: 64,
          sizeTilt: 64,
          fan: 0,
          invert180: false,
        },
      },
      { [orphanId]: 127 },
      { [orphanId]: 127 },
      {}
    );

    expect(payload).toHaveLength(1);
    expect(payload[0].group_id).toBe(orphanId);
    expect(payload[0].fixtures[0].pan_address).toBe(300);
    expect(payload[0].fixtures[0].tilt_address).toBe(301);
  });

  it('hasActiveLiveMotion inclut les groupes synthétiques', () => {
    const orphanId = `${LIVE_ORPHAN_LYRE_GROUP_PREFIX}Dynamo Scan LED`;
    expect(
      hasActiveLiveMotion([], [dynamo], {
        [orphanId]: {
          shape: 'pan_sweep',
          speed: 90,
          sizePan: 80,
          sizeTilt: 40,
          fan: 0,
          invert180: false,
        },
      })
    ).toBe(true);
  });
});

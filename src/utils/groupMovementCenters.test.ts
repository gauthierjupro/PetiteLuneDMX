import { describe, expect, it } from 'vitest';
import { snapshotMovementCenterFields } from './groupMovementCenters';

describe('groupMovementCenters save snapshot', () => {
  it('mémorise le mode par lyre et les centres', () => {
    const snap = snapshotMovementCenterFields(
      'g1',
      false,
      { g1: 100 },
      { g1: 110 },
      {
        g1: {
          '1': { x: 50, y: 60 },
          '2': { x: 70, y: 80 },
        },
      }
    );
    expect(snap.movementCenterLinked).toBe(false);
    expect(snap.movementCentersPerFixture?.['1']).toEqual({ x: 50, y: 60 });
    expect(snap.centerPan).toBe(100);
  });

  it('ommet les centres par lyre si lié', () => {
    const snap = snapshotMovementCenterFields(
      'g1',
      true,
      { g1: 127 },
      { g1: 127 },
      { g1: { '1': { x: 1, y: 2 } } }
    );
    expect(snap.movementCenterLinked).toBe(true);
    expect(snap.movementCentersPerFixture).toBeUndefined();
  });
});

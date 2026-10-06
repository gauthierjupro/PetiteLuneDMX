import { describe, expect, it } from 'vitest';
import { lyreStatusBadges, movementShapeShortLabel } from './liveGroupStatusBadges';

describe('liveGroupStatusBadges', () => {
  it('includes pulse and shape labels', () => {
    const badges = lyreStatusBadges({
      pulse: true,
      autoColor: false,
      autoGobo: false,
      movement: { shape: 'circle', speed: 1, sizePan: 1, sizeTilt: 1, fan: 0, invert180: false },
    });
    expect(badges.map((b) => b.label)).toEqual(['Pulse', 'Cercle']);
  });

  it('maps movement shapes', () => {
    expect(movementShapeShortLabel('eight')).toBe('Infini');
  });
});

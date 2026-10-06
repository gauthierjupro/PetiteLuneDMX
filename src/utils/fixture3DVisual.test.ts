import { describe, expect, it } from 'vitest';
import {
  fixture3DPoolRadiusM,
  inferFixture3DBeamStyle,
} from './fixture3DVisual';

describe('fixture3DVisual', () => {
  it('classifie lyre vs PAR vs flood vs barre', () => {
    expect(
      inferFixture3DBeamStyle({
        id: 1,
        name: 'Pico',
        manufacturer: 'X',
        model: 'Y',
        address: 1,
        channels: 9,
        type: 'Moving Head',
      })
    ).toBe('moving_spot');

    expect(
      inferFixture3DBeamStyle({
        id: 2,
        name: 'LED Flood Panel 150 [1]',
        manufacturer: 'Stairville',
        model: 'LED Flood Panel 150',
        address: 1,
        channels: 8,
        type: 'RGB',
      })
    ).toBe('flood');

    expect(
      inferFixture3DBeamStyle({
        id: 3,
        name: 'PARty',
        manufacturer: 'Eurolite',
        model: 'TCL',
        address: 1,
        channels: 5,
        type: 'RGB',
      })
    ).toBe('par_wash');

    expect(
      inferFixture3DBeamStyle({
        id: 4,
        name: 'Gigabar',
        manufacturer: 'Varytec',
        model: 'II',
        address: 1,
        channels: 5,
        type: 'RGB',
      })
    ).toBe('bar');
  });

  it('limite le pool au sol en grande hauteur', () => {
    const r = fixture3DPoolRadiusM('flood', 10, 18, 14);
    expect(r).toBeLessThanOrEqual(5.5);
    expect(r).toBeGreaterThan(2);
  });
});

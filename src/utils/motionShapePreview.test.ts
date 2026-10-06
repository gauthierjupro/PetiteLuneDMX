import { describe, expect, it } from 'vitest';
import { computeGroupMotionPreviewDots } from './motionShapePreview';

describe('motionShapePreview', () => {
  it('sépare les positions quand fan > 0 et 2 lyres', () => {
    const config = {
      shape: 'circle' as const,
      speed: 128,
      sizePan: 80,
      sizeTilt: 80,
      fan: 128,
      invert180: false,
    };
    const dots = computeGroupMotionPreviewDots(
      config,
      [
        { pan: 127, tilt: 127 },
        { pan: 127, tilt: 127 },
      ],
      2,
      1
    );
    expect(dots).toHaveLength(2);
    expect(dots[0].pan).not.toBe(dots[1].pan);
  });

  it('superpose les points si fan = 0', () => {
    const config = {
      shape: 'circle' as const,
      speed: 128,
      sizePan: 80,
      sizeTilt: 80,
      fan: 0,
      invert180: false,
    };
    const dots = computeGroupMotionPreviewDots(
      config,
      [
        { pan: 127, tilt: 127 },
        { pan: 127, tilt: 127 },
      ],
      2,
      0.5
    );
    expect(dots[0].pan).toBe(dots[1].pan);
    expect(dots[0].tilt).toBe(dots[1].tilt);
  });
});

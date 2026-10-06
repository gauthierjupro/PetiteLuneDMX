import { describe, expect, it } from 'vitest';
import { fadeStepCount, lerpByte, lerpRgb } from './ambiancePresetFade';

describe('ambiancePresetFade', () => {
  it('calcule les steps de fade', () => {
    expect(fadeStepCount(0)).toBe(1);
    expect(fadeStepCount(2, 50)).toBe(40);
  });

  it('interpole couleurs', () => {
    const mid = lerpRgb({ r: 0, g: 0, b: 0 }, { r: 100, g: 200, b: 50 }, 0.5);
    expect(lerpByte(0, 100, 0.5)).toBe(50);
    expect(mid.g).toBe(100);
  });
});

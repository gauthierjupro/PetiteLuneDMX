import { describe, expect, it } from 'vitest';
import { computeAudiencePlacements, AUDIENCE_MAX_INSTANCES } from './stageAudienceLayout';

describe('computeAudiencePlacements', () => {
  it('place des spectateurs face scène avec espacement humain', () => {
    const list = computeAudiencePlacements(40, 40, 40, -9);
    expect(list.length).toBeGreaterThan(10);
    expect(list.length).toBeLessThanOrEqual(AUDIENCE_MAX_INSTANCES);
    expect(list[0].rotationY).toBeGreaterThan(Math.PI - 0.5);
    expect(list[0].rotationY).toBeLessThan(Math.PI + 0.5);
  });

  it('retourne vide si pas de zone public', () => {
    expect(computeAudiencePlacements(10, 10, 5, 4)).toEqual([]);
  });
});

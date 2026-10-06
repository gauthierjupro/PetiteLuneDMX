import { describe, expect, it } from 'vitest';
import { normalizeFixedPositionDots } from './fixedPositionDotVisual';

describe('normalizeFixedPositionDots', () => {
  it('merges identical positions into one linked dot', () => {
    const out = normalizeFixedPositionDots([
      { pan: 100, tilt: 120 },
      { pan: 100, tilt: 120 },
    ]);
    expect(out.dots).toHaveLength(1);
    expect(out.useLinkedRedDot).toBe(true);
  });

  it('keeps separate dots when positions differ', () => {
    const out = normalizeFixedPositionDots([
      { pan: 10, tilt: 20 },
      { pan: 200, tilt: 40 },
    ]);
    expect(out.dots).toHaveLength(2);
    expect(out.useLinkedRedDot).toBe(false);
  });
});

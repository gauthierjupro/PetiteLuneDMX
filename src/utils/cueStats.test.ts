import { describe, expect, it } from 'vitest';
import { countNonZeroChannels } from './cueStats';

describe('countNonZeroChannels', () => {
  it('counts non-zero values', () => {
    expect(countNonZeroChannels([0, 1, 0, 255, 0])).toBe(2);
  });
});

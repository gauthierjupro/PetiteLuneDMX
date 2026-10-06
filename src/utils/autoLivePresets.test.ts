import { describe, expect, it } from 'vitest';
import { detectAutoLivePresetId, getAutoLivePreset } from './autoLivePresets';

describe('autoLivePresets', () => {
  it('détecte le preset club', () => {
    const opts = getAutoLivePreset('club').options;
    expect(detectAutoLivePresetId(opts)).toBe('club');
  });

  it('custom si option modifiée', () => {
    const opts = { ...getAutoLivePreset('acoustic').options, accents: true };
    expect(detectAutoLivePresetId(opts)).toBe('custom');
  });
});

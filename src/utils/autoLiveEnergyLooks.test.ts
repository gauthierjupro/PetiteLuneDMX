import { describe, expect, it } from 'vitest';
import { energyTierFromLevel, presetSlotForTier } from './autoLiveEnergyLooks';
import { DEFAULT_AUTO_LIVE_ENERGY_LOOKS } from '../types/autoLive';

describe('autoLiveEnergyLooks', () => {
  it('classifie calm / build / peak', () => {
    expect(energyTierFromLevel(0.2, 0.32, 0.68)).toBe('calm');
    expect(energyTierFromLevel(0.5, 0.32, 0.68)).toBe('build');
    expect(energyTierFromLevel(0.8, 0.32, 0.68)).toBe('peak');
  });

  it('mappe les slots preset', () => {
    expect(presetSlotForTier('peak', DEFAULT_AUTO_LIVE_ENERGY_LOOKS)).toBe('3');
  });
});

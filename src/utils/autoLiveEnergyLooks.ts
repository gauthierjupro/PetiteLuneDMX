import type { AmbiancePreset } from '../types';
import type { AutoLiveEnergyLooksConfig } from '../types/autoLive';

export type AutoLiveEnergyTier = 'calm' | 'build' | 'peak';

export function energyTierFromLevel(
  smoothed: number,
  lowThreshold: number,
  highThreshold: number
): AutoLiveEnergyTier {
  const low = Math.min(lowThreshold, highThreshold - 0.05);
  const high = Math.max(highThreshold, low + 0.05);
  if (smoothed < low) return 'calm';
  if (smoothed >= high) return 'peak';
  return 'build';
}

export function presetSlotForTier(
  tier: AutoLiveEnergyTier,
  config: AutoLiveEnergyLooksConfig
): string {
  if (tier === 'calm') return config.calmSlot.trim();
  if (tier === 'peak') return config.peakSlot.trim();
  return config.buildSlot.trim();
}

export function ambiancePresetHasData(
  customPresets: Record<string, AmbiancePreset>,
  slot: string
): boolean {
  if (!slot) return false;
  const preset = customPresets[slot];
  return Boolean(preset && Object.keys(preset.groupStates).length > 0);
}

export function clampEnergyThreshold(value: number): number {
  return Math.min(0.9, Math.max(0.08, Math.round(value * 100) / 100));
}

export function clampLookMinHoldMs(value: number): number {
  return Math.min(60000, Math.max(3000, Math.round(value / 1000) * 1000));
}

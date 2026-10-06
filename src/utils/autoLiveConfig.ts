import {
  DEFAULT_AUTO_LIVE_BAND_ROUTING,
  DEFAULT_AUTO_LIVE_ENERGY_LOOKS,
  DEFAULT_AUTO_LIVE_OPTIONS,
  DEFAULT_AUTO_LIVE_STATE,
  type AutoLiveBandRouting,
  type AutoLiveEnergyLooksConfig,
  type AutoLiveOptions,
  type AutoLivePauseBehavior,
  type AutoLivePresetId,
  type AutoLiveState,
} from '../types/autoLive';
import { clampEnergyThreshold, clampLookMinHoldMs } from './autoLiveEnergyLooks';
import { detectAutoLivePresetId } from './autoLivePresets';

const PRESET_IDS: AutoLivePresetId[] = ['standard', 'club', 'rock', 'acoustic'];

const STORAGE_KEY = 'dmx_auto_live';

const PAUSE_BEHAVIORS: AutoLivePauseBehavior[] = ['hold', 'fade', 'blackout', 'look'];

function clampBandWeight(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function mergeBandRouting(raw: Partial<AutoLiveBandRouting> | undefined): AutoLiveBandRouting {
  const base = DEFAULT_AUTO_LIVE_BAND_ROUTING;
  if (!raw || typeof raw !== 'object') return { ...base };
  return {
    masterBass: clampBandWeight(raw.masterBass ?? base.masterBass),
    masterMid: clampBandWeight(raw.masterMid ?? base.masterMid),
    masterHigh: clampBandWeight(raw.masterHigh ?? base.masterHigh),
    pulseUsesBass: raw.pulseUsesBass ?? base.pulseUsesBass,
    movementUsesMid: raw.movementUsesMid ?? base.movementUsesMid,
    colorUsesHigh: raw.colorUsesHigh ?? base.colorUsesHigh,
    accentsUseBassPeaks: raw.accentsUseBassPeaks ?? base.accentsUseBassPeaks,
  };
}

function mergeEnergyLooks(raw: Partial<AutoLiveEnergyLooksConfig> | undefined): AutoLiveEnergyLooksConfig {
  const base = DEFAULT_AUTO_LIVE_ENERGY_LOOKS;
  if (!raw || typeof raw !== 'object') return { ...base };
  return {
    enabled: raw.enabled ?? base.enabled,
    calmSlot: typeof raw.calmSlot === 'string' ? raw.calmSlot : base.calmSlot,
    buildSlot: typeof raw.buildSlot === 'string' ? raw.buildSlot : base.buildSlot,
    peakSlot: typeof raw.peakSlot === 'string' ? raw.peakSlot : base.peakSlot,
    lowThreshold: clampEnergyThreshold(raw.lowThreshold ?? base.lowThreshold),
    highThreshold: Math.max(
      clampEnergyThreshold(raw.highThreshold ?? base.highThreshold),
      clampEnergyThreshold(raw.lowThreshold ?? base.lowThreshold) + 0.08
    ),
    minHoldMs: clampLookMinHoldMs(raw.minHoldMs ?? base.minHoldMs),
    useFade: raw.useFade ?? base.useFade,
  };
}

function mergeOptions(raw: Partial<AutoLiveOptions> | undefined): AutoLiveOptions {
  const base = { ...DEFAULT_AUTO_LIVE_OPTIONS };
  if (!raw || typeof raw !== 'object') return base;
  const pause =
    raw.pauseBehavior && PAUSE_BEHAVIORS.includes(raw.pauseBehavior)
      ? raw.pauseBehavior
      : base.pauseBehavior;
  return {
    realtime: raw.realtime ?? base.realtime,
    followRhythm: raw.followRhythm ?? base.followRhythm,
    followEnergy: raw.followEnergy ?? base.followEnergy,
    risesAndDrops: raw.risesAndDrops ?? base.risesAndDrops,
    accents: raw.accents ?? base.accents,
    stayFresh: raw.stayFresh ?? base.stayFresh,
    autoColor: raw.autoColor ?? base.autoColor,
    pauseBehavior: pause,
    holdBetweenSongs: raw.holdBetweenSongs ?? base.holdBetweenSongs,
  };
}

export function loadAutoLiveState(): AutoLiveState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...DEFAULT_AUTO_LIVE_STATE };
    const parsed = JSON.parse(saved) as Partial<AutoLiveState>;
    const options = mergeOptions(parsed.options);
    const presetRaw = parsed.presetId;
    const presetId =
      presetRaw === 'custom'
        ? 'custom'
        : presetRaw && PRESET_IDS.includes(presetRaw as AutoLivePresetId)
          ? (presetRaw as AutoLivePresetId)
          : detectAutoLivePresetId(options);
    return {
      enabled: Boolean(parsed.enabled),
      options,
      presetId,
      energyLooks: mergeEnergyLooks(parsed.energyLooks),
      bandRouting: mergeBandRouting(parsed.bandRouting),
    };
  } catch {
    return { ...DEFAULT_AUTO_LIVE_STATE };
  }
}

export function saveAutoLiveState(state: AutoLiveState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const AUTO_LIVE_STORAGE_KEY = STORAGE_KEY;

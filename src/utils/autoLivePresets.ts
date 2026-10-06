import type { AutoLiveOptions, AutoLivePresetId } from '../types/autoLive';
import { DEFAULT_AUTO_LIVE_OPTIONS } from '../types/autoLive';

export interface AutoLivePresetDefinition {
  id: AutoLivePresetId;
  label: string;
  subtitle: string;
  options: AutoLiveOptions;
  /** Master DMX 0–255 appliqué à la sélection du preset. */
  suggestedMaster: number;
}

export const AUTO_LIVE_PRESETS: Record<AutoLivePresetId, AutoLivePresetDefinition> = {
  standard: {
    id: 'standard',
    label: 'Soirée standard',
    subtitle: 'Équilibre pulse, couleur et lyres',
    suggestedMaster: 220,
    options: { ...DEFAULT_AUTO_LIVE_OPTIONS },
  },
  club: {
    id: 'club',
    label: 'Club / DJ',
    subtitle: 'Énergie forte, accents, variations lyres',
    suggestedMaster: 255,
    options: {
      realtime: true,
      followRhythm: true,
      followEnergy: true,
      risesAndDrops: true,
      accents: true,
      stayFresh: true,
      autoColor: true,
      pauseBehavior: 'fade',
      holdBetweenSongs: true,
    },
  },
  rock: {
    id: 'rock',
    label: 'Rock live',
    subtitle: 'Pulse serré, montées/drops, pauses entre titres',
    suggestedMaster: 235,
    options: {
      realtime: true,
      followRhythm: true,
      followEnergy: true,
      risesAndDrops: true,
      accents: true,
      stayFresh: true,
      autoColor: true,
      pauseBehavior: 'hold',
      holdBetweenSongs: true,
    },
  },
  acoustic: {
    id: 'acoustic',
    label: 'Acoustique',
    subtitle: 'Master doux, peu de strobe, couleur lente',
    suggestedMaster: 165,
    options: {
      realtime: true,
      followRhythm: true,
      followEnergy: true,
      risesAndDrops: false,
      accents: false,
      stayFresh: false,
      autoColor: true,
      pauseBehavior: 'hold',
      holdBetweenSongs: true,
    },
  },
};

export const AUTO_LIVE_PRESET_ORDER: AutoLivePresetId[] = [
  'standard',
  'club',
  'rock',
  'acoustic',
];

export function getAutoLivePreset(id: AutoLivePresetId): AutoLivePresetDefinition {
  return AUTO_LIVE_PRESETS[id];
}

export function optionsMatchPreset(
  options: AutoLiveOptions,
  presetId: AutoLivePresetId
): boolean {
  const ref = AUTO_LIVE_PRESETS[presetId].options;
  return (Object.keys(ref) as (keyof AutoLiveOptions)[]).every((k) => ref[k] === options[k]);
}

export function detectAutoLivePresetId(options: AutoLiveOptions): AutoLivePresetId | 'custom' {
  for (const id of AUTO_LIVE_PRESET_ORDER) {
    if (optionsMatchPreset(options, id)) return id;
  }
  return 'custom';
}

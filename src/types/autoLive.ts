/** Comportement quand le signal audio est quasi absent (pause entre morceaux). */
export type AutoLivePauseBehavior = 'hold' | 'fade' | 'blackout' | 'look';

export type AutoLivePresetId = 'standard' | 'club' | 'rock' | 'acoustic';

export interface AutoLiveOptions {
  /** Analyse micro / ligne en direct (sans pré-analyse piste). */
  realtime: boolean;
  /** Pulse sur le BPM (sync audio + beat). */
  followRhythm: boolean;
  /** Master et intensités suivent le niveau global. */
  followEnergy: boolean;
  /** Réagit aux montées / chutes d’énergie (build / drop). */
  risesAndDrops: boolean;
  /** Flash / strobe bref sur les impacts (basses). */
  accents: boolean;
  /** Change périodiquement formes de mouvement et rythme des couleurs. */
  stayFresh: boolean;
  /** Active auto-couleur ambiance + groupes RGB / lyres. */
  autoColor: boolean;
  /** Comportement en silence prolongé. */
  pauseBehavior: AutoLivePauseBehavior;
  /** Entre deux morceaux : figer strobe / mouvements, garder le look. */
  holdBetweenSongs: boolean;
}

export const DEFAULT_AUTO_LIVE_OPTIONS: AutoLiveOptions = {
  realtime: true,
  followRhythm: true,
  followEnergy: true,
  risesAndDrops: true,
  accents: true,
  stayFresh: true,
  autoColor: true,
  pauseBehavior: 'hold',
  holdBetweenSongs: true,
};

/** Rappel des presets ambiance Live (1–8) selon l’énergie audio. */
export interface AutoLiveEnergyLooksConfig {
  enabled: boolean;
  /** Slots preset ambiance ("1"…"8", vide = ignoré). */
  calmSlot: string;
  buildSlot: string;
  peakSlot: string;
  /** Sous ce niveau lissé → calme. */
  lowThreshold: number;
  /** Au-dessus → peak. */
  highThreshold: number;
  /** Délai minimum entre deux rappels (ms). */
  minHoldMs: number;
  /** Utilise le fade ambiance Live (réglage Fade). */
  useFade: boolean;
}

/** Routage des bandes fréquence → rôles DMX (type console auto). */
export interface AutoLiveBandRouting {
  masterBass: number;
  masterMid: number;
  masterHigh: number;
  pulseUsesBass: boolean;
  movementUsesMid: boolean;
  colorUsesHigh: boolean;
  accentsUseBassPeaks: boolean;
}

export const DEFAULT_AUTO_LIVE_BAND_ROUTING: AutoLiveBandRouting = {
  masterBass: 48,
  masterMid: 34,
  masterHigh: 18,
  pulseUsesBass: true,
  movementUsesMid: true,
  colorUsesHigh: true,
  accentsUseBassPeaks: true,
};

export const DEFAULT_AUTO_LIVE_ENERGY_LOOKS: AutoLiveEnergyLooksConfig = {
  enabled: false,
  calmSlot: '1',
  buildSlot: '2',
  peakSlot: '3',
  lowThreshold: 0.32,
  highThreshold: 0.68,
  minHoldMs: 12000,
  useFade: true,
};

export interface AutoLiveState {
  enabled: boolean;
  options: AutoLiveOptions;
  presetId?: AutoLivePresetId | 'custom';
  energyLooks: AutoLiveEnergyLooksConfig;
  bandRouting: AutoLiveBandRouting;
}

export const DEFAULT_AUTO_LIVE_STATE: AutoLiveState = {
  enabled: false,
  options: DEFAULT_AUTO_LIVE_OPTIONS,
  presetId: 'standard',
  energyLooks: DEFAULT_AUTO_LIVE_ENERGY_LOOKS,
  bandRouting: DEFAULT_AUTO_LIVE_BAND_ROUTING,
};

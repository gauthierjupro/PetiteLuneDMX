import type { MovementShape } from '../types';

const FRESH_SHAPES: MovementShape[] = [
  'circle',
  'triangle',
  'diamond',
  'eight',
  'pan_sweep',
  'tilt_sweep',
];

/** Moyenne glissante simple. */
export function pushEnergySample(history: number[], value: number, maxLen = 12): number[] {
  const next = [...history, value];
  if (next.length > maxLen) next.shift();
  return next;
}

export function averageEnergy(history: number[]): number {
  if (history.length === 0) return 0;
  return history.reduce((a, b) => a + b, 0) / history.length;
}

/** Pente récente (derniers vs premiers échantillons). */
export function energyTrend(history: number[]): number {
  if (history.length < 4) return 0;
  const half = Math.floor(history.length / 2);
  const early = history.slice(0, half);
  const late = history.slice(-half);
  return averageEnergy(late) - averageEnergy(early);
}

export function isSilent(volume: number, threshold = 0.035): boolean {
  return volume < threshold;
}

/** Master cible 0–255 à partir du master utilisateur et du niveau lissé. */
export function energyMasterDimmer(baseMaster: number, smoothedLevel: number): number {
  const floor = 0.22;
  const scale = floor + (1 - floor) * Math.min(1, smoothedLevel * 1.12);
  return Math.round(Math.min(255, Math.max(0, baseMaster * scale)));
}

export function pickFreshShape(seed: number): MovementShape {
  const idx = Math.abs(seed) % FRESH_SHAPES.length;
  return FRESH_SHAPES[idx];
}

export function movementSpeedForEnergy(base: number, volume: number, trend: number): number {
  let speed = base;
  if (trend > 0.06) speed = Math.min(100, base + 25);
  if (trend < -0.08) speed = Math.max(15, base - 15);
  speed = Math.round(speed * (0.65 + volume * 0.5));
  return Math.min(100, Math.max(10, speed));
}

export interface BandWeightTriple {
  bass: number;
  mid: number;
  high: number;
}

/** Énergie « pro » avec poids normalisés (0–100 en entrée). */
export function weightedCompositeEnergy(
  bass: number,
  mid: number,
  high: number,
  weights: BandWeightTriple
): number {
  const sum = weights.bass + weights.mid + weights.high;
  if (sum <= 0) return Math.min(1, bass * 0.48 + mid * 0.34 + high * 0.18);
  return Math.min(
    1,
    (bass * weights.bass + mid * weights.mid + high * weights.high) / sum
  );
}

/** Énergie « pro » : basses = corps, médiums = mouvement, aiguës = détails. */
export function compositeEnergy(bass: number, mid: number, high: number): number {
  return weightedCompositeEnergy(bass, mid, high, { bass: 48, mid: 34, high: 18 });
}

export function beatPhaseFromClock(bpm: number, lastBeatMs: number, now = Date.now()): number {
  const beatMs = Math.max(250, (60 / Math.max(40, bpm)) * 1000);
  if (lastBeatMs <= 0) return (now % beatMs) / beatMs;
  return ((now - lastBeatMs) % beatMs) / beatMs;
}

/** Intensité pulse 0–1 : attaque sur le kick + décroissance beat. */
export function bassSyncedPulseFactor(bass: number, beatPhase: number): number {
  const decay = Math.pow(1 - Math.min(1, Math.max(0, beatPhase)), 1.65);
  const kick = 0.28 + Math.min(1, bass) * 0.72;
  return Math.min(1, decay * kick);
}

export function colorCycleMs(highBand: number): number {
  const ms = 28 - highBand * 18;
  return Math.min(40, Math.max(12, ms));
}

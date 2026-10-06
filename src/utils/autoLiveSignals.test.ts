import { describe, expect, it } from 'vitest';
import {
  averageEnergy,
  bassSyncedPulseFactor,
  compositeEnergy,
  weightedCompositeEnergy,
  energyMasterDimmer,
  energyTrend,
  isSilent,
  pickFreshShape,
  pushEnergySample,
} from './autoLiveSignals';

describe('autoLiveSignals', () => {
  it('pushEnergySample limite la taille', () => {
    let h: number[] = [];
    for (let i = 0; i < 20; i++) h = pushEnergySample(h, i / 20, 5);
    expect(h).toHaveLength(5);
    expect(h[4]).toBeCloseTo(0.95);
  });

  it('energyTrend détecte une montée', () => {
    const up = [0.1, 0.12, 0.15, 0.2, 0.25, 0.35, 0.4, 0.45];
    expect(energyTrend(up)).toBeGreaterThan(0.05);
  });

  it('isSilent sous le seuil', () => {
    expect(isSilent(0.02)).toBe(true);
    expect(isSilent(0.2)).toBe(false);
  });

  it('energyMasterDimmer scale avec le volume', () => {
    const low = energyMasterDimmer(255, 0);
    const high = energyMasterDimmer(255, 1);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(255);
  });

  it('pickFreshShape reste dans la liste connue', () => {
    expect(['circle', 'eight', 'pan_sweep', 'tilt_sweep']).toContain(pickFreshShape(42));
  });

  it('averageEnergy vide', () => {
    expect(averageEnergy([])).toBe(0);
  });

  it('compositeEnergy favorise les basses', () => {
    expect(compositeEnergy(1, 0, 0)).toBeGreaterThan(compositeEnergy(0, 0, 1));
  });

  it('weightedCompositeEnergy normalise les poids', () => {
    const v = weightedCompositeEnergy(1, 0, 0, { bass: 100, mid: 0, high: 0 });
    expect(v).toBeCloseTo(1, 2);
  });

  it('bassSyncedPulseFactor chute après le beat', () => {
    expect(bassSyncedPulseFactor(0.8, 0.05)).toBeGreaterThan(bassSyncedPulseFactor(0.8, 0.85));
  });
});

import { describe, expect, it } from 'vitest';
import {
  createDefaultLandmarks,
  isLegacyDefaultMusicianLandmarkSet,
  stripMusicianNamedLandmarks,
} from './stageLandmarks';

describe('isLegacyDefaultMusicianLandmarkSet', () => {
  it('détecte le jeu par défaut musiciens', () => {
    expect(isLegacyDefaultMusicianLandmarkSet(createDefaultLandmarks())).toBe(true);
  });

  it('ignore les repères perso', () => {
    expect(
      isLegacyDefaultMusicianLandmarkSet([{ id: 'x', name: 'Cible lyre', x: 10, y: 10 }])
    ).toBe(false);
  });
});

describe('stripMusicianNamedLandmarks', () => {
  it('retire les noms musiciens, garde les cibles perso', () => {
    const out = stripMusicianNamedLandmarks([
      ...createDefaultLandmarks(),
      { id: 'c1', name: 'Centre public', x: 50, y: 90 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe('Centre public');
  });
});

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAGE_DECK_COLOR,
  normalizeStageDeckColor,
  stageDeckPlanFillRgba,
} from './stageDeckColor';

describe('stageDeckColor', () => {
  it('normalise les hex', () => {
    expect(normalizeStageDeckColor('AABBCC')).toBe('#aabbcc');
    expect(normalizeStageDeckColor('#FF0000')).toBe('#ff0000');
    expect(normalizeStageDeckColor('bad')).toBe(DEFAULT_STAGE_DECK_COLOR);
  });

  it('produit un rgba pour le plan', () => {
    expect(stageDeckPlanFillRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });
});

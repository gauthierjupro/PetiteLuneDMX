import { describe, expect, it } from 'vitest';
import {
  getQuickMovementPreset,
  movementShapeLabel,
  QUICK_MOVEMENT_PRESETS,
} from './movementQuickPresets';

describe('movementQuickPresets', () => {
  it('returns a copy for each preset id', () => {
    for (const p of QUICK_MOVEMENT_PRESETS) {
      const m = getQuickMovementPreset(p.id);
      expect(m.shape).toBe(p.movement.shape);
      expect(m).not.toBe(p.movement);
    }
  });

  it('labels common shapes', () => {
    expect(movementShapeLabel('none')).toBe('Fixe');
    expect(movementShapeLabel('circle')).toBe('Cercle');
    expect(movementShapeLabel('square')).toBe('Carré');
    expect(movementShapeLabel('pan_sweep')).toBe('Scan ↔');
  });

  it('has square and rectangle presets without circle doux', () => {
    const ids = QUICK_MOVEMENT_PRESETS.map((p) => p.id);
    expect(ids).toContain('square');
    expect(ids).toContain('rectangle');
    expect(ids).not.toContain('circle_soft');
  });
});

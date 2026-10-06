import { describe, expect, it } from 'vitest';
import {
  buildQuickMovementResetForButton,
  buildQuickMovementSaveForButton,
  resolveQuickMovementApply,
} from './movementQuickSaves';

describe('movementQuickSaves', () => {
  it('garde la forme du bouton à la mémorisation', () => {
    const saved = buildQuickMovementSaveForButton(
      'square',
      {
        shape: 'pan_sweep',
        speed: 90,
        sizePan: 100,
        sizeTilt: 40,
        fan: 64,
        invert180: true,
      },
      200,
      80
    );
    expect(saved.movement.shape).toBe('square');
    expect(saved.movement.speed).toBe(90);
    expect(saved.centerPan).toBe(200);
  });

  it('restaure centre pan/tilt mémorisé', () => {
    const saved = buildQuickMovementSaveForButton(
      'scan_pan',
      {
        shape: 'circle',
        speed: 90,
        sizePan: 100,
        sizeTilt: 40,
        fan: 64,
        invert180: true,
      },
      200,
      80
    );
    const applied = resolveQuickMovementApply('scan_pan', saved);
    expect(applied.movement.shape).toBe('pan_sweep');
    expect(applied.centerPan).toBe(200);
    expect(applied.centerTilt).toBe(80);
    expect(applied.movement.invert180).toBe(true);
  });

  it('réinitialise avec forme du bouton et réglages usine', () => {
    const applied = buildQuickMovementResetForButton('circle_wide');
    expect(applied.movement.shape).toBe('circle');
    expect(applied.movement.speed).toBe(128);
    expect(applied.movement.sizePan).toBe(128);
    expect(applied.movement.sizeTilt).toBe(128);
    expect(applied.movement.fan).toBe(0);
    expect(applied.movement.invert180).toBe(false);
    expect(applied.centerPan).toBe(127);
    expect(applied.centerTilt).toBe(127);
  });
});

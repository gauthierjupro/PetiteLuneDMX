import { describe, expect, it } from 'vitest';
import {
  movementPresetFromConfig,
  movementPresetHasData,
  defaultMovementPresets,
} from './movementPresetStorage';

describe('movementPresetStorage', () => {
  it('détecte un preset non vide', () => {
    expect(movementPresetHasData(defaultMovementPresets()[0])).toBe(false);
    expect(
      movementPresetHasData(
        movementPresetFromConfig(
          {
            shape: 'circle',
            speed: 100,
            sizePan: 80,
            sizeTilt: 80,
            fan: 32,
            invert180: false,
          },
          'MVT 1'
        )
      )
    ).toBe(true);
  });
});

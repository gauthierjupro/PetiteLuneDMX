import { describe, expect, it } from 'vitest';
import { DEFAULT_STAGE_DECOR } from './stageDecorSettings';
import {
  stagePositionToWorld3D,
  stageSceneElementToWorld3D,
  world3DToStagePosition,
  world3DToStageSceneElementPosition,
} from './stageWorld';
import { stageDeckBounds } from './stageDecorSettings';

describe('stageWorld', () => {
  it('roundtrips plan position with room bounds', () => {
    const decor = DEFAULT_STAGE_DECOR;
    const pos = { id: 1, x: 60, y: 40, z: 50 };
    const [x, y, z] = stagePositionToWorld3D(pos, decor);
    const back = world3DToStagePosition(x, y, z, decor);
    expect(back.x).toBe(60);
    expect(back.y).toBe(40);
    expect(back.z).toBe(50);
  });

  it('roundtrips scene element floor position', () => {
    const decor = DEFAULT_STAGE_DECOR;
    const el = { kind: 'guitarist' as const, x: 55, y: 35, z: 20 };
    const [x, y, z] = stageSceneElementToWorld3D(el, decor);
    const back = world3DToStageSceneElementPosition(x, y, z, el.kind, decor);
    expect(back.x).toBeCloseTo(55, 5);
    expect(back.y).toBeCloseTo(35, 5);
    expect(back.z).toBeCloseTo(20, 5);
  });

  it('place les musiciens sur le plateau (pas en hauteur truss)', () => {
    const decor = DEFAULT_STAGE_DECOR;
    const deckTop = stageDeckBounds(decor).elevation;
    const [, yMusician] = stageSceneElementToWorld3D(
      { kind: 'vocalist', x: 50, y: 40, z: 0 },
      decor
    );
    const [, yFixture] = stagePositionToWorld3D({ id: 1, x: 50, y: 40, z: 50 }, decor);
    expect(yMusician).toBeCloseTo(deckTop, 5);
    expect(yFixture).toBeGreaterThan(yMusician + 1);
  });

  it('maps plan corners to wall corners', () => {
    const decor = DEFAULT_STAGE_DECOR;
    const [x0, , z0] = stagePositionToWorld3D({ id: 1, x: 0, y: 0, z: 0 }, decor);
    const [x1, , z1] = stagePositionToWorld3D({ id: 1, x: 100, y: 100, z: 0 }, decor);
    expect(x0).toBeCloseTo(-decor.leftWallPos, 5);
    expect(z0).toBeCloseTo(-decor.backWallPos, 5);
    expect(x1).toBeCloseTo(decor.rightWallPos, 5);
    expect(z1).toBeCloseTo(decor.frontWallPos, 5);
  });
});

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAGE_DECOR,
  clampAudienceOffsetM,
  clampStagePlatformWidthM,
  setStageRoomDimensions,
  stageAudienceStartPlanY,
  stageDeckBounds,
  stagePlanDistributeBounds,
  stagePublicBoundaryPlanY,
  stageRoomDimensionsMeters,
} from './stageDecorSettings';

describe('setStageRoomDimensions', () => {
  it('répartit largeur et profondeur symétriquement sur les murs', () => {
    const next = setStageRoomDimensions(DEFAULT_STAGE_DECOR, 20, 30);
    expect(next.leftWallPos).toBe(10);
    expect(next.rightWallPos).toBe(10);
    expect(next.backWallPos).toBe(15);
    expect(next.frontWallPos).toBe(15);
    expect(stageRoomDimensionsMeters(next)).toEqual({ widthM: 20, depthM: 30 });
  });

  it('borne les valeurs minimales', () => {
    const next = setStageRoomDimensions(DEFAULT_STAGE_DECOR, 2, 2);
    expect(stageRoomDimensionsMeters(next).widthM).toBeGreaterThanOrEqual(6);
    expect(stageRoomDimensionsMeters(next).depthM).toBeGreaterThanOrEqual(6);
  });

  it('stagePlanDistributeBounds stage is inside room', () => {
    const room = stagePlanDistributeBounds(DEFAULT_STAGE_DECOR, 'room');
    const stage = stagePlanDistributeBounds(DEFAULT_STAGE_DECOR, 'stage');
    expect(room).toEqual({ xMin: 0, xMax: 100, yMin: 0, yMax: 100 });
    expect(stage.xMin).toBeGreaterThanOrEqual(0);
    expect(stage.xMax).toBeLessThanOrEqual(100);
    expect(stage.yMax).toBeLessThanOrEqual(100);
    expect(stage.xMax - stage.xMin).toBeLessThanOrEqual(room.xMax - room.xMin);
  });

  it('recul public décale le début foule sur le plan', () => {
    const room = setStageRoomDimensions(DEFAULT_STAGE_DECOR, 12, 15);
    const decor = {
      ...room,
      stageDepthM: 6,
      stageWidthM: 10,
      audienceOffsetM: 3,
    };
    const stageY = stagePublicBoundaryPlanY(decor);
    const crowdY = stageAudienceStartPlanY(decor);
    expect(crowdY).toBeGreaterThan(stageY);
    expect(clampAudienceOffsetM(99, decor)).toBeLessThanOrEqual(15 - 6 - 2);
  });

  it('réduit la largeur scène si la salle rétrécit', () => {
    const room = setStageRoomDimensions(DEFAULT_STAGE_DECOR, 20, 30);
    const narrow = setStageRoomDimensions({ ...room, stageWidthM: 18 }, 12, 30);
    expect(narrow.stageWidthM).toBeLessThanOrEqual(12);
    const deck = stageDeckBounds(narrow);
    expect(deck.width).toBe(narrow.stageWidthM);
    expect(clampStagePlatformWidthM(99, narrow)).toBe(12);
  });
});

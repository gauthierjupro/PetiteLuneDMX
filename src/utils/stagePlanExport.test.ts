import { describe, expect, it } from 'vitest';
import { buildStagePlanSvg } from './stagePlanExport';

describe('buildStagePlanSvg', () => {
  it('includes legend and orientation labels', () => {
    const svg = buildStagePlanSvg({
      roomWidthM: 20,
      roomDepthM: 30,
      stageWidthM: 16,
      stageDepthM: 12,
      publicDepthM: 18,
      stageInsetLeftPct: 10,
      stageInsetRightPct: 10,
      stagePublicBoundaryY: 40,
      fixtures: [
        {
          id: 1,
          name: 'Spot A',
          manufacturer: 'X',
          model: 'Y',
          address: 1,
          channels: 6,
          type: 'RGB',
        },
      ],
      positions: [{ id: 1, x: 50, y: 50 }],
      sceneElements: [],
    });
    expect(svg).toContain('Plan de feu');
    expect(svg).toContain('STAGE RIGHT');
    expect(svg).toContain('Spot A');
    expect(svg).toContain('VUE PUBLIC');
  });
});

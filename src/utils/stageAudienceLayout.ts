/** Espacement typique fosse / gradins (m). */
export const AUDIENCE_COL_SPACING_M = 0.52;
export const AUDIENCE_ROW_SPACING_M = 0.68;
export const AUDIENCE_MAX_INSTANCES = 120;

export interface AudiencePlacement {
  x: number;
  z: number;
  /** Rotation Y (rad) — face à la scène. */
  rotationY: number;
}

/**
 * Grille de spectateurs dans la zone public (monde 3D).
 * Origine des silhouettes : pieds au sol (y = 0).
 */
export function computeAudiencePlacements(
  roomHalfWidthL: number,
  roomHalfWidthR: number,
  frontWallZ: number,
  /** Monde Z — début foule (bord scène + recul). */
  audienceStartZ: number
): AudiencePlacement[] {
  const startZ = audienceStartZ + 0.4;
  const endZ = frontWallZ - 0.85;
  if (endZ <= startZ + 0.5) return [];

  const audienceWidth = (roomHalfWidthL + roomHalfWidthR) * 0.9;
  const audienceDepth = endZ - startZ;
  const marginX = (roomHalfWidthL + roomHalfWidthR - audienceWidth) / 2;

  let cols = Math.max(4, Math.floor(audienceWidth / AUDIENCE_COL_SPACING_M));
  let rows = Math.max(2, Math.floor(audienceDepth / AUDIENCE_ROW_SPACING_M));

  while (rows * cols > AUDIENCE_MAX_INSTANCES) {
    if (cols > rows) cols -= 1;
    else rows -= 1;
    if (cols < 4 || rows < 2) break;
  }

  const placements: AudiencePlacement[] = [];
  const xMin = -roomHalfWidthL + marginX;
  const xSpan = audienceWidth;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tX = cols <= 1 ? 0.5 : c / (cols - 1);
      const tZ = rows <= 1 ? 0.5 : r / (rows - 1);
      const jitterSeed = r * 17 + c * 31;
      const jx = ((jitterSeed % 5) - 2) * 0.06;
      const jz = (((jitterSeed * 3) % 5) - 2) * 0.05;
      const x = xMin + tX * xSpan + jx;
      const z = startZ + tZ * audienceDepth + jz;
      const towardStage = Math.PI + (c - cols / 2) * 0.04 + ((r % 3) - 1) * 0.03;
      placements.push({ x, z, rotationY: towardStage });
    }
  }

  return placements;
}

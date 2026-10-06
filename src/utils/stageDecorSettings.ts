import { DEFAULT_STAGE_DECK_COLOR, normalizeStageDeckColor } from './stageDeckColor';

export interface StageDecorSettings {
  showFloor: boolean;
  showWalls: boolean;
  /** Mur côté public (devant la foule), indépendant des autres murs. */
  showPublicWall: boolean;
  showCeiling: boolean;
  showTruss: boolean;
  /** Plateforme / estrade au fond. */
  showStageDeck: boolean;
  showSpeakers: boolean;
  showDjBooth: boolean;
  /** Foule côté public (silhouettes). */
  showAudience: boolean;
  /** Chanteur, guitare, basse, batterie, claviers sur l’estrade. */
  showBandMusicians: boolean;
  /** Densité brouillard atmosphérique (0–100). */
  fogDensity: number;
  backWallPos: number;
  leftWallPos: number;
  rightWallPos: number;
  frontWallPos: number;
  /** Hauteur des murs (m). */
  roomHeight: number;
  /** Hauteur du plateau scène au-dessus du sol public (m). */
  stageElevationM: number;
  /** Profondeur de la scène depuis le fond (m) — jusqu’à la limite public. */
  stageDepthM: number;
  /** Largeur du plateau scène (m), centrée dans la salle — ≤ largeur salle. */
  stageWidthM: number;
  /** Couleur du plateau scène (#RRGGBB). */
  stageDeckColor: string;
  /** Recul du public depuis le bord avant scène (m) — fosse / allée. */
  audienceOffsetM: number;
}

export const STAGE_DECOR_KEY = 'stage_decor_settings';

const STAGE_MIN_PLATFORM_M = 2;
const STAGE_MIN_PUBLIC_M = 2;

export const DEFAULT_STAGE_DECOR: StageDecorSettings = {
  showFloor: true,
  showWalls: true,
  showPublicWall: true,
  showCeiling: false,
  showTruss: false,
  showStageDeck: true,
  showSpeakers: true,
  showDjBooth: true,
  showAudience: true,
  showBandMusicians: true,
  fogDensity: 35,
  backWallPos: 25,
  leftWallPos: 40,
  rightWallPos: 40,
  frontWallPos: 40,
  roomHeight: 14,
  stageElevationM: 0.4,
  stageDepthM: 48,
  stageWidthM: 80,
  stageDeckColor: DEFAULT_STAGE_DECK_COLOR,
  audienceOffsetM: 1,
};

export function stageRoomBounds(decor: StageDecorSettings) {
  const L = decor.leftWallPos;
  const R = decor.rightWallPos;
  const back = decor.backWallPos;
  const front = decor.frontWallPos;
  return {
    L,
    R,
    back,
    front,
    width: L + R,
    depth: back + front,
    centerX: (R - L) / 2,
    centerZ: (front - back) / 2,
    height: decor.roomHeight ?? DEFAULT_STAGE_DECOR.roomHeight,
  };
}

export function stageDecorSettingsEqual(
  a: StageDecorSettings,
  b: StageDecorSettings
): boolean {
  return (
    a.showFloor === b.showFloor &&
    a.showWalls === b.showWalls &&
    a.showPublicWall === b.showPublicWall &&
    a.showCeiling === b.showCeiling &&
    a.showTruss === b.showTruss &&
    a.showStageDeck === b.showStageDeck &&
    a.showSpeakers === b.showSpeakers &&
    a.showDjBooth === b.showDjBooth &&
    a.showAudience === b.showAudience &&
    a.showBandMusicians === b.showBandMusicians &&
    a.fogDensity === b.fogDensity &&
    a.backWallPos === b.backWallPos &&
    a.leftWallPos === b.leftWallPos &&
    a.rightWallPos === b.rightWallPos &&
    a.frontWallPos === b.frontWallPos &&
    a.roomHeight === b.roomHeight &&
    a.stageElevationM === b.stageElevationM &&
    a.stageDepthM === b.stageDepthM &&
    a.stageWidthM === b.stageWidthM &&
    a.stageDeckColor === b.stageDeckColor &&
    a.audienceOffsetM === b.audienceOffsetM
  );
}

export function clampStageElevationM(m: number): number {
  if (!Number.isFinite(m)) return DEFAULT_STAGE_DECOR.stageElevationM;
  return Math.min(3, Math.max(0, m));
}

export function clampRoomHeightM(m: number): number {
  if (!Number.isFinite(m)) return DEFAULT_STAGE_DECOR.roomHeight;
  return Math.min(24, Math.max(3, m));
}

export function defaultStageDepthM(decor: StageDecorSettings): number {
  const b = stageRoomBounds(decor);
  return clampStagePlatformDepthM(b.depth * 0.75, decor);
}

/** Profondeur du plateau scène depuis le mur fond (m). */
export function clampStagePlatformDepthM(depthM: number, decor: StageDecorSettings): number {
  if (!Number.isFinite(depthM)) return defaultStageDepthM(decor);
  const b = stageRoomBounds(decor);
  const max = Math.max(STAGE_MIN_PLATFORM_M, b.depth - STAGE_MIN_PUBLIC_M);
  return Math.min(max, Math.max(STAGE_MIN_PLATFORM_M, depthM));
}

export function defaultStageWidthM(decor: StageDecorSettings): number {
  return stageRoomBounds(decor).width;
}

/** Largeur du plateau scène (m), centrée dans la salle. */
export function clampStagePlatformWidthM(widthM: number, decor: StageDecorSettings): number {
  if (!Number.isFinite(widthM)) return defaultStageWidthM(decor);
  const b = stageRoomBounds(decor);
  const max = Math.max(STAGE_MIN_PLATFORM_M, b.width);
  return Math.min(max, Math.max(STAGE_MIN_PLATFORM_M, widthM));
}

/** Plateau scène (3D) = du fond sur stageDepthM ; au-delà = sol public jusqu’au mur public. */
export function stageDeckBounds(decor: StageDecorSettings) {
  const b = stageRoomBounds(decor);
  const zBack = -b.back;
  const stageDepth = clampStagePlatformDepthM(decor.stageDepthM, decor);
  const stageWidth = clampStagePlatformWidthM(decor.stageWidthM, decor);
  const stageEndZ = zBack + stageDepth;
  const halfW = stageWidth / 2;
  return {
    width: stageWidth,
    depth: stageDepth,
    centerX: b.centerX,
    centerZ: zBack + stageDepth / 2,
    minX: b.centerX - halfW,
    maxX: b.centerX + halfW,
    elevation: clampStageElevationM(decor.stageElevationM),
    /** Limite scène / zone public (monde Z). */
    stageEndZ,
    /** Début foule (monde Z), après recul public. */
    audienceStartZ: stageEndZ + clampAudienceOffsetM(decor.audienceOffsetM, decor),
  };
}

export function isPointOnStageDeck(
  x: number,
  z: number,
  decor: StageDecorSettings
): boolean {
  const deck = stageDeckBounds(decor);
  const b = stageRoomBounds(decor);
  const zBack = -b.back;
  if (z < zBack - 0.01 || z > deck.stageEndZ + 0.01) return false;
  return x >= deck.minX - 0.01 && x <= deck.maxX + 0.01;
}

/** Rectangle scène sur le plan 2D (%), aligné avec le plateau 3D. */
export function isPointOnStageDeckPlan(
  xPct: number,
  yPct: number,
  decor: StageDecorSettings
): boolean {
  const insets = stageDeckPlanInsetsPercent(decor);
  const yMax = stagePublicBoundaryPlanY(decor);
  return (
    xPct >= insets.left - 0.01 &&
    xPct <= 100 - insets.right + 0.01 &&
    yPct >= -0.01 &&
    yPct <= yMax + 0.01
  );
}

/** Hauteur du sol (m) pour un point plan — estrade ou sol public. */
export function stageFloorHeightForPlanPoint(
  xPct: number,
  yPct: number,
  decor: StageDecorSettings
): number {
  if (isPointOnStageDeckPlan(xPct, yPct, decor)) {
    return stageDeckBounds(decor).elevation;
  }
  return 0;
}

/** Marges gauche/droite (%) pour le rectangle scène sur le plan 2D. */
export function stageDeckPlanInsetsPercent(decor: StageDecorSettings): {
  left: number;
  right: number;
} {
  const roomW = stageRoomBounds(decor).width;
  const deckW = stageDeckBounds(decor).width;
  if (roomW <= 0) return { left: 0, right: 0 };
  const margin = Math.max(0, (roomW - deckW) / 2);
  const inset = (margin / roomW) * 100;
  return { left: inset, right: inset };
}

export function stagePlatformSizeM(decor: StageDecorSettings): {
  widthM: number;
  depthM: number;
} {
  const deck = stageDeckBounds(decor);
  return { widthM: deck.width, depthM: deck.depth };
}

/** Profondeur zone public (sol) devant la scène, dans la salle (m). */
export function stagePublicDepthM(decor: StageDecorSettings): number {
  const b = stageRoomBounds(decor);
  const stageDepth = clampStagePlatformDepthM(decor.stageDepthM, decor);
  return Math.max(0, b.depth - stageDepth);
}

const AUDIENCE_MIN_ZONE_M = 2;

/** Recul public (m) depuis le bord scène, borné à la profondeur public disponible. */
export function clampAudienceOffsetM(offsetM: number, decor: StageDecorSettings): number {
  if (!Number.isFinite(offsetM)) return DEFAULT_STAGE_DECOR.audienceOffsetM;
  const publicDepth = stagePublicDepthM(decor);
  const max = Math.max(0, publicDepth - AUDIENCE_MIN_ZONE_M);
  return Math.min(max, Math.max(0, offsetM));
}

/** Monde Z où commence la zone foule (après recul). */
export function stageAudienceStartWorldZ(decor: StageDecorSettings): number {
  const b = stageRoomBounds(decor);
  const zBack = -b.back;
  const stageDepth = clampStagePlatformDepthM(decor.stageDepthM, decor);
  const stageEndZ = zBack + stageDepth;
  return stageEndZ + clampAudienceOffsetM(decor.audienceOffsetM, decor);
}

/** Plan 2D (% Y) — début de la foule (0 = fond, 100 = mur public). */
export function stageAudienceStartPlanY(decor: StageDecorSettings): number {
  const b = stageRoomBounds(decor);
  if (b.depth <= 0) return 100;
  const z = stageAudienceStartWorldZ(decor);
  return Math.min(100, Math.max(0, ((z + b.back) / b.depth) * 100));
}

/** Zone % du plan 2D pour espacer sur toute la salle ou le plateau scène. */
export function stagePlanDistributeBounds(
  decor: StageDecorSettings,
  scope: 'room' | 'stage'
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  if (scope === 'room') {
    return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
  }
  const insets = stageDeckPlanInsetsPercent(decor);
  const yMax = Math.min(100, Math.max(1, stagePublicBoundaryPlanY(decor)));
  return {
    xMin: insets.left,
    xMax: Math.max(insets.left + 1, 100 - insets.right),
    yMin: 0,
    yMax,
  };
}

/** Position Y % sur le plan 2D de la limite scène / public (0 = fond, 100 = mur public). */
export function stagePublicBoundaryPlanY(decor: StageDecorSettings): number {
  const b = stageRoomBounds(decor);
  if (b.depth <= 0) return 100;
  const deck = stageDeckBounds(decor);
  return Math.min(100, Math.max(0, ((deck.stageEndZ + b.back) / b.depth) * 100));
}

/** @deprecated */
export const stageAudienceBoundaryPlanY = stagePublicBoundaryPlanY;

type LegacyDecor = StageDecorSettings & { stageAudienceDepthM?: number };

function normalizeLoadedDecor(parsed: LegacyDecor): StageDecorSettings {
  const merged: LegacyDecor = { ...DEFAULT_STAGE_DECOR, ...parsed };
  let stageDepthM = merged.stageDepthM;
  if (!Number.isFinite(stageDepthM) && Number.isFinite(merged.stageAudienceDepthM)) {
    const b = stageRoomBounds(merged);
    stageDepthM = b.depth - merged.stageAudienceDepthM!;
  }
  const decor: StageDecorSettings = {
    showFloor: merged.showFloor,
    showWalls: merged.showWalls,
    showPublicWall:
      merged.showPublicWall !== undefined
        ? merged.showPublicWall
        : merged.showWalls !== false,
    showCeiling: merged.showCeiling,
    showTruss: false,
    showStageDeck: merged.showStageDeck,
    showSpeakers: merged.showSpeakers,
    showDjBooth: merged.showDjBooth,
    showAudience: merged.showAudience,
    showBandMusicians: merged.showBandMusicians,
    fogDensity: merged.fogDensity,
    backWallPos: merged.backWallPos,
    leftWallPos: merged.leftWallPos,
    rightWallPos: merged.rightWallPos,
    frontWallPos: merged.frontWallPos,
    roomHeight: merged.roomHeight,
    stageElevationM: merged.stageElevationM,
    stageDepthM: clampStagePlatformDepthM(stageDepthM ?? defaultStageDepthM(merged), merged),
    stageWidthM: clampStagePlatformWidthM(
      Number.isFinite(merged.stageWidthM)
        ? merged.stageWidthM
        : defaultStageWidthM(merged),
      merged
    ),
    stageDeckColor: normalizeStageDeckColor(merged.stageDeckColor),
    audienceOffsetM: DEFAULT_STAGE_DECOR.audienceOffsetM,
  };
  decor.audienceOffsetM = clampAudienceOffsetM(
    Number.isFinite(merged.audienceOffsetM)
      ? merged.audienceOffsetM
      : DEFAULT_STAGE_DECOR.audienceOffsetM,
    decor
  );
  return decor;
}

export function loadStageDecorSettings(): StageDecorSettings {
  try {
    const saved = localStorage.getItem(STAGE_DECOR_KEY);
    if (!saved) return { ...DEFAULT_STAGE_DECOR };
    return normalizeLoadedDecor(JSON.parse(saved) as LegacyDecor);
  } catch {
    return { ...DEFAULT_STAGE_DECOR };
  }
}

/** Dimensions approximatives de la salle (m) d’après les murs 3D. */
export function stageRoomDimensionsMeters(decor: StageDecorSettings): {
  widthM: number;
  depthM: number;
} {
  return {
    widthM: decor.leftWallPos + decor.rightWallPos,
    depthM: decor.backWallPos + decor.frontWallPos,
  };
}

const STAGE_MIN_WIDTH_M = 6;
const STAGE_MAX_WIDTH_M = 120;
const STAGE_MIN_DEPTH_M = 6;
const STAGE_MAX_DEPTH_M = 120;

export function clampStageWidthM(widthM: number): number {
  if (!Number.isFinite(widthM)) return STAGE_MIN_WIDTH_M;
  return Math.min(STAGE_MAX_WIDTH_M, Math.max(STAGE_MIN_WIDTH_M, widthM));
}

export function clampStageDepthM(depthM: number): number {
  if (!Number.isFinite(depthM)) return STAGE_MIN_DEPTH_M;
  return Math.min(STAGE_MAX_DEPTH_M, Math.max(STAGE_MIN_DEPTH_M, depthM));
}

/** Largeur / profondeur totales (m) → murs symétriques (plan 2D + salle 3D). */
export function setStageRoomDimensions(
  decor: StageDecorSettings,
  widthM: number,
  depthM: number
): StageDecorSettings {
  const w = clampStageWidthM(widthM);
  const d = clampStageDepthM(depthM);
  const next = {
    ...decor,
    leftWallPos: w / 2,
    rightWallPos: w / 2,
    backWallPos: d / 2,
    frontWallPos: d / 2,
  };
  return {
    ...next,
    stageDepthM: clampStagePlatformDepthM(next.stageDepthM, next),
    stageWidthM: clampStagePlatformWidthM(next.stageWidthM, next),
    audienceOffsetM: clampAudienceOffsetM(next.audienceOffsetM, next),
  };
}

export function saveStageDecorSettings(settings: StageDecorSettings): void {
  localStorage.setItem(STAGE_DECOR_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('pldmx:stage_decor'));
}

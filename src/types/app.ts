export type TabType =
  | 'live'
  | 'autoLive'
  | 'patch'
  | 'stage'
  | 'stage3d'
  | 'editor'
  | 'settings';

/** Type métier d'un projecteur (profil / patch). */
export type FixtureKind = 'RGB' | 'Moving Head' | 'Laser' | 'Effect' | 'Other' | (string & {});

export interface CalibrationSettings {
  invertPan: boolean;
  invertTilt: boolean;
  offsetPan: number;
  offsetTilt: number;
}

/** Univers DMX par défaut (extension multi-univers : P2-05). */
export const DEFAULT_DMX_UNIVERSE_ID = 1;

export interface Fixture {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  address: number;
  channels: number;
  type: FixtureKind;
  /** Profil librairie d’origine (photo / canaux). */
  profileId?: string;
  /** Univers DMX (1 = 512 canaux actuels). */
  universeId?: number;
  /** Labels optionnels par canal (onglet Projecteurs). */
  channelMap?: string[];
}

export interface Group {
  id: string;
  name: string;
  fixtureIds: number[];
  /** Colonne Ambiances du Live. */
  isAmbiance?: boolean;
  /** Colonne Mouvements du Live (lyres, scans, lasers…). */
  isMovement?: boolean;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  v?: number;
}

export interface GroupIntensity {
  dim: number;
  str: number;
}

export type FixtureControlAction = 'dimmer' | 'color' | 'strobe' | 'pan' | 'tilt';
export type GroupControlAction = 'dimmer' | 'color' | 'strobe';

export type MovementShape =
  | 'none'
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'eight'
  | 'pan_sweep'
  | 'tilt_sweep'
  | 'custom';

export interface Point2D {
  x: number;
  y: number;
}

export interface GroupMovement {
  shape: MovementShape;
  speed: number;
  sizePan: number;
  sizeTilt: number;
  fan: number;
  invert180: boolean;
  customPoints?: Point2D[];
}

export interface CustomTrajectory {
  id: string;
  label: string;
  points: Point2D[];
}

export interface MovementPreset {
  shape: string;
  speed: number;
  sizePan: number;
  sizeTilt: number;
  fan: number;
  invert180: boolean;
  label: string;
  customPoints?: Point2D[];
}

export interface GroupPosition {
  x: number;
  y: number;
  label: string;
  /** Pan/tilt par lyre (clé = id fixture). Sinon x/y communs. */
  perFixture?: Record<string, { x: number; y: number }>;
}

/** Positions mémorisées : une cible pour tout le groupe ou une par lyre. */
export type GroupPositionMemoryMode = 'linked' | 'per_fixture';

/** Mémorisation clic droit sur un bouton forme (Scan ↔, Cercle…). */
export interface QuickMovementSavedState {
  movement: GroupMovement;
  centerPan: number;
  centerTilt: number;
  /** Centre de forme commun (true) ou un centre par lyre. */
  movementCenterLinked?: boolean;
  /** Centres par fixture (clé = id lyre en string), si non lié. */
  movementCentersPerFixture?: Record<string, { x: number; y: number }>;
}

export type GroupQuickMovementSaves = Record<
  string,
  Partial<Record<string, QuickMovementSavedState>>
>;

export type CustomMovementSlotId = 'custom_1' | 'custom_2' | 'custom_3' | 'custom_4';

export interface CustomMovementSlotLink {
  /** Trajectoire point à point (bibliothèque). */
  trajectoryId?: string;
  /** Forme standard : cercle, carré, scan… (id preset rapide). */
  shapePresetId?: string;
  /** Libellé personnalisé affiché sur le bouton. */
  displayName?: string;
}

/** Chaque bouton mouvement (Cercle… Perso 4) → forme ou trajectoire de la bibliothèque. */
export type GroupCustomMovementSlotLinks = Record<
  string,
  Partial<Record<string, CustomMovementSlotLink>>
>;

export interface LivePanTilt {
  pan: number;
  tilt: number;
}

export interface ConnectionInfo {
  connected: boolean;
  port: string;
  last_error: string | null;
  blackout_on_disconnect: boolean;
  target_hz: number;
  actual_hz: number;
  latency_ms: number;
}

export type BeamShape = 'round' | 'square' | 'rect';

/** Position d'un projecteur sur le plan 2D / scène 3D. */
export interface StageFixturePosition {
  id: number;
  x: number;
  y: number;
  z?: number;
  rotationY?: number;
  rotationX?: number;
  beamShape?: BeamShape;
  beamWidth?: number;
  /** Taille du pool / ouverture faisceau 3D (25–200, défaut 100). */
  beamSpread?: number;
  /** Force du rendu lumineux décoratif (10–100, défaut 100). */
  beamVisual?: number;
  /** false = masqué sur le plan 2D et la scène 3D (patch inchangé). */
  visible?: boolean;
}

/** Repère au sol (cible répète / pointage). */
export interface StageLandmark {
  id: string;
  name: string;
  x: number;
  y: number;
}

/** Élément décor scène (enceinte, musicien, DJ…) — position plan % + 3D. */
export type StageSceneElementKind =
  | 'speaker_l'
  | 'speaker_r'
  | 'speaker'
  /** Enceinte de retour / wedge couchée (sol scène). */
  | 'wedge_monitor'
  | 'vocalist'
  | 'guitarist'
  | 'bassist'
  | 'drummer'
  | 'keyboardist'
  | 'dj_booth';

export interface StageSceneElement {
  id: string;
  kind: StageSceneElementKind;
  name: string;
  x: number;
  y: number;
  /** Hauteur scène (0–100), comme les projecteurs. */
  z: number;
  enabled: boolean;
}

export type ChannelFunctionType =
  | 'dimmer'
  | 'red'
  | 'green'
  | 'blue'
  | 'white'
  | 'pan'
  | 'tilt'
  | 'strobe'
  | 'gobo'
  | 'color'
  | 'speed'
  | 'other';

export interface ChannelDef {
  index: number;
  name: string;
  type: ChannelFunctionType;
}

export interface FixtureProfile {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  channels: number;
  type: 'RGB' | 'Moving Head' | 'Laser' | 'Effect' | 'Other';
  channelDefs: ChannelDef[];
  /** Photo matériel (data:image/jpeg embarqué) — Patch / Vue DMX, hors ligne. */
  imageUrl?: string;
}

/** État d'un groupe dans un preset d'ambiance. */
export interface LiveGroupState {
  dim: number;
  str: number;
  color: RgbColor;
  pan?: number;
  tilt?: number;
  gobo?: number;
  auto?: boolean;
  pulse?: boolean;
}

export interface AmbiancePreset {
  name: string;
  groupStates: Record<string, LiveGroupState>;
}

/** Cue show : snapshot univers + fade optionnel. */
export interface ShowCue {
  id: string;
  name: string;
  fadeMs: number;
  channels: number[];
}

/** Snapshot univers DMX (console / macros). */
export interface UniversePreset {
  id: string;
  name: string;
  data: number[];
  timestamp: string;
}

/** Payload partiel pour ajout de projecteur depuis le Patch. */
export type NewFixtureInput = Omit<Fixture, 'id'> & { id?: number };

/** @deprecated Preferer MovementShape + sync_live_motions. */
export enum MotionMode {
  Streak = 'streak',
  Circle = 'circle',
  Ellipse = 'ellipse',
}

/** État UI résumé (hors stores). */
export interface UiAppState {
  masterDimmer: number;
  blackout: boolean;
  isConnected: boolean;
  activePreset?: number;
}

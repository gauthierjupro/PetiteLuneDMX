import type { ChannelDef, Fixture, FixtureProfile } from '../types';
import { resolveFixtureChannelDefs } from './fixtureDmxChannels';

/** CH1 : activer le pilotage DMX (CH2–CH9). */
export const WOOKIE_200R_CH1_DMX_MODE_MIN = 192;
export const WOOKIE_200R_CH1_DMX_MODE_DEFAULT = 255;

/** Valeurs typiques CH1 (mode global 9 canaux). */
export const WOOKIE_200R_CH1_OFF = 32;
export const WOOKIE_200R_CH1_AUTO = 96;
export const WOOKIE_200R_CH1_SOUND = 160;

export const WOOKIE_200R_PRESET_COUNT = 32;
const PRESET_BIN_SIZE = 256 / WOOKIE_200R_PRESET_COUNT;

export function isCameoWookie200RFixture(manufacturer: string, model: string): boolean {
  const m = `${manufacturer} ${model}`.toLowerCase();
  return m.includes('cameo') && m.includes('wookie') && m.includes('200');
}

/** Canaux mode 9 (complet — presets + axes). */
export function wookie200R9ChannelDefs(): ChannelDef[] {
  return [
    { index: 1, name: 'Mode global (Off/Auto/Sound/DMX)', type: 'other' },
    { index: 2, name: 'Couleur (N/A sur 200 R)', type: 'other' },
    { index: 3, name: 'Preset motif (1–32)', type: 'gobo' },
    { index: 4, name: 'Zoom / taille', type: 'other' },
    { index: 5, name: 'Rotation X', type: 'other' },
    { index: 6, name: 'Rotation Y', type: 'other' },
    { index: 7, name: 'Rotation Z', type: 'other' },
    { index: 8, name: 'Dépl. horizontal (X)', type: 'pan' },
    { index: 9, name: 'Dépl. vertical (Y)', type: 'tilt' },
  ];
}

/** Canaux mode 3 (simple). */
export function wookie200R3ChannelDefs(): ChannelDef[] {
  return [
    { index: 1, name: 'Zoom / taille', type: 'other' },
    { index: 2, name: 'Couleur (N/A sur 200 R)', type: 'other' },
    { index: 3, name: 'Mode (off / sound / auto)', type: 'other' },
  ];
}

export function bundledWookie200R9Profile(): FixtureProfile {
  return {
    id: 'cameo_wookie_200r',
    name: 'Cameo WOOKIE 200 R',
    manufacturer: 'Cameo',
    model: 'WOOKIE 200 R',
    channels: 9,
    type: 'Laser',
    channelDefs: wookie200R9ChannelDefs(),
  };
}

export function bundledWookie200R3Profile(): FixtureProfile {
  return {
    id: 'cameo_wookie_200r_3ch',
    name: 'Cameo WOOKIE 200 R (3 ch)',
    manufacturer: 'Cameo',
    model: 'WOOKIE 200 R',
    channels: 3,
    type: 'Laser',
    channelDefs: wookie200R3ChannelDefs(),
  };
}

/** Valeur DMX CH3 pour le preset 1…32 (milieu de chaque plage ~8 steps). */
export function wookie200RPresetDmxValue(presetIndex1Based: number): number {
  const slot = Math.max(1, Math.min(WOOKIE_200R_PRESET_COUNT, Math.floor(presetIndex1Based))) - 1;
  const raw = slot * PRESET_BIN_SIZE + PRESET_BIN_SIZE / 2 - 0.5;
  return Math.min(255, Math.max(0, Math.round(raw)));
}

/** Preset 1…32 inféré depuis CH3 (0–255). */
export function wookie200RPresetIndexFromDmx(dmx: number): number {
  const clamped = Math.max(0, Math.min(255, Math.round(dmx)));
  const slot = Math.min(
    WOOKIE_200R_PRESET_COUNT - 1,
    Math.floor(clamped / PRESET_BIN_SIZE)
  );
  return slot + 1;
}

const BUNDLED_BY_ID = new Map<string, FixtureProfile>([
  [bundledWookie200R9Profile().id, bundledWookie200R9Profile()],
  [bundledWookie200R3Profile().id, bundledWookie200R3Profile()],
]);

/** Met à jour les profils Cameo WOOKIE 200 R embarqués (canaux corrigés). */
export function mergeBundledProfileUpdates(profiles: FixtureProfile[]): FixtureProfile[] {
  const ids = new Set(profiles.map((p) => p.id));
  const next = profiles.map((p) => {
    const bundled = BUNDLED_BY_ID.get(p.id);
    if (bundled) {
      return {
        ...p,
        channelDefs: bundled.channelDefs,
        channels: bundled.channels,
        type: 'Laser' as const,
      };
    }
    if (
      isCameoWookie200RFixture(p.manufacturer, p.model) &&
      p.channels === 9 &&
      p.id !== bundledWookie200R3Profile().id
    ) {
      return { ...p, channelDefs: wookie200R9ChannelDefs(), channels: 9 };
    }
    if (isCameoWookie200RFixture(p.manufacturer, p.model) && p.channels === 3) {
      return { ...p, channelDefs: wookie200R3ChannelDefs(), channels: 3 };
    }
    return p;
  });

  for (const bundled of BUNDLED_BY_ID.values()) {
    if (!ids.has(bundled.id)) next.push(bundled);
  }
  return next;
}

export function isWookie200R9ChannelFixture(fixture: Fixture): boolean {
  return (
    isCameoWookie200RFixture(fixture.manufacturer, fixture.model) && fixture.channels >= 9
  );
}

export function wookie200R9FixturesInGroup(
  fixtureIds: number[],
  fixtures: Fixture[]
): Fixture[] {
  return fixtureIds
    .map((id) => fixtures.find((f) => Number(f.id) === Number(id)))
    .filter((f): f is Fixture => f != null && isWookie200R9ChannelFixture(f));
}

/** Index absolu univers DMX (0-based) pour un canal du profil Wookie 9 ch. */
export function wookie200R9ChannelIndex(
  fixture: Fixture,
  channelIndex1Based: number,
  profiles?: FixtureProfile[]
): number | null {
  if (!isWookie200R9ChannelFixture(fixture)) return null;
  const defs = resolveFixtureChannelDefs(fixture, profiles);
  const hit = defs.find((d) => d.index === channelIndex1Based);
  if (!hit) return null;
  return fixture.address - 1 + (hit.index - 1);
}

export function applyWookie200RPresetToFixture(
  fixture: Fixture,
  presetIndex1Based: number,
  updateDmx: (channelIndex0: number, value: number) => void,
  profiles?: FixtureProfile[]
): void {
  if (!isWookie200R9ChannelFixture(fixture)) return;
  const ch1 = wookie200R9ChannelIndex(fixture, 1, profiles);
  const ch3 = wookie200R9ChannelIndex(fixture, 3, profiles);
  if (ch1 == null || ch3 == null) return;
  updateDmx(ch1, WOOKIE_200R_CH1_DMX_MODE_DEFAULT);
  updateDmx(ch3, wookie200RPresetDmxValue(presetIndex1Based));
}

export function applyWookie200RPresetToFixtures(
  targets: Fixture[],
  presetIndex1Based: number,
  updateDmx: (channelIndex0: number, value: number) => void,
  profiles?: FixtureProfile[]
): void {
  for (const f of targets) {
    applyWookie200RPresetToFixture(f, presetIndex1Based, updateDmx, profiles);
  }
}

export function readWookie200RActivePreset(
  fixture: Fixture,
  channels: number[],
  profiles?: FixtureProfile[]
): number | null {
  const ch3 = wookie200R9ChannelIndex(fixture, 3, profiles);
  if (ch3 == null) return null;
  const v = channels[ch3];
  if (v == null) return null;
  return wookie200RPresetIndexFromDmx(v);
}

export function readWookie200RChannelValue(
  fixture: Fixture,
  channelIndex1Based: number,
  channels: number[],
  profiles?: FixtureProfile[]
): number {
  const idx = wookie200R9ChannelIndex(fixture, channelIndex1Based, profiles);
  if (idx == null) return 0;
  return channels[idx] ?? 0;
}

export function writeWookie200RChannelToFixtures(
  targets: Fixture[],
  channelIndex1Based: number,
  value: number,
  updateDmx: (channelIndex0: number, val: number) => void,
  profiles?: FixtureProfile[]
): void {
  const v = Math.max(0, Math.min(255, Math.round(value)));
  for (const f of targets) {
    const idx = wookie200R9ChannelIndex(f, channelIndex1Based, profiles);
    if (idx != null) updateDmx(idx, v);
  }
}

export function applyWookie200RGlobalModeToFixtures(
  targets: Fixture[],
  ch1Value: number,
  updateDmx: (channelIndex0: number, val: number) => void,
  profiles?: FixtureProfile[]
): void {
  writeWookie200RChannelToFixtures(targets, 1, ch1Value, updateDmx, profiles);
}

export function isWookie200R9OnlyGroup(fixtureIds: number[], fixtures: Fixture[]): boolean {
  if (fixtureIds.length === 0) return false;
  return fixtureIds.every((id) => {
    const f = fixtures.find((fx) => Number(fx.id) === Number(id));
    return f != null && isWookie200R9ChannelFixture(f);
  });
}

export type Wookie200RGlobalMode = 'off' | 'auto' | 'sound' | 'dmx';

export function wookie200RCh1ForMode(mode: Wookie200RGlobalMode): number {
  switch (mode) {
    case 'off':
      return WOOKIE_200R_CH1_OFF;
    case 'auto':
      return WOOKIE_200R_CH1_AUTO;
    case 'sound':
      return WOOKIE_200R_CH1_SOUND;
    case 'dmx':
      return WOOKIE_200R_CH1_DMX_MODE_DEFAULT;
  }
}

export function inferWookie200RGlobalMode(ch1: number): Wookie200RGlobalMode {
  if (ch1 >= WOOKIE_200R_CH1_DMX_MODE_MIN) return 'dmx';
  if (ch1 >= 128) return 'sound';
  if (ch1 >= 64) return 'auto';
  return 'off';
}

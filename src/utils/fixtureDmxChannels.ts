import type {
  ChannelDef,
  ChannelFunctionType,
  Fixture,
  FixtureControlAction,
  FixtureProfile,
  RgbColor,
} from '../types';
import { findProfileForFixture } from './fixtureProfileImage';
import { createProfileFromFixture } from './fixtureProfileFromPatch';
import { loadFixtureProfilesFromStorage } from '../hooks/useFixtureProfiles';
import { rgbToHsv } from './colorUtils';

export function resolveFixtureChannelDefs(
  fixture: Fixture,
  profiles?: FixtureProfile[]
): ChannelDef[] {
  const lib = profiles ?? loadFixtureProfilesFromStorage();
  const profile = findProfileForFixture(fixture, lib);
  if (profile?.channelDefs?.length) return profile.channelDefs;
  return createProfileFromFixture(fixture).channelDefs;
}

/** Index 0-based dans le tableau univers `channels`. */
export function fixtureChannelIndex(
  fixture: Fixture,
  fn: ChannelFunctionType,
  profiles?: FixtureProfile[]
): number | null {
  const defs = resolveFixtureChannelDefs(fixture, profiles);
  const hit = defs.find((d) => d.type === fn);
  if (!hit) return null;
  return fixture.address - 1 + (hit.index - 1);
}

/** Valeur DMX approximative pour roue de couleurs / canal « color ». */
export function rgbToColorWheelDmx(r: number, g: number, b: number): number {
  const { h, s, v } = rgbToHsv(r, g, b);
  if (v < 8) return 0;
  if (s < 12) return 8;
  const slot = Math.round(h / 360 * 7) % 8;
  return Math.min(255, Math.max(14, slot * 32 + 14));
}

export function applyFixtureDmxAction(
  fixture: Fixture,
  action: FixtureControlAction,
  value: number | RgbColor,
  updateDmx: (ch: number, val: number) => void,
  profiles?: FixtureProfile[]
): void {
  if (action === 'dimmer' && typeof value === 'number') {
    const ch = fixtureChannelIndex(fixture, 'dimmer', profiles);
    if (ch != null) updateDmx(ch, value);
    return;
  }
  if (action === 'strobe' && typeof value === 'number') {
    const ch = fixtureChannelIndex(fixture, 'strobe', profiles);
    if (ch != null) updateDmx(ch, value);
    return;
  }
  if (action === 'color' && typeof value === 'object') {
    if (fixture.type === 'RGB') {
      const r = fixtureChannelIndex(fixture, 'red', profiles);
      const g = fixtureChannelIndex(fixture, 'green', profiles);
      const b = fixtureChannelIndex(fixture, 'blue', profiles);
      if (r != null) updateDmx(r, value.r);
      if (g != null) updateDmx(g, value.g);
      if (b != null) updateDmx(b, value.b);
      const dim = fixtureChannelIndex(fixture, 'dimmer', profiles);
      if (dim != null && value.r + value.g + value.b > 0) {
        /* ne force pas le dimmer si déjà piloté */
      }
      return;
    }
    const colorCh = fixtureChannelIndex(fixture, 'color', profiles);
    if (colorCh != null) {
      updateDmx(colorCh, rgbToColorWheelDmx(value.r, value.g, value.b));
    }
    return;
  }
  if (action === 'pan' && typeof value === 'number') {
    const ch = fixtureChannelIndex(fixture, 'pan', profiles);
    if (ch != null) updateDmx(ch, value);
    return;
  }
  if (action === 'tilt' && typeof value === 'number') {
    const ch = fixtureChannelIndex(fixture, 'tilt', profiles);
    if (ch != null) updateDmx(ch, value);
  }
}

export function applyFixtureGobo(fixture: Fixture, dmxValue: number, updateDmx: (ch: number, val: number) => void, profiles?: FixtureProfile[]) {
  const ch = fixtureChannelIndex(fixture, 'gobo', profiles);
  if (ch != null) updateDmx(ch, dmxValue);
}

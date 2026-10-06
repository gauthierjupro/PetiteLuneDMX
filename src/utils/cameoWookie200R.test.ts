import { describe, expect, it } from 'vitest';
import type { Fixture } from '../types';
import {
  applyWookie200RPresetToFixture,
  wookie200RPresetDmxValue,
  wookie200RPresetIndexFromDmx,
  wookie200R9ChannelDefs,
  WOOKIE_200R_CH1_DMX_MODE_DEFAULT,
  WOOKIE_200R_CH1_DMX_MODE_MIN,
} from './cameoWookie200R';

const wookieFixture: Fixture = {
  id: 16,
  name: 'Wookie',
  manufacturer: 'Cameo',
  model: 'WOOKIE 200 R',
  address: 17,
  channels: 9,
  type: 'Laser',
};

describe('cameoWookie200R', () => {
  it('mappe 32 presets sur des bins ~8 DMX', () => {
    expect(wookie200RPresetDmxValue(1)).toBe(4);
    expect(wookie200RPresetIndexFromDmx(0)).toBe(1);
    expect(wookie200RPresetIndexFromDmx(7)).toBe(1);
    expect(wookie200RPresetIndexFromDmx(8)).toBe(2);
    expect(wookie200RPresetIndexFromDmx(wookie200RPresetDmxValue(32))).toBe(32);
  });

  it('profil 9 canaux : preset CH3, pan/tilt sur X/Y', () => {
    const defs = wookie200R9ChannelDefs();
    expect(defs.find((d) => d.index === 3)?.type).toBe('gobo');
    expect(defs.find((d) => d.index === 8)?.type).toBe('pan');
    expect(defs.find((d) => d.index === 9)?.type).toBe('tilt');
  });

  it('expose le seuil mode DMX CH1', () => {
    expect(WOOKIE_200R_CH1_DMX_MODE_MIN).toBe(192);
  });

  it('envoie CH1 mode DMX et CH3 preset', () => {
    const writes: Record<number, number> = {};
    applyWookie200RPresetToFixture(wookieFixture, 5, (ch, v) => {
      writes[ch] = v;
    });
    expect(writes[16]).toBe(WOOKIE_200R_CH1_DMX_MODE_DEFAULT);
    expect(writes[18]).toBe(wookie200RPresetDmxValue(5));
  });
});

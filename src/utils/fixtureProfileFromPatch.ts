import type { ChannelDef, ChannelFunctionType, Fixture, FixtureProfile } from '../types';
import {
  isCameoWookie200RFixture,
  wookie200R3ChannelDefs,
  wookie200R9ChannelDefs,
} from './cameoWookie200R';
import { findProfileForFixture } from './fixtureProfileImage';

export const FIXTURE_PROFILE_DRAFT_EVENT = 'pldmx:fixture_profile_draft';

const VALID_PROFILE_TYPES = new Set<FixtureProfile['type']>([
  'RGB',
  'Moving Head',
  'Laser',
  'Effect',
  'Other',
]);

export function hasLibraryProfileForFixture(
  fixture: Pick<Fixture, 'profileId' | 'manufacturer' | 'model' | 'name'>,
  profiles: FixtureProfile[]
): boolean {
  return findProfileForFixture(fixture, profiles) != null;
}

export function inferChannelTypeFromLabel(label: string): ChannelFunctionType {
  const l = label.toLowerCase();
  if (l.includes('dim') || l.includes('inten') || l.includes('master')) return 'dimmer';
  if (l.includes('rouge') || l === 'red' || l.includes(' rouge')) return 'red';
  if (l.includes('vert') || l === 'green') return 'green';
  if (l.includes('bleu') || l === 'blue') return 'blue';
  if (l.includes('blanc') || l.includes('white') || l.includes('amber')) return 'white';
  if (l.includes('strobe') || l.includes('strob')) return 'strobe';
  if (l.includes('pan') || l.includes('rotation') && !l.includes('tilt')) return 'pan';
  if (l.includes('tilt') || l.includes('inclin')) return 'tilt';
  if (l.includes('gobo')) return 'gobo';
  if (l.includes('couleur') || l.includes('color') || l.includes('colour')) return 'color';
  if (l.includes('speed') || l.includes('vitesse')) return 'speed';
  return 'other';
}

function movingHeadTemplate(count: number): ChannelDef[] {
  const full: ChannelDef[] = [
    { index: 1, name: 'Pan', type: 'pan' },
    { index: 2, name: 'Tilt', type: 'tilt' },
    { index: 3, name: 'Pan fin', type: 'other' },
    { index: 4, name: 'Tilt fin', type: 'other' },
    { index: 5, name: 'Vitesse', type: 'speed' },
    { index: 6, name: 'Couleur', type: 'color' },
    { index: 7, name: 'Gobo', type: 'gobo' },
    { index: 8, name: 'Dimmer', type: 'dimmer' },
    { index: 9, name: 'Strobe', type: 'strobe' },
  ];
  if (count <= full.length) return full.slice(0, count).map((d, i) => ({ ...d, index: i + 1 }));
  return [
    ...full,
    ...Array.from({ length: count - full.length }, (_, i) => ({
      index: full.length + i + 1,
      name: `Canal ${full.length + i + 1}`,
      type: 'other' as const,
    })),
  ];
}

function effectTemplate(count: number): ChannelDef[] {
  const base: ChannelDef[] = [
    { index: 1, name: 'Mode', type: 'other' },
    { index: 2, name: 'Speed', type: 'speed' },
    { index: 3, name: 'Color/Effect', type: 'color' },
    { index: 4, name: 'Motor', type: 'other' },
    { index: 5, name: 'Strobe', type: 'strobe' },
    { index: 6, name: 'Dimmer', type: 'dimmer' },
  ];
  if (count <= base.length) return base.slice(0, count).map((d, i) => ({ ...d, index: i + 1 }));
  return [
    ...base,
    ...Array.from({ length: count - base.length }, (_, i) => ({
      index: base.length + i + 1,
      name: `Canal ${base.length + i + 1}`,
      type: 'other' as const,
    })),
  ];
}

function rgbTemplate(count: number): ChannelDef[] {
  const base: ChannelDef[] = [
    { index: 1, name: 'Dimmer', type: 'dimmer' },
    { index: 2, name: 'Rouge', type: 'red' },
    { index: 3, name: 'Vert', type: 'green' },
    { index: 4, name: 'Bleu', type: 'blue' },
    { index: 5, name: 'Strobe', type: 'strobe' },
  ];
  if (count <= base.length) return base.slice(0, count).map((d, i) => ({ ...d, index: i + 1 }));
  return [
    ...base,
    ...Array.from({ length: count - base.length }, (_, i) => ({
      index: base.length + i + 1,
      name: `Canal ${base.length + i + 1}`,
      type: 'other' as const,
    })),
  ];
}

function defaultChannelDefs(fixture: Fixture): ChannelDef[] {
  const n = Math.max(1, Math.min(512, fixture.channels));
  const kind = VALID_PROFILE_TYPES.has(fixture.type as FixtureProfile['type'])
    ? (fixture.type as FixtureProfile['type'])
    : 'Other';

  if (fixture.channelMap && fixture.channelMap.length >= n) {
    return fixture.channelMap.slice(0, n).map((name, i) => ({
      index: i + 1,
      name: name.trim() || `Canal ${i + 1}`,
      type: inferChannelTypeFromLabel(name),
    }));
  }

  if (kind === 'Moving Head') return movingHeadTemplate(n);
  if (kind === 'RGB') return rgbTemplate(n);
  if (kind === 'Effect') return effectTemplate(n);

  if (isCameoWookie200RFixture(fixture.manufacturer, fixture.model)) {
    if (n === 3) return wookie200R3ChannelDefs();
    if (n === 9) return wookie200R9ChannelDefs();
  }

  return Array.from({ length: n }, (_, i) => ({
    index: i + 1,
    name: `Canal ${i + 1}`,
    type: 'other' as const,
  }));
}

/** Brouillon de profil librairie à partir d’un projecteur déjà patché. */
export function createProfileFromFixture(fixture: Fixture): FixtureProfile {
  const profileType = VALID_PROFILE_TYPES.has(fixture.type as FixtureProfile['type'])
    ? (fixture.type as FixtureProfile['type'])
    : 'Other';
  const channelDefs = defaultChannelDefs(fixture);
  const displayName =
    fixture.name.replace(/\s*\[\d+]\s*$/i, '').trim() || fixture.model || 'Projecteur';
  const slug = `${fixture.manufacturer}_${fixture.model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);

  return {
    id: `patch_${slug || 'custom'}_${Date.now()}`,
    name: displayName,
    manufacturer: fixture.manufacturer.trim() || 'Inconnu',
    model: fixture.model.trim() || displayName,
    channels: channelDefs.length,
    type: profileType,
    channelDefs,
  };
}

export function openFixtureProfileEditorDraft(profile: FixtureProfile): void {
  window.dispatchEvent(
    new CustomEvent(FIXTURE_PROFILE_DRAFT_EVENT, { detail: profile })
  );
}

/** Profils à créer pour les fixtures patchées sans correspondance librairie. */
export function listMissingProfilesFromPatch(
  fixtures: Fixture[],
  profiles: FixtureProfile[]
): FixtureProfile[] {
  const seen = new Set<string>();
  const out: FixtureProfile[] = [];

  for (const fixture of fixtures) {
    if (hasLibraryProfileForFixture(fixture, profiles)) continue;
    const key = `${fixture.manufacturer.trim().toLowerCase()}|${fixture.model.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(createProfileFromFixture(fixture));
  }
  return out;
}

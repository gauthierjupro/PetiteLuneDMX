import type { ChannelDef, ChannelFunctionType, FixtureProfile } from '../types';

const VALID_TYPES = new Set(['RGB', 'Moving Head', 'Laser', 'Effect', 'Other']);
const VALID_CHANNEL_TYPES = new Set<ChannelFunctionType>([
  'dimmer',
  'red',
  'green',
  'blue',
  'white',
  'pan',
  'tilt',
  'strobe',
  'gobo',
  'color',
  'speed',
  'other',
]);

export function isFixtureProfile(value: unknown): value is FixtureProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as FixtureProfile;
  if (typeof p.id !== 'string' || !p.id.trim()) return false;
  if (typeof p.name !== 'string') return false;
  if (typeof p.manufacturer !== 'string') return false;
  if (typeof p.model !== 'string') return false;
  if (typeof p.channels !== 'number' || p.channels < 1 || p.channels > 512) return false;
  if (!VALID_TYPES.has(p.type)) return false;
  if (!Array.isArray(p.channelDefs)) return false;
  if (p.channelDefs.length !== p.channels) return false;
  return p.channelDefs.every(isChannelDef);
}

function isChannelDef(def: ChannelDef): boolean {
  if (!def || typeof def !== 'object') return false;
  if (typeof def.index !== 'number' || def.index < 1) return false;
  if (typeof def.name !== 'string') return false;
  return VALID_CHANNEL_TYPES.has(def.type);
}

export function validateFixtureProfiles(raw: unknown): {
  ok: true;
  profiles: FixtureProfile[];
} | {
  ok: false;
  error: string;
} {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'Le fichier doit contenir un tableau de profils.' };
  }
  const profiles: FixtureProfile[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (!isFixtureProfile(raw[i])) {
      return { ok: false, error: `Profil invalide à l'index ${i}.` };
    }
    profiles.push(raw[i]);
  }
  return { ok: true, profiles };
}

export function exportFixtureProfilesJson(profiles: FixtureProfile[]): string {
  return JSON.stringify({ version: 1, profiles }, null, 2);
}

export function parseFixtureProfilesImport(text: string): ReturnType<typeof validateFixtureProfiles> {
  try {
    const parsed = JSON.parse(text) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { profiles?: unknown }).profiles)
        ? (parsed as { profiles: unknown[] }).profiles
        : null;
    if (!list) {
      return { ok: false, error: 'Format JSON non reconnu (tableau ou { profiles: [] }).' };
    }
    return validateFixtureProfiles(list);
  } catch {
    return { ok: false, error: 'JSON invalide.' };
  }
}

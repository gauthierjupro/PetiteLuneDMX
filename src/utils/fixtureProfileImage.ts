import type { Fixture, FixtureProfile } from '../types';
import { readImageFileAsDataUrl } from './stagePlanBackground';

export const MAX_PROFILE_IMAGE_DATA_URL_LENGTH = 900_000;

/** Image embarquée dans le profil (hors ligne, export JSON). */
export function isEmbeddedProfileImage(url: string): boolean {
  return url.trim().startsWith('data:image/');
}

/** URL distante (https) ou data:image/* encodée localement. */
export function isAllowedProfileImageUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith('data:image/')) return t.length <= MAX_PROFILE_IMAGE_DATA_URL_LENGTH;
  try {
    const u = new URL(t);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function normProfileToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '');
}

function fixtureDisplayName(fixture: Pick<Fixture, 'model'> & { name?: string }): string {
  const fromName = (fixture.name ?? '').replace(/\s*\[\d+]\s*$/i, '').trim();
  return fromName || fixture.model;
}

function profileMatchScore(
  fixture: Pick<Fixture, 'manufacturer' | 'model'> & { name?: string },
  profile: FixtureProfile
): number {
  const mFix = normProfileToken(fixture.manufacturer);
  const mProf = normProfileToken(profile.manufacturer);
  if (!mFix || mFix !== mProf) return 0;

  const modFix = normProfileToken(fixture.model);
  const modProf = normProfileToken(profile.model);
  const nameFix = normProfileToken(fixtureDisplayName(fixture));
  const nameProf = normProfileToken(profile.name);

  if (modFix && modFix === modProf) return 100;
  if (nameFix && nameFix === nameProf) return 95;
  if (modFix && nameProf && (modFix.includes(nameProf) || nameProf.includes(modFix))) return 88;
  if (modFix && modProf && (modFix.includes(modProf) || modProf.includes(modFix))) {
    const shorter = Math.min(modFix.length, modProf.length);
    const longer = Math.max(modFix.length, modProf.length);
    if (shorter / longer >= 0.45) return 80;
  }
  if (nameFix && modProf && (nameFix.includes(modProf) || modProf.includes(nameFix))) return 75;
  return 0;
}

export function findProfileForFixture(
  fixture: Pick<Fixture, 'profileId' | 'manufacturer' | 'model'> & { name?: string },
  profiles: FixtureProfile[]
): FixtureProfile | undefined {
  if (fixture.profileId) {
    const byId = profiles.find((p) => p.id === fixture.profileId);
    if (byId) return byId;
  }

  let best: FixtureProfile | undefined;
  let bestScore = 0;
  for (const profile of profiles) {
    const score = profileMatchScore(fixture, profile);
    if (score > bestScore) {
      bestScore = score;
      best = profile;
    }
  }
  return bestScore >= 75 ? best : undefined;
}

export function resolveFixtureProfileImageUrl(
  fixture: Pick<Fixture, 'profileId' | 'manufacturer' | 'model'> & { name?: string },
  profiles: FixtureProfile[]
): string | undefined {
  const profile = findProfileForFixture(fixture, profiles);
  const url = profile?.imageUrl?.trim();
  if (url && isAllowedProfileImageUrl(url)) return url;
  return undefined;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}

/** Compresse une data URL image pour le stockage local (JPEG ~640 px). */
export async function compressProfileImageDataUrl(raw: string): Promise<string> {
  if (raw.length <= MAX_PROFILE_IMAGE_DATA_URL_LENGTH) {
    try {
      await loadImage(raw);
      if (raw.startsWith('data:image/jpeg') || raw.startsWith('data:image/webp')) {
        return raw;
      }
    } catch {
      /* recompress */
    }
  }
  const img = await loadImage(raw);
  const maxSide = 480;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(img, 0, 0, w, h);
  let quality = 0.85;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length > MAX_PROFILE_IMAGE_DATA_URL_LENGTH && quality > 0.4) {
    quality -= 0.08;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  if (out.length > MAX_PROFILE_IMAGE_DATA_URL_LENGTH) {
    throw new Error('Image trop lourde — essayez une capture plus petite.');
  }
  return out;
}

export async function prepareProfileImageFromBlob(blob: Blob): Promise<string> {
  if (!blob.type.startsWith('image/')) {
    throw new Error('Collez ou choisissez une image (JPG, PNG, WebP…).');
  }
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture image impossible'));
    reader.readAsDataURL(blob);
  });
  return compressProfileImageDataUrl(raw);
}

/** Redimensionne une photo locale pour limiter la taille en localStorage. */
export async function prepareProfileImageFromFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choisissez un fichier image (JPG, PNG, WebP…).');
  }
  const raw = await readImageFileAsDataUrl(file);
  return compressProfileImageDataUrl(raw);
}

/** Coller depuis le presse-papiers (capture d’écran, copie image). */
export async function prepareProfileImageFromDataTransfer(
  data: DataTransfer | null | undefined
): Promise<string | null> {
  if (!data) return null;
  const file = data.files?.[0];
  if (file?.type.startsWith('image/')) {
    return prepareProfileImageFromFile(file);
  }
  for (const item of data.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) return prepareProfileImageFromBlob(blob);
    }
  }
  return null;
}

export async function prepareProfileImageFromClipboard(): Promise<string | null> {
  if (!navigator.clipboard?.read) return null;
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          return prepareProfileImageFromBlob(blob);
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Télécharge une URL une fois et l’embarque dans le profil (nécessite le réseau). */
export async function embedProfileImageFromUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!isAllowedProfileImageUrl(trimmed) || isEmbeddedProfileImage(trimmed)) {
    throw new Error('URL https invalide.');
  }
  const res = await fetch(trimmed, { mode: 'cors' });
  if (!res.ok) throw new Error('Impossible de télécharger cette image (réseau ou accès refusé).');
  const blob = await res.blob();
  return prepareProfileImageFromBlob(blob);
}

export function notifyFixtureProfilesUpdated(): void {
  window.dispatchEvent(new CustomEvent('pldmx:fixture_profiles'));
}

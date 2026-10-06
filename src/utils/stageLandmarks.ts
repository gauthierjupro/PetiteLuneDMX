import type { StageLandmark } from '../types';
import { setLocalStorageJsonDebounced } from './localStorageDebounced';

export const STAGE_LANDMARKS_KEY = 'stage_landmarks';
export const STAGE_LANDMARKS_EVENT = 'pldmx:stage_landmarks';
export const MAX_STAGE_LANDMARKS = 5;

export const DEFAULT_LANDMARK_NAMES = ['Chanteur', 'Batterie', 'DJ', 'Centre', 'Public'];

export function loadStageLandmarks(): StageLandmark[] {
  try {
    const raw = localStorage.getItem(STAGE_LANDMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StageLandmark[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_STAGE_LANDMARKS) : [];
  } catch {
    return [];
  }
}

export function persistStageLandmarks(landmarks: StageLandmark[]): void {
  setLocalStorageJsonDebounced(STAGE_LANDMARKS_KEY, landmarks, 300);
  window.dispatchEvent(new CustomEvent(STAGE_LANDMARKS_EVENT, { detail: landmarks }));
}

/** Ancien jeu par défaut (doublonnait les éléments scène « musiciens »). */
export function createDefaultLandmarks(): StageLandmark[] {
  return [
    { id: 'lm-1', name: 'Chanteur', x: 50, y: 72 },
    { id: 'lm-2', name: 'Guitariste', x: 32, y: 58 },
    { id: 'lm-3', name: 'Bassiste', x: 68, y: 58 },
    { id: 'lm-4', name: 'Batterie', x: 50, y: 28 },
    { id: 'lm-5', name: 'Claviers', x: 22, y: 42 },
  ];
}

/** Noms déjà couverts par la liste « Éléments scène ». */
const SCENE_ELEMENT_LANDMARK_NAMES = new Set([
  'Chanteur',
  'Guitariste',
  'Bassiste',
  'Batterie',
  'Claviers',
  'DJ',
]);

export function isLegacyDefaultMusicianLandmarkSet(landmarks: StageLandmark[]): boolean {
  const legacy = createDefaultLandmarks();
  if (landmarks.length !== legacy.length) return false;
  return legacy.every((d) => {
    const l = landmarks.find((x) => x.id === d.id);
    if (!l || l.name !== d.name) return false;
    return Math.abs(l.x - d.x) <= 3 && Math.abs(l.y - d.y) <= 3;
  });
}

export function stripMusicianNamedLandmarks(landmarks: StageLandmark[]): StageLandmark[] {
  return landmarks.filter((l) => !SCENE_ELEMENT_LANDMARK_NAMES.has(l.name.trim()));
}

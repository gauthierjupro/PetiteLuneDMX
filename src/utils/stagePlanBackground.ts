import { setLocalStorageJsonDebounced } from './localStorageDebounced';

export const STAGE_PLAN_BACKGROUND_KEY = 'stage_plan_background';

export interface StagePlanBackground {
  dataUrl: string;
  opacity: number;
  locked: boolean;
}

const MAX_DATA_URL_LENGTH = 2_500_000;

export function loadStagePlanBackground(): StagePlanBackground | null {
  try {
    const raw = localStorage.getItem(STAGE_PLAN_BACKGROUND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StagePlanBackground;
    if (!parsed.dataUrl) return null;
    return {
      dataUrl: parsed.dataUrl,
      opacity: parsed.opacity ?? 0.45,
      locked: parsed.locked ?? false,
    };
  } catch {
    return null;
  }
}

export function saveStagePlanBackground(bg: StagePlanBackground | null): void {
  if (!bg) {
    localStorage.removeItem(STAGE_PLAN_BACKGROUND_KEY);
    return;
  }
  if (bg.dataUrl.length > MAX_DATA_URL_LENGTH) {
    console.warn('Plan de fond trop volumineux pour la sauvegarde locale.');
    return;
  }
  setLocalStorageJsonDebounced(STAGE_PLAN_BACKGROUND_KEY, bg, 500);
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

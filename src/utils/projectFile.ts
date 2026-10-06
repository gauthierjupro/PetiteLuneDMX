/** Format projet Petitelune DMX (.pldmx) — snapshot localStorage portable. */

export const PROJECT_FORMAT = 'petitelune-dmx-project' as const;
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_EXTENSION = 'pldmx';

/** Clés localStorage incluses dans un projet (ordre stable pour debug). */
export const PROJECT_STORAGE_KEYS = [
  // Patch
  'dmx_patched_fixtures',
  'dmx_groups',
  'dmx_custom_pdf_links',
  'fixture_profiles',
  // Live moteur
  'dmx_group_movements',
  'dmx_custom_trajectories',
  'dmx_group_custom_movement_slots',
  'dmx_group_quick_movement_saves',
  'dmx_group_pan',
  'dmx_group_tilt',
  'dmx_group_auto_color',
  'dmx_group_auto_gobo',
  'dmx_group_intensities',
  'dmx_group_colors',
  'dmx_group_gobos',
  'dmx_group_positions',
  'dmx_group_center_position',
  'dmx_group_position_memory_mode',
  'dmx_group_movement_presets',
  'dmx_fixture_calibration',
  'dmx_group_pulse',
  'dmx_master_dimmer',
  // Live session / ambiance
  'dmx_linked_groups',
  'dmx_ambiance_auto_color',
  'dmx_ambiance_pulse',
  'dmx_group_strobe_values',
  'dmx_user_colors',
  'dmx_custom_ambiance_presets',
  'dmx_cue_list',
  'dmx_audio_device_id',
  'dmx_auto_live',
  // Scène
  'stage_positions',
  'stage_decor_settings',
  'stage_plan_background',
  'stage_landmarks',
  'stage_scene_elements',
  // Système
  'dmx_blackout_on_disconnect',
] as const;

export type ProjectStorageKey = (typeof PROJECT_STORAGE_KEYS)[number];

export interface PldmxProject {
  format: typeof PROJECT_FORMAT;
  version: number;
  exportedAt: string;
  appVersion: string;
  /** Valeurs brutes localStorage (déjà sérialisées en string). */
  storage: Partial<Record<ProjectStorageKey, string>>;
}

export function collectProjectFromLocalStorage(appVersion: string): PldmxProject {
  const storage: PldmxProject['storage'] = {};
  for (const key of PROJECT_STORAGE_KEYS) {
    const value = localStorage.getItem(key);
    if (value != null) {
      storage[key] = value;
    }
  }
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    storage,
  };
}

export function serializeProject(project: PldmxProject): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(raw: string): PldmxProject {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Fichier JSON invalide.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Structure de projet invalide.');
  }

  const obj = data as Record<string, unknown>;
  if (obj.format !== PROJECT_FORMAT) {
    throw new Error(
      `Format non reconnu (attendu "${PROJECT_FORMAT}", reçu "${String(obj.format)}").`
    );
  }
  if (typeof obj.version !== 'number' || obj.version < 1) {
    throw new Error('Version de projet manquante ou invalide.');
  }
  if (!obj.storage || typeof obj.storage !== 'object') {
    throw new Error('Section "storage" manquante.');
  }

  return data as PldmxProject;
}

/** Écrit les clés du projet dans localStorage. Retourne le nombre de clés appliquées. */
export function applyProjectToLocalStorage(project: PldmxProject): number {
  const allowed = new Set<string>(PROJECT_STORAGE_KEYS);
  let count = 0;
  for (const [key, value] of Object.entries(project.storage)) {
    if (!allowed.has(key) || typeof value !== 'string') continue;
    localStorage.setItem(key, value);
    count += 1;
  }
  return count;
}

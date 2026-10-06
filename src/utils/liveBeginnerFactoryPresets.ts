import type { AmbiancePreset, Group, LiveGroupState } from '../types';

export function ambiancePresetsAreEmpty(presets: Record<string, AmbiancePreset>): boolean {
  return Object.values(presets).every(
    (p) => !p.groupStates || Object.keys(p.groupStates).length === 0
  );
}

function stateForGroups(
  groupIds: string[],
  template: LiveGroupState
): Record<string, LiveGroupState> {
  const states: Record<string, LiveGroupState> = {};
  for (const id of groupIds) {
    states[id] = { ...template, color: { ...template.color } };
  }
  return states;
}

/** Trois scènes d’usine pour le mode Débutant (slots 1–3). */
export function buildBeginnerFactoryPresets(
  ambianceGroups: Group[]
): Partial<Record<string, AmbiancePreset>> {
  const ids = ambianceGroups.filter((g) => g.isAmbiance).map((g) => g.id);
  if (ids.length === 0) {
    ids.push(...ambianceGroups.map((g) => g.id));
  }
  if (ids.length === 0) return {};

  const base = (dim: number, r: number, g: number, b: number): LiveGroupState => ({
    dim,
    str: 0,
    color: { r, g, b },
    auto: false,
    pulse: false,
  });

  return {
    '1': {
      name: 'Douce',
      groupStates: stateForGroups(ids, base(180, 255, 220, 200)),
    },
    '2': {
      name: 'Fête',
      groupStates: stateForGroups(ids, base(255, 255, 80, 180)),
    },
    '3': {
      name: 'Rouge',
      groupStates: stateForGroups(ids, base(255, 255, 50, 50)),
    },
  };
}

export function mergeBeginnerFactoryPresets(
  customPresets: Record<string, AmbiancePreset>,
  ambianceGroups: Group[]
): Record<string, AmbiancePreset> | null {
  if (!ambiancePresetsAreEmpty(customPresets)) return null;
  const factory = buildBeginnerFactoryPresets(ambianceGroups);
  if (Object.keys(factory).length === 0) return null;

  const merged = { ...customPresets };
  for (const [slot, preset] of Object.entries(factory)) {
    if (preset) merged[slot] = preset;
  }
  return merged;
}

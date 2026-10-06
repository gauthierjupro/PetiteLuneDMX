import type { AmbiancePreset, Fixture, Group } from '../types';
import type {
  AutoLiveEnergyLooksConfig,
  AutoLivePresetId,
} from '../types/autoLive';
import { DEFAULT_AUTO_LIVE_ENERGY_LOOKS } from '../types/autoLive';
import { groupHasMovingHead } from './autoLiveGroups';
import { ambiancePresetHasData } from './autoLiveEnergyLooks';
import { getAutoLivePreset } from './autoLivePresets';

const SLOT_IDS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

function slotName(customPresets: Record<string, AmbiancePreset>, slot: string): string {
  return (customPresets[slot]?.name ?? '').toLowerCase();
}

function findSlotByKeywords(
  customPresets: Record<string, AmbiancePreset>,
  keywords: string[],
  exclude: Set<string>
): string | null {
  for (const slot of SLOT_IDS) {
    if (exclude.has(slot) || !ambiancePresetHasData(customPresets, slot)) continue;
    const name = slotName(customPresets, slot);
    if (keywords.some((k) => name.includes(k))) return slot;
  }
  return null;
}

/** Choisit calm / build / peak à partir des noms de scènes ou des slots remplis. */
export function pickEnergyLookSlots(
  customPresets: Record<string, AmbiancePreset>
): Pick<AutoLiveEnergyLooksConfig, 'calmSlot' | 'buildSlot' | 'peakSlot'> {
  const filled = SLOT_IDS.filter((s) => ambiancePresetHasData(customPresets, s));
  const used = new Set<string>();

  const calm =
    findSlotByKeywords(customPresets, ['douce', 'calme', 'soft', 'warm', 'chill'], used) ??
    filled[0] ??
    '1';
  used.add(calm);

  const build =
    findSlotByKeywords(customPresets, ['fête', 'fete', 'montée', 'montee', 'build', 'party'], used) ??
    filled.find((s) => s !== calm) ??
    filled[1] ??
    '2';
  used.add(build);

  const peak =
    findSlotByKeywords(customPresets, ['peak', 'rouge', 'intense', 'max', 'drop'], used) ??
    filled.find((s) => s !== calm && s !== build) ??
    filled[2] ??
    filled[1] ??
    '3';

  return { calmSlot: calm, buildSlot: build, peakSlot: peak };
}

/** Profil auto Live selon la taille du parc (sans réglage manuel). */
export function pickOneClickPartyPresetId(
  groups: Group[],
  fixtures: Fixture[],
  ambianceGroupIds: string[]
): AutoLivePresetId {
  const ambianceGroups = groups.filter((g) => ambianceGroupIds.includes(g.id));
  const hasLyres =
    ambianceGroups.some((g) => groupHasMovingHead(g, fixtures)) ||
    groups.some((g) => groupHasMovingHead(g, fixtures));

  if (ambianceGroups.length >= 3 && hasLyres) return 'club';
  if (ambianceGroups.length <= 1 && !hasLyres) return 'acoustic';
  return 'standard';
}

export function buildOneClickPartyEnergyLooks(
  customPresets: Record<string, AmbiancePreset>
): AutoLiveEnergyLooksConfig {
  return {
    ...DEFAULT_AUTO_LIVE_ENERGY_LOOKS,
    ...pickEnergyLookSlots(customPresets),
    enabled: true,
    useFade: true,
    minHoldMs: 10000,
  };
}

export function oneClickPartySuggestedMaster(presetId: AutoLivePresetId): number {
  return getAutoLivePreset(presetId).suggestedMaster;
}

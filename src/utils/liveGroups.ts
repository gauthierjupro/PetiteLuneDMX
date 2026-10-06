import type { Fixture, Group } from '../types';
import {
  fixtureIsLyreControllable,
  fixtureIsMovementCapable,
  groupHasEffect,
  groupHasMovementCapable,
  groupHasMovingHead,
  groupHasRgb,
} from './autoLiveGroups';

export { groupHasMovingHead, groupHasRgb, groupHasEffect };

function fixtureById(fixtures: Fixture[], id: number): Fixture | undefined {
  return fixtures.find((f) => f.id === id);
}

/** Groupe composé uniquement de lyres (moving heads). */
export function isLyreOnlyGroup(group: Group, fixtures: Fixture[]): boolean {
  if (group.fixtureIds.length === 0) return false;
  return group.fixtureIds.every((id) => {
    const f = fixtureById(fixtures, id);
    return f != null && fixtureIsLyreControllable(f);
  });
}

/**
 * Groupes pilotables dans la colonne Ambiances du Live :
 * - case « Ambiance » cochée au Patch, ou
 * - PAR / washes (RGB…) sans lyre seule (aligné sur le repli Auto Live).
 */
export function isLiveAmbianceGroup(group: Group, fixtures: Fixture[]): boolean {
  if (group.fixtureIds.length === 0) return false;
  if (group.isSpecial === true) return false;
  if (group.isMovement === true && group.isAmbiance !== true) return false;
  if (group.isAmbiance === true) return true;
  if (isLyreOnlyGroup(group, fixtures)) return false;
  if (groupHasRgb(group, fixtures)) return true;
  if (groupHasEffect(group, fixtures)) return true;
  return false;
}

export function getLiveAmbianceGroups(groups: Group[], fixtures: Fixture[]): Group[] {
  return groups.filter((g) => isLiveAmbianceGroup(g, fixtures));
}

/**
 * Groupe affiché dans la colonne Mouvements :
 * - case « Mouvement » au Patch, ou
 * - repli : au moins une lyre/scan (pas laser seul).
 */
export function isLiveMovementGroup(group: Group, fixtures: Fixture[]): boolean {
  if (group.fixtureIds.length === 0) return false;
  if (group.isSpecial === true) return false;
  if (group.isAmbiance === true && group.isMovement !== true) return false;
  if (!groupHasMovementCapable(group, fixtures)) return false;
  if (group.isMovement === true) return true;
  return groupHasMovingHead(group, fixtures);
}

/** Groupes colonne Mouvements du Live. */
export function getLiveLyreGroups(groups: Group[], fixtures: Fixture[]): Group[] {
  return groups.filter((g) => isLiveMovementGroup(g, fixtures));
}

export const LIVE_ORPHAN_LYRE_GROUP_PREFIX = '__live_orphan_lyre__:';

export function isLiveOrphanLyreGroup(group: Group): boolean {
  return group.id.startsWith(LIVE_ORPHAN_LYRE_GROUP_PREFIX);
}

/** Lyres / scans patchés mais non assignés à un groupe (souvent les Dynamo). */
export function getOrphanMovingHeadFixtures(groups: Group[], fixtures: Fixture[]): Fixture[] {
  const assigned = new Set<number>();
  for (const g of groups) {
    for (const id of g.fixtureIds) assigned.add(id);
  }
  return fixtures.filter((f) => fixtureIsLyreControllable(f) && !assigned.has(f.id));
}

/** Cartes Live temporaires par modèle pour les moving heads hors groupe Patch. */
export function buildSyntheticLyreGroups(groups: Group[], fixtures: Fixture[]): Group[] {
  const orphans = getOrphanMovingHeadFixtures(groups, fixtures);
  const byModel = new Map<string, number[]>();
  for (const f of orphans) {
    const key = (f.model || f.name).trim() || 'Moving Head';
    const list = byModel.get(key) ?? [];
    list.push(f.id);
    byModel.set(key, list);
  }
  return [...byModel.entries()].map(([model, fixtureIds]) => ({
    id: `${LIVE_ORPHAN_LYRE_GROUP_PREFIX}${model}`,
    name: model,
    fixtureIds,
  }));
}

/** Groupes Patch + scans/lyres orphelins visibles en Live. */
export function getLiveLyreDisplayGroups(groups: Group[], fixtures: Fixture[]): Group[] {
  return [...getLiveLyreGroups(groups, fixtures), ...buildSyntheticLyreGroups(groups, fixtures)];
}

function groupHasSpecialKindFixture(group: Group, fixtures: Fixture[]): boolean {
  return group.fixtureIds.some((id) => {
    const f = fixtureById(fixtures, id);
    if (!f) return false;
    return f.type === 'Laser' || f.type === 'Effect' || f.type === 'Other';
  });
}

/**
 * Colonne Spéciaux (Divers) :
 * - case « Spéciaux » au Patch, ou
 * - repli : laser / effect / autre hors colonnes Ambiance et Mouvements.
 */
export function isLiveSpecialGroup(group: Group, fixtures: Fixture[]): boolean {
  if (group.fixtureIds.length === 0) return false;
  if (group.isSpecial === true) return true;
  if (isLiveAmbianceGroup(group, fixtures)) return false;
  if (isLiveMovementGroup(group, fixtures)) return false;
  return groupHasSpecialKindFixture(group, fixtures);
}

export function getLiveSpecialGroups(groups: Group[], fixtures: Fixture[]): Group[] {
  return groups.filter((g) => isLiveSpecialGroup(g, fixtures));
}

/** Groupes patchés mais absents des colonnes Live visibles. */
export function getLiveUnassignedGroups(groups: Group[], fixtures: Fixture[]): Group[] {
  const ambIds = new Set(getLiveAmbianceGroups(groups, fixtures).map((g) => g.id));
  const lyrIds = new Set(getLiveLyreGroups(groups, fixtures).map((g) => g.id));
  const specIds = new Set(getLiveSpecialGroups(groups, fixtures).map((g) => g.id));
  return groups.filter(
    (g) =>
      g.fixtureIds.length > 0 &&
      !ambIds.has(g.id) &&
      !lyrIds.has(g.id) &&
      !specIds.has(g.id)
  );
}

/** Groupes créés au Patch sans projecteur assigné. */
export function getLiveEmptyGroups(groups: Group[]): Group[] {
  return groups.filter((g) => g.fixtureIds.length === 0);
}

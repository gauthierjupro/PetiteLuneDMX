import type { Fixture, Group } from '../types';
import { resolveFixtureChannelDefs } from './fixtureDmxChannels';

function looksLikeScannerFixture(fixture: Fixture): boolean {
  const hay = `${fixture.model} ${fixture.name}`.toLowerCase();
  return (
    /dynamo|scan\s*led|scanner|moving|lyre|pico\s*spot|beam|wash/.test(hay) &&
    fixture.channels >= 7
  );
}

/** Lyre / scan (hors laser — les lasers passent par un groupe « Mouvement » au Patch). */
export function fixtureIsLyreControllable(fixture: Fixture): boolean {
  if (fixture.type === 'Laser') return false;
  if (fixture.type === 'Moving Head') return true;
  if (looksLikeScannerFixture(fixture)) return true;
  const defs = resolveFixtureChannelDefs(fixture);
  return defs.some((d) => d.type === 'pan') && defs.some((d) => d.type === 'tilt');
}

export function groupHasMovingHead(group: Group, fixtures: Fixture[]): boolean {
  return fixtures.some(
    (f) => group.fixtureIds.includes(f.id) && fixtureIsLyreControllable(f)
  );
}

/** Projecteur affichable dans la colonne Mouvements (lyre/scan ou laser). */
export function fixtureIsMovementCapable(fixture: Fixture): boolean {
  if (fixture.type === 'Laser') return true;
  return fixtureIsLyreControllable(fixture);
}

export function groupHasMovementCapable(group: Group, fixtures: Fixture[]): boolean {
  return fixtures.some(
    (f) => group.fixtureIds.includes(f.id) && fixtureIsMovementCapable(f)
  );
}

export function groupHasRgb(group: Group, fixtures: Fixture[]): boolean {
  return fixtures.some((f) => group.fixtureIds.includes(f.id) && f.type === 'RGB');
}

export function groupHasEffect(group: Group, fixtures: Fixture[]): boolean {
  return fixtures.some((f) => group.fixtureIds.includes(f.id) && f.type === 'Effect');
}

/** Pulse : groupes ambiance, sinon PAR / washes (pas lyres seules). */
export function pulseGroupIdsForAutoLive(groups: Group[], fixtures: Fixture[]): string[] {
  const ambiance = groups
    .filter((g) => g.isAmbiance && g.fixtureIds.length > 0)
    .map((g) => g.id);
  if (ambiance.length > 0) return ambiance;

  return groups
    .filter(
      (g) =>
        g.fixtureIds.length > 0 &&
        groupHasRgb(g, fixtures) &&
        !groupHasMovingHead(g, fixtures)
    )
    .map((g) => g.id);
}

/** Couleur auto : ambiance, sinon RGB + lyres. */
export function colorGroupIdsForAutoLive(groups: Group[], fixtures: Fixture[]): string[] {
  const ambiance = groups
    .filter((g) => g.isAmbiance && g.fixtureIds.length > 0)
    .map((g) => g.id);
  if (ambiance.length > 0) return ambiance;

  return groups
    .filter(
      (g) =>
        g.fixtureIds.length > 0 &&
        (groupHasRgb(g, fixtures) || groupHasMovingHead(g, fixtures))
    )
    .map((g) => g.id);
}

export function movementGroupIdsForAutoLive(groups: Group[], fixtures: Fixture[]): string[] {
  return groups
    .filter((g) => g.fixtureIds.length > 0 && groupHasMovingHead(g, fixtures))
    .map((g) => g.id);
}

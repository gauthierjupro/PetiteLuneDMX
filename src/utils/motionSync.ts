import { invoke } from '@tauri-apps/api/tauri';
import { loadFixtureProfilesFromStorage } from '../hooks/useFixtureProfiles';
import { CalibrationSettings, Fixture, Group, GroupMovement } from '../types';
import { fixtureChannelIndex } from './fixtureDmxChannels';
import { getLiveLyreDisplayGroups } from './liveGroups';
import {
  getFixtureMovementCenter,
  isGroupMovementCenterLinked,
  type GroupMovementCenters,
} from './groupMovementCenters';

export interface SyncMotionFixture {
  pan_address: number;
  tilt_address: number;
  index: number;
  invert_pan: boolean;
  invert_tilt: boolean;
  offset_pan: number;
  offset_tilt: number;
  center_pan: number;
  center_tilt: number;
}

export interface SyncMotionGroup {
  group_id: string;
  shape: GroupMovement['shape'];
  speed: number;
  size_pan: number;
  size_tilt: number;
  fan: number;
  invert_180: boolean;
  center_pan: number;
  center_tilt: number;
  custom_points: { x: number; y: number }[];
  fixtures: SyncMotionFixture[];
}

function motionFixtureEntries(
  group: Group,
  fixtures: Fixture[],
  fixtureCalibration: Record<number, CalibrationSettings>,
  groupPan: Record<string, number>,
  groupTilt: Record<string, number>,
  movementCenters: GroupMovementCenters | undefined,
  centerLinked: boolean
): SyncMotionFixture[] {
  const profiles = loadFixtureProfilesFromStorage();
  const out: SyncMotionFixture[] = [];

  const mhFixtures = group.fixtureIds
    .map((id) => fixtures.find((f) => f.id === id))
    .filter((f): f is Fixture => !!f && f.type === 'Moving Head');

  mhFixtures.forEach((f, index) => {
    const panIdx = fixtureChannelIndex(f, 'pan', profiles);
    const tiltIdx = fixtureChannelIndex(f, 'tilt', profiles);
    if (panIdx == null || tiltIdx == null) return;

    const cal = fixtureCalibration[f.id] || {
      invertPan: false,
      invertTilt: false,
      offsetPan: 0,
      offsetTilt: 0,
    };

    const gp = groupPan[group.id] ?? 127;
    const gt = groupTilt[group.id] ?? 127;
    const center = centerLinked
      ? { pan: gp, tilt: gt }
      : getFixtureMovementCenter(
          group.id,
          f.id,
          groupPan,
          groupTilt,
          movementCenters
        );

    out.push({
      pan_address: panIdx + 1,
      tilt_address: tiltIdx + 1,
      index,
      invert_pan: cal.invertPan,
      invert_tilt: cal.invertTilt,
      offset_pan: cal.offsetPan,
      offset_tilt: cal.offsetTilt,
      center_pan: center.pan,
      center_tilt: center.tilt,
    });
  });

  return out;
}

/** Construit le payload Rust à partir de l'état Live (groupes Patch + lyres orphelines). */
export function buildLiveMotionPayload(
  groups: Group[],
  fixtures: Fixture[],
  groupMovements: Record<string, GroupMovement>,
  groupPan: Record<string, number>,
  groupTilt: Record<string, number>,
  fixtureCalibration: Record<number, CalibrationSettings>,
  groupMovementCenters?: GroupMovementCenters,
  groupMovementCenterLinked?: Record<string, boolean>
): SyncMotionGroup[] {
  const displayGroups = getLiveLyreDisplayGroups(groups, fixtures);

  return displayGroups
    .map((group) => {
      const config = groupMovements[group.id];
      if (!config || config.shape === 'none') return null;

      const centerLinked = isGroupMovementCenterLinked(
        group.id,
        groupMovementCenterLinked
      );
      const fixtureEntries = motionFixtureEntries(
        group,
        fixtures,
        fixtureCalibration,
        groupPan,
        groupTilt,
        groupMovementCenters,
        centerLinked
      );
      if (fixtureEntries.length === 0) return null;

      return {
        group_id: group.id,
        shape: config.shape,
        speed: config.speed,
        size_pan: config.sizePan ?? 64,
        size_tilt: config.sizeTilt ?? 64,
        fan: config.fan ?? 0,
        invert_180: !!config.invert180,
        center_pan: groupPan[group.id] ?? 127,
        center_tilt: groupTilt[group.id] ?? 127,
        custom_points: (config.customPoints ?? []).map((p) => ({ x: p.x, y: p.y })),
        fixtures: fixtureEntries,
      } as SyncMotionGroup;
    })
    .filter((g): g is SyncMotionGroup => g !== null);
}

export function hasActiveLiveMotion(
  groups: Group[],
  fixtures: Fixture[],
  groupMovements: Record<string, GroupMovement>
): boolean {
  const ids = new Set(getLiveLyreDisplayGroups(groups, fixtures).map((g) => g.id));
  return Object.entries(groupMovements).some(
    ([id, cfg]) => cfg?.shape !== 'none' && ids.has(id)
  );
}

export async function syncLiveMotions(payload: SyncMotionGroup[]): Promise<void> {
  await invoke('sync_live_motions', { groups: payload });
}

export async function fetchMotionPreview(): Promise<
  Record<string, { pan: number; tilt: number }>
> {
  return invoke('get_motion_preview');
}

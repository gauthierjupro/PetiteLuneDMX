import { invoke } from '@tauri-apps/api/tauri';
import { CalibrationSettings, Fixture, Group, GroupMovement } from '../types';

export interface SyncMotionFixture {
  address: number;
  index: number;
  invert_pan: boolean;
  invert_tilt: boolean;
  offset_pan: number;
  offset_tilt: number;
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

/** Construit le payload Rust à partir de l'état Live. */
export function buildLiveMotionPayload(
  groups: Group[],
  fixtures: Fixture[],
  groupMovements: Record<string, GroupMovement>,
  groupPan: Record<string, number>,
  groupTilt: Record<string, number>,
  fixtureCalibration: Record<number, CalibrationSettings>
): SyncMotionGroup[] {
  return groups
    .map((group) => {
      const config = groupMovements[group.id];
      if (!config || config.shape === 'none') return null;

      const mhFixtures = group.fixtureIds
        .map((id) => fixtures.find((f) => f.id === id))
        .filter((f): f is Fixture => !!f && f.type === 'Moving Head');

      if (mhFixtures.length === 0) return null;

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
        fixtures: mhFixtures.map((f, index) => {
          const cal = fixtureCalibration[f.id] || {
            invertPan: false,
            invertTilt: false,
            offsetPan: 0,
            offsetTilt: 0,
          };
          return {
            address: f.address,
            index,
            invert_pan: cal.invertPan,
            invert_tilt: cal.invertTilt,
            offset_pan: cal.offsetPan,
            offset_tilt: cal.offsetTilt,
          };
        }),
      } as SyncMotionGroup;
    })
    .filter((g): g is SyncMotionGroup => g !== null);
}

export async function syncLiveMotions(payload: SyncMotionGroup[]): Promise<void> {
  await invoke('sync_live_motions', { groups: payload });
}

export async function fetchMotionPreview(): Promise<
  Record<string, { pan: number; tilt: number }>
> {
  return invoke('get_motion_preview');
}

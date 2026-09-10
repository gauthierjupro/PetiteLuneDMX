import { useEffect, useState } from 'react';
import { setLocalStorageDebounced } from '../utils/localStorageDebounced';
import {
  CalibrationSettings,
  CustomTrajectory,
  GroupMovement,
  GroupPosition,
  MovementPreset,
} from '../types';
import { useJsonLocalStorage } from './useJsonLocalStorage';

export function useLiveStore() {
  const [groupMovements, setGroupMovements] = useJsonLocalStorage<
    Record<string, GroupMovement>
  >('dmx_group_movements', {});

  const [groupCustomTrajectories, setGroupCustomTrajectories] = useJsonLocalStorage<
    Record<string, CustomTrajectory[]>
  >('dmx_custom_trajectories', {});

  const [groupPan, setGroupPan] = useJsonLocalStorage<Record<string, number>>(
    'dmx_group_pan',
    {}
  );
  const [groupTilt, setGroupTilt] = useJsonLocalStorage<Record<string, number>>(
    'dmx_group_tilt',
    {}
  );
  const [groupAutoColorActive, setGroupAutoColorActive] = useJsonLocalStorage<
    Record<string, boolean>
  >('dmx_group_auto_color', {});
  const [groupAutoGoboActive, setGroupAutoGoboActive] = useJsonLocalStorage<
    Record<string, boolean>
  >('dmx_group_auto_gobo', {});
  const [groupIntensities, setGroupIntensities] = useJsonLocalStorage<
    Record<string, { dim: number; str: number }>
  >('dmx_group_intensities', {});
  const [groupColors, setGroupColors] = useJsonLocalStorage<
    Record<string, { r: number; g: number; b: number; v?: number }>
  >('dmx_group_colors', {});
  const [groupGobos, setGroupGobos] = useJsonLocalStorage<Record<string, number>>(
    'dmx_group_gobos',
    {}
  );
  const [groupPositions, setGroupPositions] = useJsonLocalStorage<
    Record<string, GroupPosition[]>
  >('dmx_group_positions', {});
  const [groupMovementPresets, setGroupMovementPresets] = useJsonLocalStorage<
    Record<string, MovementPreset[]>
  >('dmx_group_movement_presets', {});
  const [fixtureCalibration, setFixtureCalibration] = useJsonLocalStorage<
    Record<number, CalibrationSettings>
  >('dmx_fixture_calibration', {});
  const [groupPulseActive, setGroupPulseActive] = useJsonLocalStorage<
    Record<string, boolean>
  >('dmx_group_pulse', {});

  const [masterDimmer, setMasterDimmer] = useState<number>(() => {
    const saved = localStorage.getItem('dmx_master_dimmer');
    return saved ? parseInt(saved, 10) : 255;
  });

  useEffect(() => {
    setLocalStorageDebounced('dmx_master_dimmer', masterDimmer.toString());
  }, [masterDimmer]);

  const [bpm, setBpm] = useState(120);
  const [pan, setPan] = useState(127);
  const [tilt, setTilt] = useState(127);

  const [liveGroupPositions, setLiveGroupPositions] = useState<
    Record<string, { pan: number; tilt: number }>
  >({});
  const [liveGroupColors, setLiveGroupColors] = useState<Record<string, number>>({});
  const [liveGroupGobos, setLiveGroupGobos] = useState<Record<string, number>>({});

  return {
    groupMovements,
    setGroupMovements,
    groupCustomTrajectories,
    setGroupCustomTrajectories,
    groupPan,
    setGroupPan,
    groupTilt,
    setGroupTilt,
    groupAutoColorActive,
    setGroupAutoColorActive,
    groupAutoGoboActive,
    setGroupAutoGoboActive,
    groupIntensities,
    setGroupIntensities,
    groupColors,
    setGroupColors,
    groupGobos,
    setGroupGobos,
    groupPositions,
    setGroupPositions,
    groupMovementPresets,
    setGroupMovementPresets,
    fixtureCalibration,
    setFixtureCalibration,
    groupPulseActive,
    setGroupPulseActive,
    masterDimmer,
    setMasterDimmer,
    bpm,
    setBpm,
    pan,
    setPan,
    tilt,
    setTilt,
    liveGroupPositions,
    setLiveGroupPositions,
    liveGroupColors,
    setLiveGroupColors,
    liveGroupGobos,
    setLiveGroupGobos,
  };
}

export type LiveStore = ReturnType<typeof useLiveStore>;

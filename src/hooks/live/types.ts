import type React from 'react';
import type {
  CalibrationSettings,
  Fixture,
  FixtureControlAction,
  Group,
  GroupIntensity,
  RgbColor,
} from '../../types';

export interface UseLiveLogicProps {
  fixtures: Fixture[];
  channels: number[];
  groups: Group[];
  updateDmx: (ch: number, val: string | number) => void;
  handleMultiFixtureAction: (
    fixtureIds: number[],
    action: FixtureControlAction,
    value: number | RgbColor
  ) => void;
  handleMasterDimmer: (val: number) => void;
  applyGlobalIntensity: (val: number) => void;
  masterDimmer: number;
  handleMasterStrobe: (val: number) => void;

  groupIntensities: Record<string, GroupIntensity>;
  setGroupIntensities: React.Dispatch<React.SetStateAction<Record<string, GroupIntensity>>>;
  groupColors: Record<string, RgbColor>;
  setGroupColors: React.Dispatch<React.SetStateAction<Record<string, RgbColor>>>;
  groupPulseActive: Record<string, boolean>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  groupAutoColorActive: Record<string, boolean>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupAutoGoboActive: Record<string, boolean>;
  setGroupAutoGoboActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupGobos: Record<string, number>;
  setGroupGobos: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  groupPan: Record<string, number>;
  setGroupPan: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  groupTilt: Record<string, number>;
  setGroupTilt: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  fixtureCalibration: Record<number, CalibrationSettings>;
  setFixtureCalibration: React.Dispatch<React.SetStateAction<Record<number, CalibrationSettings>>>;
}

export interface EffectsModalState {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  fixtureIds: number[];
}

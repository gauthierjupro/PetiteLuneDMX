import React from 'react';
import { hslToRgb } from '../../utils/colorUtils';
import { loadFixtureProfilesFromStorage } from '../useFixtureProfiles';
import {
  applyFixtureDmxAction,
  applyFixtureGobo,
  fixtureChannelIndex,
} from '../../utils/fixtureDmxChannels';
import { fixtureIsMovementCapable } from '../../utils/autoLiveGroups';
import type {
  CalibrationSettings,
  Fixture,
  FixtureControlAction,
  Group,
  GroupControlAction,
  GroupIntensity,
  RgbColor,
} from '../../types';

interface UseLiveActionsParams {
  fixtures: Fixture[];
  groups: Group[];
  updateDmx: (ch: number, val: string | number) => void;
  handleMultiFixtureAction: (
    fixtureIds: number[],
    action: FixtureControlAction,
    value: number | RgbColor
  ) => void;
  handleMasterDimmer: (val: number) => void;
  handleMasterStrobe: (val: number) => void;
  linkedGroups: string[];
  getLinkedFixtureIds: () => number[];
  groupIntensities: Record<string, GroupIntensity>;
  setGroupIntensities: React.Dispatch<React.SetStateAction<Record<string, GroupIntensity>>>;
  groupColors: Record<string, RgbColor>;
  setGroupColors: React.Dispatch<React.SetStateAction<Record<string, RgbColor>>>;
  groupPulseActive: Record<string, boolean>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupAutoColorActive: Record<string, boolean>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupAutoGoboActive: Record<string, boolean>;
  setGroupAutoGoboActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setGroupGobos: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setGroupPan: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setGroupTilt: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setGroupMovementCenters: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, { x: number; y: number }>>>
  >;
  fixtureCalibration: Record<number, CalibrationSettings>;
  isAmbianceAutoColorActive: boolean;
  setIsAmbianceAutoColorActive: React.Dispatch<React.SetStateAction<boolean>>;
  isAmbiancePulseActive: boolean;
  setIsAmbiancePulseActive: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentMasterIntensity: React.Dispatch<React.SetStateAction<number>>;
  setGlobalStrobe: React.Dispatch<React.SetStateAction<number>>;
  setIsAutoColorActive: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Envois DMX Live : intensité, couleur, macros, mouvement, master. */
export function useLiveActions({
  fixtures,
  groups,
  updateDmx,
  handleMultiFixtureAction,
  handleMasterDimmer,
  handleMasterStrobe,
  linkedGroups,
  getLinkedFixtureIds,
  groupIntensities,
  setGroupIntensities,
  groupColors,
  setGroupColors,
  groupPulseActive,
  setGroupPulseActive,
  groupAutoColorActive,
  setGroupAutoColorActive,
  groupAutoGoboActive,
  setGroupAutoGoboActive,
  setGroupGobos,
  setGroupPan,
  setGroupTilt,
  setGroupMovementCenters,
  fixtureCalibration,
  isAmbianceAutoColorActive,
  setIsAmbianceAutoColorActive,
  isAmbiancePulseActive,
  setIsAmbiancePulseActive,
  setCurrentMasterIntensity,
  setGlobalStrobe,
  setIsAutoColorActive,
}: UseLiveActionsParams) {
  const [activeMacro, setActiveMacro] = React.useState<string | null>(null);
  const allFixtureIds = React.useMemo(() => fixtures.map((f) => f.id), [fixtures]);

  const sendIntensity = React.useCallback(
    (
      fixtureIds: number[],
      type: 'dim' | 'str',
      val: number,
      groupId?: string,
      isAuto = false
    ) => {
      if (type === 'dim' && !isAuto) {
        if (groupId) {
          setGroupPulseActive((prev) => ({ ...prev, [groupId]: false }));
        } else {
          const newPulse = { ...groupPulseActive };
          linkedGroups.forEach((id) => {
            newPulse[id] = false;
          });
          setGroupPulseActive(newPulse);
          setIsAmbiancePulseActive(false);
        }
      }

      const targetIds = groupId ? fixtureIds : getLinkedFixtureIds();
      if (targetIds.length === 0) return;

      handleMultiFixtureAction(targetIds, type === 'dim' ? 'dimmer' : 'strobe', val);

      if (!isAuto) {
        if (!groupId) {
          const newIntensities = { ...groupIntensities };
          linkedGroups.forEach((id) => {
            newIntensities[id] = { ...newIntensities[id], [type]: val };
          });
          setGroupIntensities(newIntensities);
        } else {
          setGroupIntensities((prev) => ({
            ...prev,
            [groupId]: { ...prev[groupId], [type]: val },
          }));
        }
      }
    },
    [
      groupPulseActive,
      setGroupPulseActive,
      getLinkedFixtureIds,
      handleMultiFixtureAction,
      linkedGroups,
      groupIntensities,
      setGroupIntensities,
      setIsAmbiancePulseActive,
    ]
  );

  const sendColor = React.useCallback(
    (
      fixtureIds: number[],
      r: number,
      g: number,
      b: number,
      groupId?: string,
      isAuto = false,
      wheelValue?: number
    ) => {
      if (!isAuto) {
        if (groupId) {
          setGroupAutoColorActive((prev) => ({ ...prev, [groupId]: false }));
        } else {
          const newAuto = { ...groupAutoColorActive };
          linkedGroups.forEach((id) => {
            newAuto[id] = false;
          });
          setGroupAutoColorActive(newAuto);
          setIsAmbianceAutoColorActive(false);
        }
      }

      const targetIds = !groupId ? getLinkedFixtureIds() : fixtureIds;

      const profiles = loadFixtureProfilesFromStorage();
      targetIds.forEach((id) => {
        const fixture = fixtures.find((f) => f.id === id);
        if (!fixture) return;
        if (wheelValue !== undefined) {
          const colorCh = fixtureChannelIndex(fixture, 'color', profiles);
          if (colorCh != null) updateDmx(colorCh, wheelValue);
          return;
        }
        applyFixtureDmxAction(fixture, 'color', { r, g, b }, updateDmx, profiles);
      });

      if (!groupId) {
        const newColors = { ...groupColors };
        linkedGroups.forEach((id) => {
          newColors[id] = { r, g, b, v: wheelValue };
        });
        setGroupColors(newColors);
      } else {
        setGroupColors((prev) => ({ ...prev, [groupId]: { r, g, b, v: wheelValue } }));
      }
    },
    [
      getLinkedFixtureIds,
      fixtures,
      updateDmx,
      linkedGroups,
      groupAutoColorActive,
      setGroupAutoColorActive,
      groupColors,
      setGroupColors,
      setIsAmbianceAutoColorActive,
    ]
  );

  const handleGlobalAction = React.useCallback(
    (action: GroupControlAction, value: number | RgbColor) => {
      if (action === 'dimmer' && typeof value === 'number') {
        setCurrentMasterIntensity(value);
        handleMasterDimmer(value);
        if (value === 0 || value === 255) {
          setIsAmbiancePulseActive(false);
          setGroupPulseActive((prev) => {
            const resetPulse: Record<string, boolean> = {};
            Object.keys(prev).forEach((key) => {
              resetPulse[key] = false;
            });
            return resetPulse;
          });
        }
      } else if (action === 'strobe' && typeof value === 'number') {
        setGlobalStrobe(value);
        handleMasterStrobe(value);
        const newIntensities = { ...groupIntensities };
        groups.forEach((g) => {
          if (newIntensities[g.id]) {
            newIntensities[g.id] = { ...newIntensities[g.id], str: value };
          } else {
            newIntensities[g.id] = { dim: 255, str: value };
          }
        });
        setGroupIntensities(newIntensities);
      } else if (action === 'color' && typeof value === 'object') {
        handleMultiFixtureAction(allFixtureIds, 'color', value);
        const newColors = { ...groupColors };
        groups.forEach((g) => {
          newColors[g.id] = value;
        });
        setGroupColors(newColors);
      }
    },
    [
      handleMasterDimmer,
      setGroupPulseActive,
      handleMasterStrobe,
      groupIntensities,
      groups,
      setGroupIntensities,
      handleMultiFixtureAction,
      allFixtureIds,
      groupColors,
      setGroupColors,
      setCurrentMasterIntensity,
      setGlobalStrobe,
      setIsAmbiancePulseActive,
    ]
  );

  const handleMacro = React.useCallback(
    (fixtureIds: number[], macro: string, groupId?: string) => {
      if (fixtureIds.length === 0 && (macro === 'U2' || macro === 'U4')) {
        setActiveMacro('ERROR');
        setTimeout(() => setActiveMacro(null), 1000);
        return;
      }

      if (macro === 'U2' || macro === 'U4' || macro === 'U5') {
        setActiveMacro(macro);
        setTimeout(() => setActiveMacro(null), 500);
      }

      switch (macro) {
        case 'U1':
          if (!groupId) {
            const newState = !isAmbianceAutoColorActive;
            setIsAmbianceAutoColorActive(newState);
            const newGroupAuto = { ...groupAutoColorActive };
            const newColors = { ...groupColors };
            linkedGroups.forEach((id) => {
              newGroupAuto[id] = newState;
              if (newState) newColors[id] = { r: 255, g: 255, b: 255, v: undefined };
            });
            setGroupAutoColorActive(newGroupAuto);
            setGroupColors(newColors);
          } else {
            const newState = !groupAutoColorActive[groupId];
            setGroupAutoColorActive((prev) => ({ ...prev, [groupId]: newState }));
            if (newState) {
              setGroupColors((prev) => ({
                ...prev,
                [groupId]: { r: 255, g: 255, b: 255, v: undefined },
              }));
            }
          }
          break;
        case 'U2':
          handleMultiFixtureAction(fixtureIds, 'strobe', 255);
          setTimeout(() => {
            handleMultiFixtureAction(fixtureIds, 'strobe', 0);
            if (!groupId) {
              const newIntensities = { ...groupIntensities };
              linkedGroups.forEach((id) => {
                if (newIntensities[id]) {
                  newIntensities[id] = { ...newIntensities[id], str: 0 };
                }
              });
              setGroupIntensities(newIntensities);
            } else {
              setGroupIntensities((prev) => ({
                ...prev,
                [groupId]: { ...prev[groupId], str: 0 },
              }));
            }
          }, 1000);
          break;
        case 'U3':
          if (!groupId) {
            const newState = !isAmbiancePulseActive;
            setIsAmbiancePulseActive(newState);
            const newGroupPulse = { ...groupPulseActive };
            linkedGroups.forEach((id) => {
              newGroupPulse[id] = newState;
            });
            setGroupPulseActive(newGroupPulse);
          } else {
            setGroupPulseActive((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
          }
          break;
        case 'U4': {
          const r = Math.floor(Math.random() * 256);
          const g = Math.floor(Math.random() * 256);
          const b = Math.floor(Math.random() * 256);
          sendColor(fixtureIds, r, g, b, groupId);
          break;
        }
        case 'U5':
          if (fixtureIds.length === 0) return;
          fixtureIds.forEach((id, index) => {
            const hue = (index / fixtureIds.length) * 360;
            const { r, g, b } = hslToRgb(hue, 100, 50);
            handleMultiFixtureAction([id], 'color', { r, g, b });
          });
          if (!groupId) {
            const firstHsl = hslToRgb(0, 100, 50);
            const newColors = { ...groupColors };
            linkedGroups.forEach((id) => {
              newColors[id] = firstHsl;
            });
            setGroupColors(newColors);
          }
          break;
        case 'U6':
          if (groupId) {
            const newState = !groupAutoGoboActive[groupId];
            setGroupAutoGoboActive((prev) => ({ ...prev, [groupId]: newState }));
            if (newState) {
              setGroupGobos((prev) => ({ ...prev, [groupId]: -1 }));
            }
          }
          break;
        default:
          if (macro.startsWith('G')) {
            const goboIndex = parseInt(macro.substring(1), 10);
            if (!isNaN(goboIndex) && groupId) {
              setGroupAutoGoboActive((prev) => ({ ...prev, [groupId]: false }));
              setGroupGobos((prev) => ({ ...prev, [groupId]: goboIndex }));
              const dmxValue = goboIndex * 32;
              const profiles = loadFixtureProfilesFromStorage();
              fixtureIds.forEach((id) => {
                const fixture = fixtures.find((f) => f.id === id);
                if (fixture) applyFixtureGobo(fixture, dmxValue, updateDmx, profiles);
              });
            }
          }
          break;
      }
    },
    [
      isAmbianceAutoColorActive,
      groupAutoColorActive,
      setGroupAutoColorActive,
      groupColors,
      setGroupColors,
      linkedGroups,
      handleMultiFixtureAction,
      groupIntensities,
      setGroupIntensities,
      isAmbiancePulseActive,
      groupPulseActive,
      setGroupPulseActive,
      sendColor,
      groupAutoGoboActive,
      setGroupAutoGoboActive,
      setGroupGobos,
      fixtures,
      updateDmx,
      setIsAmbianceAutoColorActive,
      setIsAmbiancePulseActive,
    ]
  );

  const sendMovement = React.useCallback(
    (
      fixtureIds: number[],
      pan: number,
      tilt: number,
      groupId: string,
      options?: { onlyFixtureId?: number }
    ) => {
      const profiles = loadFixtureProfilesFromStorage();
      const targetIds = options?.onlyFixtureId
        ? [options.onlyFixtureId]
        : fixtureIds;
      targetIds.forEach((id) => {
        const fixture = fixtures.find((f) => f.id === id);
        if (!fixture || !fixtureIsMovementCapable(fixture)) return;
        const cal = fixtureCalibration[id] || {
          invertPan: false,
          invertTilt: false,
          offsetPan: 0,
          offsetTilt: 0,
        };
        let finalPan = Math.min(255, Math.max(0, pan + (cal.offsetPan || 0)));
        let finalTilt = Math.min(255, Math.max(0, tilt + (cal.offsetTilt || 0)));
        if (cal.invertPan) finalPan = 255 - finalPan;
        if (cal.invertTilt) finalTilt = 255 - finalTilt;
        applyFixtureDmxAction(fixture, 'pan', finalPan, updateDmx, profiles);
        applyFixtureDmxAction(fixture, 'tilt', finalTilt, updateDmx, profiles);
      });
      const fixtureKey = (id: number) => String(id);
      if (!options?.onlyFixtureId) {
        setGroupPan((prev) => ({ ...prev, [groupId]: pan }));
        setGroupTilt((prev) => ({ ...prev, [groupId]: tilt }));
        setGroupMovementCenters((prev) => {
          const groupMap = { ...(prev[groupId] ?? {}) };
          targetIds.forEach((id) => {
            const fixture = fixtures.find((f) => f.id === id);
            if (fixture && fixtureIsMovementCapable(fixture)) {
              groupMap[fixtureKey(id)] = { x: pan, y: tilt };
            }
          });
          return { ...prev, [groupId]: groupMap };
        });
      } else {
        const onlyId = options.onlyFixtureId;
        setGroupMovementCenters((prev) => ({
          ...prev,
          [groupId]: {
            ...(prev[groupId] ?? {}),
            [fixtureKey(onlyId)]: { x: pan, y: tilt },
          },
        }));
      }
    },
    [
      fixtures,
      fixtureCalibration,
      updateDmx,
      setGroupPan,
      setGroupTilt,
      setGroupMovementCenters,
    ]
  );

  const handleEndOfSong = React.useCallback(() => {
    setIsAutoColorActive(false);
    fixtures
      .filter((f) => f.type === 'Moving Head')
      .forEach((f) => {
        handleMultiFixtureAction([f.id], 'dimmer', 0);
        handleMultiFixtureAction([f.id], 'pan', 128);
        handleMultiFixtureAction([f.id], 'tilt', 128);
      });
    fixtures
      .filter((f) => f.type === 'Laser' || f.type === 'Effect')
      .forEach((f) => {
        updateDmx(f.address - 1, 0);
      });
  }, [fixtures, handleMultiFixtureAction, updateDmx, setIsAutoColorActive]);

  return {
    activeMacro,
    sendIntensity,
    sendColor,
    handleGlobalAction,
    handleMacro,
    sendMovement,
    handleEndOfSong,
  };
}

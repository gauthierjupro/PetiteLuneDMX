import React, { useEffect, useRef } from 'react';
import type { FixtureControlAction, Group, GroupIntensity, RgbColor, UniversePreset } from '../../types';
import { setLocalStorageJsonDebounced, setLocalStorageDebounced } from '../../utils/localStorageDebounced';
import type { EffectsModalState } from './types';

interface UseLiveSessionStateParams {
  groups: Group[];
  groupIntensities: Record<string, GroupIntensity>;
  groupColors: Record<string, RgbColor>;
  handleMultiFixtureAction: (
    fixtureIds: number[],
    action: FixtureControlAction,
    value: number | RgbColor
  ) => void;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  masterDimmer: number;
}

/** État de session Live : liens groupes, strobe, flags ambiance, modales. */
export function useLiveSessionState({
  groups,
  groupIntensities,
  groupColors,
  handleMultiFixtureAction,
  setGroupAutoColorActive,
  setGroupPulseActive,
  masterDimmer,
}: UseLiveSessionStateParams) {
  const [presets] = React.useState<UniversePreset[]>([]);
  const [linkedGroups, setLinkedGroups] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('dmx_linked_groups');
    return saved ? JSON.parse(saved) : [];
  });

  const [globalStrobe, setGlobalStrobe] = React.useState(0);
  const [isAutoColorActive, setIsAutoColorActive] = React.useState(false);
  const [isPulseActive, setIsPulseActive] = React.useState(false);
  const [isAmbianceAutoColorActive, setIsAmbianceAutoColorActive] = React.useState(() => {
    return localStorage.getItem('dmx_ambiance_auto_color') === 'true';
  });
  const [isAmbiancePulseActive, setIsAmbiancePulseActive] = React.useState(() => {
    return localStorage.getItem('dmx_ambiance_pulse') === 'true';
  });

  const [groupStrobeValues, setGroupStrobeValues] = React.useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('dmx_group_strobe_values');
    return saved ? JSON.parse(saved) : { master: 128 };
  });

  const [currentMasterIntensity, setCurrentMasterIntensity] = React.useState(masterDimmer);
  const [fadeTime, setFadeTime] = React.useState(0);

  const [isCalibrationOpen, setIsCalibrationOpen] = React.useState(false);
  const [isStrobeModalOpen, setIsStrobeModalOpen] = React.useState(false);
  const [activeStrobeGroupId, setActiveStrobeGroupId] = React.useState<string | null>(null);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = React.useState(false);
  const [presetToSaveId, setPresetToSaveId] = React.useState<string | null>(null);
  const [tempStrobeVal, setTempStrobeVal] = React.useState('');
  const [effectsModalState, setEffectsModalState] = React.useState<EffectsModalState>({
    isOpen: false,
    groupId: '',
    groupName: '',
    fixtureIds: [],
  });

  const sessionPersistRef = useRef({
    linkedGroups,
    isAmbianceAutoColorActive,
    isAmbiancePulseActive,
    groupStrobeValues,
  });
  sessionPersistRef.current = {
    linkedGroups,
    isAmbianceAutoColorActive,
    isAmbiancePulseActive,
    groupStrobeValues,
  };

  useEffect(() => {
    const t = setTimeout(() => {
      const s = sessionPersistRef.current;
      setLocalStorageJsonDebounced('dmx_linked_groups', s.linkedGroups);
      setLocalStorageDebounced('dmx_ambiance_auto_color', s.isAmbianceAutoColorActive.toString());
      setLocalStorageDebounced('dmx_ambiance_pulse', s.isAmbiancePulseActive.toString());
      setLocalStorageJsonDebounced('dmx_group_strobe_values', s.groupStrobeValues);
    }, 300);
    return () => clearTimeout(t);
  }, [linkedGroups, isAmbianceAutoColorActive, isAmbiancePulseActive, groupStrobeValues]);

  const getLinkedFixtureIds = React.useCallback(() => {
    return groups.filter((g) => linkedGroups.includes(g.id)).flatMap((g) => g.fixtureIds);
  }, [groups, linkedGroups]);

  const toggleGroupLink = React.useCallback(
    (groupId: string) => {
      setLinkedGroups((prev) => {
        const isLinking = !prev.includes(groupId);
        const next = isLinking ? [...prev, groupId] : prev.filter((id) => id !== groupId);
        if (isLinking) {
          if (isAmbianceAutoColorActive) {
            setGroupAutoColorActive((curr) => ({ ...curr, [groupId]: true }));
          }
          if (isAmbiancePulseActive) {
            setGroupPulseActive((curr) => ({ ...curr, [groupId]: true }));
          }
        } else {
          const group = groups.find((g) => g.id === groupId);
          if (group) {
            const currentDim = groupIntensities[groupId]?.dim ?? 255;
            const currentStr = groupIntensities[groupId]?.str ?? 0;
            const currentColor = groupColors[groupId] ?? { r: 255, g: 255, b: 255 };
            handleMultiFixtureAction(group.fixtureIds, 'dimmer', currentDim);
            handleMultiFixtureAction(group.fixtureIds, 'strobe', currentStr);
            handleMultiFixtureAction(group.fixtureIds, 'color', currentColor);
          }
        }
        return next;
      });
    },
    [
      isAmbianceAutoColorActive,
      setGroupAutoColorActive,
      isAmbiancePulseActive,
      setGroupPulseActive,
      groups,
      groupIntensities,
      groupColors,
      handleMultiFixtureAction,
    ]
  );

  const onStrobeEdit = React.useCallback(
    (groupId: string | null) => {
      const id = groupId || 'master';
      const value = groupStrobeValues[id] || 128;
      setTempStrobeVal(Math.round((value / 255) * 100).toString());
      setActiveStrobeGroupId(id);
      setIsStrobeModalOpen(true);
    },
    [groupStrobeValues]
  );

  return {
    presets,
    linkedGroups,
    setLinkedGroups,
    globalStrobe,
    setGlobalStrobe,
    isAutoColorActive,
    setIsAutoColorActive,
    isPulseActive,
    setIsPulseActive,
    isAmbianceAutoColorActive,
    setIsAmbianceAutoColorActive,
    isAmbiancePulseActive,
    setIsAmbiancePulseActive,
    groupStrobeValues,
    setGroupStrobeValues,
    currentMasterIntensity,
    setCurrentMasterIntensity,
    fadeTime,
    setFadeTime,
    isCalibrationOpen,
    setIsCalibrationOpen,
    isStrobeModalOpen,
    setIsStrobeModalOpen,
    activeStrobeGroupId,
    isSavePresetModalOpen,
    setIsSavePresetModalOpen,
    presetToSaveId,
    setPresetToSaveId,
    tempStrobeVal,
    setTempStrobeVal,
    effectsModalState,
    setEffectsModalState,
    getLinkedFixtureIds,
    toggleGroupLink,
    onStrobeEdit,
  };
}

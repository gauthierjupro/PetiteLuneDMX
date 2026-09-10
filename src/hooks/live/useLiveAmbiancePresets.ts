import React from 'react';
import type { AmbiancePreset, Group, GroupIntensity, LiveGroupState, RgbColor } from '../../types';

interface UseLiveAmbiancePresetsParams {
  groups: Group[];
  groupIntensities: Record<string, GroupIntensity>;
  groupColors: Record<string, RgbColor>;
  groupAutoColorActive: Record<string, boolean>;
  groupPulseActive: Record<string, boolean>;
  setGroupIntensities: React.Dispatch<React.SetStateAction<Record<string, GroupIntensity>>>;
  setGroupColors: React.Dispatch<React.SetStateAction<Record<string, RgbColor>>>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleMultiFixtureAction: (
    fixtureIds: number[],
    action: 'dimmer' | 'color' | 'strobe' | 'pan' | 'tilt',
    value: number | RgbColor
  ) => void;
}

/** Presets d'ambiance (capture / apply) + persistance. */
export function useLiveAmbiancePresets({
  groups,
  groupIntensities,
  groupColors,
  groupAutoColorActive,
  groupPulseActive,
  setGroupIntensities,
  setGroupColors,
  setGroupAutoColorActive,
  setGroupPulseActive,
  handleMultiFixtureAction,
}: UseLiveAmbiancePresetsParams) {
  const [customPresets, setCustomPresets] = React.useState<Record<string, AmbiancePreset>>(() => {
    const saved = localStorage.getItem('dmx_custom_ambiance_presets');
    if (saved) return JSON.parse(saved);
    const initial: Record<string, AmbiancePreset> = {};
    for (let i = 1; i <= 8; i++) {
      initial[i.toString()] = { name: `Ambiance ${i}`, groupStates: {} };
    }
    return initial;
  });

  React.useEffect(() => {
    localStorage.setItem('dmx_custom_ambiance_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  const captureAmbianceState = React.useCallback(
    (presetName: string): AmbiancePreset => {
      const states: Record<string, LiveGroupState> = {};
      groups.forEach((g) => {
        states[g.id] = {
          dim: groupIntensities[g.id]?.dim ?? 255,
          str: groupIntensities[g.id]?.str ?? 0,
          color: groupColors[g.id] ?? { r: 255, g: 255, b: 255 },
          auto: groupAutoColorActive[g.id] ?? false,
          pulse: groupPulseActive[g.id] ?? false,
        };
      });
      return { name: presetName, groupStates: states };
    },
    [groups, groupIntensities, groupColors, groupAutoColorActive, groupPulseActive]
  );

  const applyAmbiancePreset = React.useCallback(
    (presetId: string) => {
      const preset = customPresets[presetId];
      if (!preset || Object.keys(preset.groupStates).length === 0) return;

      const newIntensities = { ...groupIntensities };
      const newColors = { ...groupColors };
      const newAuto = { ...groupAutoColorActive };
      const newPulse = { ...groupPulseActive };

      Object.entries(preset.groupStates).forEach(([groupId, state]) => {
        const group = groups.find((g) => g.id === groupId);
        if (group) {
          newIntensities[groupId] = { dim: state.dim, str: state.str };
          newColors[groupId] = state.color;
          newAuto[groupId] = state.auto ?? false;
          newPulse[groupId] = state.pulse ?? false;

          handleMultiFixtureAction(group.fixtureIds, 'dimmer', state.dim);
          handleMultiFixtureAction(group.fixtureIds, 'strobe', state.str);
          handleMultiFixtureAction(group.fixtureIds, 'color', state.color);
        }
      });

      setGroupIntensities(newIntensities);
      setGroupColors(newColors);
      setGroupAutoColorActive(newAuto);
      setGroupPulseActive(newPulse);
    },
    [
      customPresets,
      groupIntensities,
      groupColors,
      groupAutoColorActive,
      groupPulseActive,
      groups,
      handleMultiFixtureAction,
      setGroupIntensities,
      setGroupColors,
      setGroupAutoColorActive,
      setGroupPulseActive,
    ]
  );

  return {
    customPresets,
    setCustomPresets,
    captureAmbianceState,
    applyAmbiancePreset,
  };
}

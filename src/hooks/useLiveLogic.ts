import React from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { hsvToRgb, rgbToHsv, hslToRgb } from '../utils/colorUtils';
import { useAudioAnalyzer } from './useAudioAnalyzer';

interface GroupState {
  dim: number;
  str: number;
  color: { r: number, g: number, b: number, v?: number };
  pan?: number;
  tilt?: number;
  gobo?: number;
  auto?: boolean;
  pulse?: boolean;
}

interface AmbiancePreset {
  name: string;
  groupStates: Record<string, GroupState>;
}

interface Preset {
  id: string;
  name: string;
  data: number[];
  timestamp: string;
}

interface CalibrationSettings {
  invertPan: boolean;
  invertTilt: boolean;
  offsetPan: number;
  offsetTilt: number;
}

interface UseLiveLogicProps {
  fixtures: any[];
  channels: number[];
  groups: any[];
  updateDmx: (ch: number, val: string | number) => void;
  handleMultiFixtureAction: (fixtureIds: number[], action: 'dimmer' | 'color' | 'strobe' | 'pan' | 'tilt', value: any) => void;
  handleMasterDimmer: (val: number) => void;
  applyGlobalIntensity: (val: number) => void;
  masterDimmer: number;
  handleMasterStrobe: (val: number) => void;
  
  groupIntensities: Record<string, {dim: number, str: number}>;
  setGroupIntensities: React.Dispatch<React.SetStateAction<any>>;
  groupColors: Record<string, {r: number, g: number, b: number, v?: number}>;
  setGroupColors: React.Dispatch<React.SetStateAction<any>>;
  groupPulseActive: Record<string, boolean>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<any>>;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<any>>;
  groupAutoColorActive: Record<string, boolean>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<any>>;
  groupAutoGoboActive: Record<string, boolean>;
  setGroupAutoGoboActive: React.Dispatch<React.SetStateAction<any>>;
  groupGobos: Record<string, number>;
  setGroupGobos: React.Dispatch<React.SetStateAction<any>>;
  groupPan: Record<string, number>;
  setGroupPan: React.Dispatch<React.SetStateAction<any>>;
  groupTilt: Record<string, number>;
  setGroupTilt: React.Dispatch<React.SetStateAction<any>>;
  fixtureCalibration: Record<number, CalibrationSettings>;
  setFixtureCalibration: React.Dispatch<React.SetStateAction<any>>;
}

export const useLiveLogic = ({
  fixtures,
  channels,
  groups,
  updateDmx,
  handleMultiFixtureAction,
  handleMasterDimmer,
  applyGlobalIntensity,
  masterDimmer,
  handleMasterStrobe,
  groupIntensities,
  setGroupIntensities,
  groupColors,
  setGroupColors,
  groupPulseActive,
  setGroupPulseActive,
  bpm,
  setBpm,
  groupAutoColorActive,
  setGroupAutoColorActive,
  groupAutoGoboActive,
  setGroupAutoGoboActive,
  groupGobos,
  setGroupGobos,
  groupPan,
  setGroupPan,
  groupTilt,
  setGroupTilt,
  fixtureCalibration,
  setFixtureCalibration
}: UseLiveLogicProps) => {
  const [presets, setPresets] = React.useState<Preset[]>([]);
  const [tapTimes, setTapTimes] = React.useState<number[]>([]);
  const [isBeatActive, setIsBeatActive] = React.useState(false);
  const [isAudioActive, setIsAudioActive] = React.useState(false);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = React.useState<string | null>(() => {
    return localStorage.getItem('dmx_audio_device_id');
  });
  const { stats: audioStats, devices: audioDevices } = useAudioAnalyzer(isAudioActive, selectedAudioDeviceId);
  
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
  const [activeMacro, setActiveMacro] = React.useState<string | null>(null);
  const [fadeTime, setFadeTime] = React.useState(0);

  const [customPresets, setCustomPresets] = React.useState<Record<string, AmbiancePreset>>(() => {
    const saved = localStorage.getItem('dmx_custom_ambiance_presets');
    if (saved) return JSON.parse(saved);
    const initial: Record<string, AmbiancePreset> = {};
    for (let i = 1; i <= 8; i++) {
      initial[i.toString()] = { name: `Ambiance ${i}`, groupStates: {} };
    }
    return initial;
  });

  const [userColors, setUserColors] = React.useState<Record<string, {r: number, g: number, b: number}>>(() => {
    const saved = localStorage.getItem('dmx_user_colors');
    return saved ? JSON.parse(saved) : {};
  });

  // Modals state
  const [isCalibrationOpen, setIsCalibrationOpen] = React.useState(false);
  const [isStrobeModalOpen, setIsStrobeModalOpen] = React.useState(false);
  const [activeStrobeGroupId, setActiveStrobeGroupId] = React.useState<string | null>(null);
  const [isColorModalOpen, setIsColorModalOpen] = React.useState(false);
  const [activeColorGroupId, setActiveColorGroupId] = React.useState<string | null>(null);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = React.useState(false);
  const [presetToSaveId, setPresetToSaveId] = React.useState<string | null>(null);
  const [activeUserColorToEdit, setActiveUserColorToEdit] = React.useState<string | null>(null);
  const [activePresetToEdit, setActivePresetToEdit] = React.useState<string | null>(null);

  // Temporary edit states
  const [tempColor, setTempColor] = React.useState({ r: 255, g: 255, b: 255 });
  const [tempHue, setTempHue] = React.useState(0);
  const [tempSat, setTempSat] = React.useState(100);
  const [tempLum, setTempLum] = React.useState(50);
  const [tempStrobeVal, setTempStrobeVal] = React.useState("");
  const [isDraggingColor, setIsDraggingColor] = React.useState(false);
  const [isDraggingHue, setIsDraggingHue] = React.useState(false);
  const [effectsModalState, setEffectsModalState] = React.useState<{isOpen: boolean, groupId: string, groupName: string, fixtureIds: number[]}>({
    isOpen: false,
    groupId: '',
    groupName: '',
    fixtureIds: []
  });

  const colorWheelRef = React.useRef<HTMLDivElement>(null);
  const hueSliderRef = React.useRef<HTMLDivElement>(null);
  const autoColorHueRef = React.useRef(0);
  const pulseIntensityRef = React.useRef(255);
  const audioPeakTimesRef = React.useRef<number[]>([]);

  // LocalStorage sync
  React.useEffect(() => {
    localStorage.setItem('dmx_linked_groups', JSON.stringify(linkedGroups));
    localStorage.setItem('dmx_ambiance_auto_color', isAmbianceAutoColorActive.toString());
    localStorage.setItem('dmx_ambiance_pulse', isAmbiancePulseActive.toString());
    localStorage.setItem('dmx_group_strobe_values', JSON.stringify(groupStrobeValues));
    localStorage.setItem('dmx_user_colors', JSON.stringify(userColors));
    localStorage.setItem('dmx_custom_ambiance_presets', JSON.stringify(customPresets));
    if (selectedAudioDeviceId) {
      localStorage.setItem('dmx_audio_device_id', selectedAudioDeviceId);
    }
  }, [linkedGroups, isAmbianceAutoColorActive, isAmbiancePulseActive, groupStrobeValues, userColors, customPresets, selectedAudioDeviceId]);

  const allFixtureIds = React.useMemo(() => fixtures.map(f => f.id), [fixtures]);

  const getLinkedFixtureIds = React.useCallback(() => {
    return groups
      .filter(g => linkedGroups.includes(g.id))
      .flatMap(g => g.fixtureIds);
  }, [groups, linkedGroups]);

  const captureAmbianceState = React.useCallback((presetName: string): AmbiancePreset => {
    const states: Record<string, GroupState> = {};
    groups.forEach(g => {
      states[g.id] = {
        dim: groupIntensities[g.id]?.dim ?? 255,
        str: groupIntensities[g.id]?.str ?? 0,
        color: groupColors[g.id] ?? { r: 255, g: 255, b: 255 },
        auto: groupAutoColorActive[g.id] ?? false,
        pulse: groupPulseActive[g.id] ?? false
      };
    });
    return { name: presetName, groupStates: states };
  }, [groups, groupIntensities, groupColors, groupAutoColorActive, groupPulseActive]);

  const applyAmbiancePreset = React.useCallback((presetId: string) => {
    const preset = customPresets[presetId];
    if (!preset || Object.keys(preset.groupStates).length === 0) return;

    const newIntensities = { ...groupIntensities };
    const newColors = { ...groupColors };
    const newAuto = { ...groupAutoColorActive };
    const newPulse = { ...groupPulseActive };

    Object.entries(preset.groupStates).forEach(([groupId, state]) => {
      const group = groups.find(g => g.id === groupId);
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
  }, [customPresets, groupIntensities, groupColors, groupAutoColorActive, groupPulseActive, groups, handleMultiFixtureAction]);

  const sendIntensity = React.useCallback((fixtureIds: number[], type: 'dim' | 'str', val: number, groupId?: string, isAuto = false) => {
    if (type === 'dim' && !isAuto) {
      if (groupId) {
        setGroupPulseActive((prev: Record<string, boolean>) => ({ ...prev, [groupId]: false }));
      } else {
        const newPulse = { ...groupPulseActive };
        linkedGroups.forEach(id => { newPulse[id] = false; });
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
        linkedGroups.forEach(id => {
          newIntensities[id] = { ...newIntensities[id], [type]: val };
        });
        setGroupIntensities(newIntensities);
      } else {
        setGroupIntensities((prev: Record<string, {dim: number, str: number}>) => ({
          ...prev,
          [groupId]: { ...prev[groupId], [type]: val }
        }));
      }
    }
  }, [groupPulseActive, setGroupPulseActive, getLinkedFixtureIds, handleMultiFixtureAction, linkedGroups, groupIntensities, setGroupIntensities]);

  const sendColor = React.useCallback((fixtureIds: number[], r: number, g: number, b: number, groupId?: string, isAuto = false, wheelValue?: number) => {
    if (!isAuto) {
      if (groupId) {
        setGroupAutoColorActive((prev: Record<string, boolean>) => ({ ...prev, [groupId]: false }));
      } else {
        const newAuto = { ...groupAutoColorActive };
        linkedGroups.forEach(id => { newAuto[id] = false; });
        setGroupAutoColorActive(newAuto);
        setIsAmbianceAutoColorActive(false);
      }
    }

    const targetIds = !groupId ? getLinkedFixtureIds() : fixtureIds;

    targetIds.forEach(id => {
      const fixture = fixtures.find(f => f.id === id);
      if (fixture) {
        if (fixture.type === 'Moving Head' && wheelValue !== undefined) {
          updateDmx(fixture.address + 7, wheelValue);
        } else if (fixture.type === 'RGB') {
          const start = fixture.address - 1;
          updateDmx(start + 1, r);
          updateDmx(start + 2, g);
          updateDmx(start + 3, b);
        }
      }
    });

    if (!groupId) {
      const newColors = { ...groupColors };
      linkedGroups.forEach(id => {
        newColors[id] = { r, g, b, v: wheelValue };
      });
      setGroupColors(newColors);
    } else {
      setGroupColors((prev: any) => ({ ...prev, [groupId]: { r, g, b, v: wheelValue } }));
    }
  }, [getLinkedFixtureIds, fixtures, updateDmx, linkedGroups, groupAutoColorActive, setGroupAutoColorActive, groupColors, setGroupColors]);

  const handleGlobalAction = React.useCallback((action: 'dimmer' | 'color' | 'strobe', value: any) => {
    if (action === 'dimmer') {
      setCurrentMasterIntensity(value);
      handleMasterDimmer(value);
      if (value === 0 || value === 255) {
        setIsAmbiancePulseActive(false);
        setGroupPulseActive((prev: Record<string, boolean>) => {
          const resetPulse: Record<string, boolean> = {};
          Object.keys(prev).forEach(key => { resetPulse[key] = false; });
          return resetPulse;
        });
      }
    } else if (action === 'strobe') {
      setGlobalStrobe(value);
      handleMasterStrobe(value);
      const newIntensities = { ...groupIntensities };
      groups.forEach(g => {
        if (newIntensities[g.id]) {
          newIntensities[g.id] = { ...newIntensities[g.id], str: value };
        } else {
          newIntensities[g.id] = { dim: 255, str: value };
        }
      });
      setGroupIntensities(newIntensities);
    } else if (action === 'color') {
      handleMultiFixtureAction(allFixtureIds, 'color', value);
      const newColors = { ...groupColors };
      groups.forEach(g => { newColors[g.id] = value; });
      setGroupColors(newColors);
    }
  }, [handleMasterDimmer, setGroupPulseActive, handleMasterStrobe, groupIntensities, groups, setGroupIntensities, handleMultiFixtureAction, allFixtureIds, groupColors, setGroupColors]);

  const handleMacro = React.useCallback((fixtureIds: number[], macro: string, groupId?: string) => {
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
          linkedGroups.forEach(id => {
            newGroupAuto[id] = newState;
            if (newState) newColors[id] = { r: 255, g: 255, b: 255, v: undefined };
          });
          setGroupAutoColorActive(newGroupAuto);
          setGroupColors(newColors);
        } else {
          const newState = !groupAutoColorActive[groupId];
          setGroupAutoColorActive((prev: any) => ({ ...prev, [groupId]: newState }));
          if (newState) {
            setGroupColors((prev: any) => ({ ...prev, [groupId]: { r: 255, g: 255, b: 255, v: undefined } }));
          }
        }
        break;
      case 'U2':
        handleMultiFixtureAction(fixtureIds, 'strobe', 255);
        setTimeout(() => {
          handleMultiFixtureAction(fixtureIds, 'strobe', 0);
          if (!groupId) {
            const newIntensities = { ...groupIntensities };
            linkedGroups.forEach(id => { if (newIntensities[id]) newIntensities[id] = { ...newIntensities[id], str: 0 }; });
            setGroupIntensities(newIntensities);
          } else {
            setGroupIntensities((prev: any) => ({ ...prev, [groupId]: { ...prev[groupId], str: 0 } }));
          }
        }, 1000);
        break;
      case 'U3':
        if (!groupId) {
          const newState = !isAmbiancePulseActive;
          setIsAmbiancePulseActive(newState);
          const newGroupPulse = { ...groupPulseActive };
          linkedGroups.forEach(id => { newGroupPulse[id] = newState; });
          setGroupPulseActive(newGroupPulse);
        } else {
          setGroupPulseActive((prev: any) => ({ ...prev, [groupId]: !prev[groupId] }));
        }
        break;
      case 'U4':
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        sendColor(fixtureIds, r, g, b, groupId);
        break;
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
          linkedGroups.forEach(id => { newColors[id] = firstHsl; });
          setGroupColors(newColors);
        }
        break;
      case 'U6':
        if (groupId) {
          const newState = !groupAutoGoboActive[groupId];
          setGroupAutoGoboActive((prev: any) => ({ ...prev, [groupId]: newState }));
          if (newState) {
            setGroupGobos((prev: any) => ({ ...prev, [groupId]: -1 }));
          }
        }
        break;
      default:
        if (macro.startsWith('G')) {
          const goboIndex = parseInt(macro.substring(1));
          if (!isNaN(goboIndex) && groupId) {
            setGroupAutoGoboActive((prev: any) => ({ ...prev, [groupId]: false }));
            setGroupGobos((prev: any) => ({ ...prev, [groupId]: goboIndex }));
            const dmxValue = goboIndex * 32;
            fixtureIds.forEach(id => {
              const fixture = fixtures.find(f => f.id === id);
              if (fixture && fixture.type === 'Moving Head') {
                updateDmx(fixture.address + 6, dmxValue);
              }
            });
          }
        }
        break;
    }
  }, [isAmbianceAutoColorActive, groupAutoColorActive, setGroupAutoColorActive, groupColors, setGroupColors, linkedGroups, handleMultiFixtureAction, groupIntensities, setGroupIntensities, isAmbiancePulseActive, groupPulseActive, setGroupPulseActive, sendColor, groupAutoGoboActive, setGroupAutoGoboActive, setGroupGobos, fixtures, updateDmx]);

  const sendMovement = React.useCallback((fixtureIds: number[], pan: number, tilt: number, groupId: string) => {
    fixtureIds.forEach(id => {
      const fixture = fixtures.find(f => f.id === id);
      if (fixture && fixture.type === 'Moving Head') {
        const cal = fixtureCalibration[id] || { invertPan: false, invertTilt: false, offsetPan: 0, offsetTilt: 0 };
        let finalPan = Math.min(255, Math.max(0, pan + (cal.offsetPan || 0)));
        let finalTilt = Math.min(255, Math.max(0, tilt + (cal.offsetTilt || 0)));
        if (cal.invertPan) finalPan = 255 - finalPan;
        if (cal.invertTilt) finalTilt = 255 - finalTilt;
        updateDmx(fixture.address - 1, finalPan);
        updateDmx(fixture.address + 1, finalTilt);
      }
    });
    setGroupPan((prev: any) => ({ ...prev, [groupId]: pan }));
    setGroupTilt((prev: any) => ({ ...prev, [groupId]: tilt }));
  }, [fixtures, fixtureCalibration, updateDmx, setGroupPan, setGroupTilt]);

  const handleEndOfSong = React.useCallback(() => {
    setIsAutoColorActive(false);
    fixtures.filter(f => f.type === 'Moving Head').forEach(f => {
      handleMultiFixtureAction([f.id], 'dimmer', 0);
      handleMultiFixtureAction([f.id], 'pan', 128);
      handleMultiFixtureAction([f.id], 'tilt', 128);
    });
    fixtures.filter(f => f.type === 'Laser' || f.type === 'Effect').forEach(f => {
      updateDmx(f.address - 1, 0);
    });
  }, [fixtures, handleMultiFixtureAction, updateDmx]);

  const handleTap = React.useCallback(() => {
    const now = Date.now();
    const newTaps = [...tapTimes, now].slice(-4);
    setTapTimes(newTaps);
    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i-1]);
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);
      if (newBpm >= 40 && newBpm <= 220) {
        setBpm(newBpm);
        invoke('set_bpm', { bpm: newBpm });
      }
    }
    invoke('trigger_beat');
  }, [tapTimes, setBpm]);

  // Audio peak sync
  React.useEffect(() => {
    if (isAudioActive && audioStats.isPeak) {
      invoke('trigger_peak');
      const now = Date.now();
      const newPeaks = [...audioPeakTimesRef.current, now].slice(-4);
      audioPeakTimesRef.current = newPeaks;
      if (newPeaks.length >= 2) {
        const intervals = [];
        for (let i = 1; i < newPeaks.length; i++) intervals.push(newPeaks[i] - newPeaks[i-1]);
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const newBpm = Math.round(60000 / avgInterval);
        if (newBpm >= 40 && newBpm <= 220) {
          setBpm(newBpm);
          invoke('set_bpm', { bpm: newBpm });
        }
      }
    }
  }, [audioStats.isPeak, isAudioActive, setBpm]);

  // Visual Beat
  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsBeatActive(true);
      setTimeout(() => setIsBeatActive(false), 100);
    }, (60 / bpm) * 1000);
    return () => clearInterval(interval);
  }, [bpm]);

  // Auto-Color logic
  React.useEffect(() => {
    if (!isAutoColorActive) return;
    const interval = setInterval(() => {
      autoColorHueRef.current = (autoColorHueRef.current + 5) % 360;
      const { r, g, b } = hslToRgb(autoColorHueRef.current, 100, 50);
      handleGlobalAction('color', { r, g, b });
    }, 100);
    return () => clearInterval(interval);
  }, [isAutoColorActive, handleGlobalAction]);

  // Pulse logic
  React.useEffect(() => {
    if (!isPulseActive) {
      setCurrentMasterIntensity(masterDimmer);
      return;
    }
    const startTime = Date.now();
    const beatDuration = (60 / bpm) * 1000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % beatDuration) / beatDuration;
      const decay = Math.pow(1 - progress, 2);
      const currentIntensity = Math.round(masterDimmer * decay); 
      if (currentIntensity !== pulseIntensityRef.current) {
        pulseIntensityRef.current = currentIntensity;
        setCurrentMasterIntensity(currentIntensity);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isPulseActive, bpm, masterDimmer]);

  const toggleGroupLink = React.useCallback((groupId: string) => {
    setLinkedGroups((prev: string[]) => {
      const isLinking = !prev.includes(groupId);
      const next = isLinking ? [...prev, groupId] : prev.filter(id => id !== groupId);
      if (isLinking) {
        if (isAmbianceAutoColorActive) setGroupAutoColorActive((curr: any) => ({ ...curr, [groupId]: true }));
        if (isAmbiancePulseActive) setGroupPulseActive((curr: any) => ({ ...curr, [groupId]: true }));
      } else {
        const group = groups.find(g => g.id === groupId);
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
  }, [isAmbianceAutoColorActive, setGroupAutoColorActive, isAmbiancePulseActive, setGroupPulseActive, groups, groupIntensities, groupColors, handleMultiFixtureAction]);

  const onStrobeEdit = React.useCallback((groupId: string | null) => {
    const id = groupId || 'master';
    const value = groupStrobeValues[id] || 128;
    setTempStrobeVal(Math.round((value / 255) * 100).toString());
    setActiveStrobeGroupId(id);
    setIsStrobeModalOpen(true);
  }, [groupStrobeValues]);

  const onUserColorEdit = React.useCallback((id: string, groupId: string | null) => {
    const key = groupId ? `${groupId}_${id}` : `master_${id}`;
    const color = userColors[key] || { r: 255, g: 255, b: 255 };
    const hsv = rgbToHsv(color.r, color.g, color.b);
    setTempColor(color);
    setTempHue(hsv.h);
    setTempSat(hsv.s);
    setTempLum(hsv.v);
    setActiveUserColorToEdit(key);
    setActiveColorGroupId(groupId);
    setIsColorModalOpen(true);
  }, [userColors]);

  const handleSpectrumAction = React.useCallback((clientX: number, clientY: number) => {
    if (!colorWheelRef.current) return;
    const rect = colorWheelRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, clientY - rect.top), rect.height);
    const sat = (x / rect.width) * 100;
    const val = 100 - (y / rect.height) * 100;
    setTempSat(sat);
    setTempLum(val);
    setTempColor(hsvToRgb(tempHue, sat, val));
  }, [tempHue]);

  const handleHueAction = React.useCallback((clientX: number) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const hue = (x / rect.width) * 360;
    setTempHue(hue);
    setTempColor(hsvToRgb(hue, tempSat, tempLum));
  }, [tempSat, tempLum]);

  const getGroupUserColors = React.useCallback((groupId: string | 'master') => {
    return {
      'U1': userColors[`${groupId}_U1`] || { r: 255, g: 255, b: 255 },
      'U2': userColors[`${groupId}_U2`] || { r: 255, g: 255, b: 255 }
    };
  }, [userColors]);

  const onColorModalSave = React.useCallback(() => {
    if (activePresetToEdit) {
      setCustomPresets(prev => ({ ...prev, [activePresetToEdit]: tempColor as any }));
      setActivePresetToEdit(null);
    } else if (activeUserColorToEdit) {
      setUserColors(prev => ({ ...prev, [activeUserColorToEdit]: tempColor }));
      setActiveUserColorToEdit(null);
    } else {
      const targetIds = activeColorGroupId 
        ? groups.find(g => g.id === activeColorGroupId)?.fixtureIds || []
        : getLinkedFixtureIds();
      sendColor(targetIds, tempColor.r, tempColor.g, tempColor.b, activeColorGroupId || undefined);
    }
    setIsColorModalOpen(false);
  }, [activePresetToEdit, activeUserColorToEdit, tempColor, setCustomPresets, setUserColors, setIsColorModalOpen, activeColorGroupId, groups, getLinkedFixtureIds, sendColor]);

  return {
    // States
    presets, tapTimes, isBeatActive, isAudioActive, setIsAudioActive,
    audioDevices, selectedAudioDeviceId, setSelectedAudioDeviceId, audioStats,
    linkedGroups, masterDimmer, globalStrobe, isAutoColorActive, setIsAutoColorActive,
    isPulseActive, setIsPulseActive, isAmbianceAutoColorActive, setIsAmbianceAutoColorActive,
    isAmbiancePulseActive, setIsAmbiancePulseActive, groupStrobeValues, setGroupStrobeValues,
    currentMasterIntensity, activeMacro, fadeTime, setFadeTime, customPresets, setCustomPresets,
    userColors, setUserColors,
    
    // Modal states
    isCalibrationOpen, setIsCalibrationOpen, isStrobeModalOpen, setIsStrobeModalOpen,
    isColorModalOpen, setIsColorModalOpen, isSavePresetModalOpen, setIsSavePresetModalOpen,
    activeStrobeGroupId, activeColorGroupId, presetToSaveId, setPresetToSaveId,
    activeUserColorToEdit, activePresetToEdit, setActivePresetToEdit,
    tempColor, setTempColor, tempHue, setTempHue, tempSat, setTempSat, tempLum, setTempLum,
    tempStrobeVal, setTempStrobeVal, isDraggingColor, setIsDraggingColor,
    isDraggingHue, setIsDraggingHue, effectsModalState, setEffectsModalState,
    
    // Refs
    colorWheelRef, hueSliderRef,
    
    // Logic functions
    captureAmbianceState, applyAmbiancePreset, sendIntensity, sendColor,
    handleGlobalAction, handleMacro, sendMovement, handleEndOfSong,
    handleTap, toggleGroupLink, onStrobeEdit, onUserColorEdit,
    handleSpectrumAction, handleHueAction, getGroupUserColors,
    getLinkedFixtureIds, onColorModalSave
  };
};

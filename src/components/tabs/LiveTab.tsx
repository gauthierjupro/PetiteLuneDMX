import React from 'react';
import { Zap, Power, Move, Save, Users, Music, Mic, Layout, Wind, ShieldAlert, Play, Square, HelpCircle, RefreshCw, Sun, Activity, HeartPulse, Maximize2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { ControlSlider } from '../ui/ControlSlider';
import { VerticalSlider } from '../ui/VerticalSlider';
import { XYPad } from '../ui/XYPad';
import { Tooltip } from '../ui/Tooltip';
import { Modal } from '../ui/Modal';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { hsvToRgb, rgbToHsv, hslToRgb, rgbToHsl, standardColors } from '../../utils/colorUtils';
import { AmbianceSection } from './live/AmbianceSection';
import { MovementSection } from './live/MovementSection';
import { RythmeSection } from './live/RythmeSection';
import { MasterGlobalSection } from './live/MasterGlobalSection';
import { StrobeModal } from './live/StrobeModal';
import { ColorPickerModal } from './live/ColorPickerModal';
import { SavePresetModal } from './live/SavePresetModal';
import { CalibrationModal } from './live/CalibrationModal';
import { EffectsModal } from './live/EffectsModal';

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

interface LiveTabProps {
  fixtures: any[];
  channels: number[];
  pan: number;
  tilt: number;
  groups: any[];
  selectedGroup: string | null;
  setSelectedGroup: (id: string | null) => void;
  selectedFixtures: number[];
  setSelectedFixtures: (ids: number[]) => void;
  updateDmx: (ch: number, val: string | number) => void;
  handlePanChange: (val: string) => void;
  handleTiltChange: (val: string) => void;
  handleMultiFixtureAction: (fixtureIds: number[], action: 'dimmer' | 'color' | 'strobe' | 'pan' | 'tilt', value: any) => void;
  handleGroupAction: (groupId: string, action: 'dimmer' | 'color' | 'strobe', value: any) => void;
  handleMasterDimmer: (val: number) => void;
  handleMasterStrobe: (val: number) => void;
  onRenameGroup: (groupId: string, newName: string) => void;

  groupIntensities: Record<string, {dim: number, str: number}>;
  setGroupIntensities: React.Dispatch<React.SetStateAction<any>>;
  groupColors: Record<string, {r: number, g: number, b: number, v?: number}>;
  setGroupColors: React.Dispatch<React.SetStateAction<any>>;
  groupPulseActive: Record<string, boolean>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<any>>;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<any>>;
  groupMovements: Record<string, { 
    shape: 'none' | 'circle' | 'eight' | 'pan_sweep' | 'tilt_sweep', 
    speed: number, 
    sizePan: number,
    sizeTilt: number,
    fan: number,
    invert180: boolean
  }>;
  setGroupMovements: React.Dispatch<React.SetStateAction<any>>;
  groupPan: Record<string, number>;
  setGroupPan: React.Dispatch<React.SetStateAction<any>>;
  groupTilt: Record<string, number>;
  setGroupTilt: React.Dispatch<React.SetStateAction<any>>;
  groupAutoColorActive: Record<string, boolean>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<any>>;
  groupAutoGoboActive: Record<string, boolean>;
  setGroupAutoGoboActive: React.Dispatch<React.SetStateAction<any>>;
  groupGobos: Record<string, number>;
  setGroupGobos: React.Dispatch<React.SetStateAction<any>>;
  groupPositions: Record<string, { x: number, y: number, label: string }[]>;
  setGroupPositions: React.Dispatch<React.SetStateAction<any>>;
  groupMovementPresets: Record<string, { 
    shape: string,
    speed: number,
    sizePan: number,
    sizeTilt: number,
    fan: number,
    invert180: boolean,
    label: string 
  }[]>;
  setGroupMovementPresets: React.Dispatch<React.SetStateAction<any>>;
  fixtureCalibration: Record<number, CalibrationSettings>;
  setFixtureCalibration: React.Dispatch<React.SetStateAction<any>>;
  liveGroupPositions: Record<string, { pan: number, tilt: number }>;
}

export const LiveTab = ({ 
  fixtures,
  channels, pan, tilt, 
  groups, selectedGroup, setSelectedGroup,
  selectedFixtures, setSelectedFixtures,
  updateDmx, handlePanChange, handleTiltChange,
  handleMultiFixtureAction,
  handleGroupAction,
  handleMasterDimmer, handleMasterStrobe,
  onRenameGroup,

  // Props migrées
  groupIntensities, setGroupIntensities,
  groupColors, setGroupColors,
  groupPulseActive, setGroupPulseActive,
  bpm, setBpm,
  groupMovements, setGroupMovements,
  groupPan, setGroupPan,
  groupTilt, setGroupTilt,
  groupAutoColorActive, setGroupAutoColorActive,
  groupAutoGoboActive, setGroupAutoGoboActive,
  groupGobos, setGroupGobos,
  groupPositions, setGroupPositions,
  groupMovementPresets, setGroupMovementPresets,
  fixtureCalibration, setFixtureCalibration,
  liveGroupPositions
}: LiveTabProps) => {
  const [presets, setPresets] = React.useState<Preset[]>([]);

  const [tapTimes, setTapTimes] = React.useState<number[]>([]);
  const [isBeatActive, setIsBeatActive] = React.useState(false);
  const [isAudioActive, setIsAudioActive] = React.useState(false);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = React.useState<string | null>(() => {
    return localStorage.getItem('dmx_audio_device_id');
  });
  const { stats: audioStats, devices: audioDevices } = useAudioAnalyzer(isAudioActive, selectedAudioDeviceId);
  const [isChaserActive, setIsChaserActive] = React.useState(false);
  const [chaserIndex, setChaserIndex] = React.useState(0);
  const chaserTimeoutRef = React.useRef<any>(null);
  const [fadeTime, setFadeTime] = React.useState(0);
  const [linkedGroups, setLinkedGroups] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('dmx_linked_groups');
    return saved ? JSON.parse(saved) : [];
  });
  const [masterVal, setMasterVal] = React.useState(255);
  const [globalStrobe, setGlobalStrobe] = React.useState(0);
  const [isAutoColorActive, setIsAutoColorActive] = React.useState(false);
  const [isPulseActive, setIsPulseActive] = React.useState(false);
  const [isAmbianceAutoColorActive, setIsAmbianceAutoColorActive] = React.useState(() => {
    return localStorage.getItem('dmx_ambiance_auto_color') === 'true';
  });
  const [isAmbiancePulseActive, setIsAmbiancePulseActive] = React.useState(() => {
    return localStorage.getItem('dmx_ambiance_pulse') === 'true';
  });
  const [isCalibrationOpen, setIsCalibrationOpen] = React.useState(false);
  const [effectsModalState, setEffectsModalState] = React.useState<{isOpen: boolean, groupId: string, groupName: string, fixtureIds: number[]}>({
    isOpen: false,
    groupId: '',
    groupName: '',
    fixtureIds: []
  });
  const [groupStrobeValues, setGroupStrobeValues] = React.useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('dmx_group_strobe_values');
    return saved ? JSON.parse(saved) : { master: 128 };
  });
  const ambianceAutoColorHueRef = React.useRef(0);
  const ambiancePulseIntensityRef = React.useRef(255);
  const [currentMasterIntensity, setCurrentMasterIntensity] = React.useState(255);
  const [activeMacro, setActiveMacro] = React.useState<string | null>(null);
  const [isStrobeModalOpen, setIsStrobeModalOpen] = React.useState(false);
  const [activeStrobeGroupId, setActiveStrobeGroupId] = React.useState<string | null>(null);
  const [isColorModalOpen, setIsColorModalOpen] = React.useState(false);
  const [activeColorGroupId, setActiveColorGroupId] = React.useState<string | null>(null);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = React.useState(false);
  const [presetToSaveId, setPresetToSaveId] = React.useState<string | null>(null);

  // Sauvegarde des états dans localStorage
  React.useEffect(() => {
    localStorage.setItem('dmx_linked_groups', JSON.stringify(linkedGroups));
    localStorage.setItem('dmx_ambiance_auto_color', isAmbianceAutoColorActive.toString());
    localStorage.setItem('dmx_ambiance_pulse', isAmbiancePulseActive.toString());
    localStorage.setItem('dmx_group_strobe_values', JSON.stringify(groupStrobeValues));
    if (selectedAudioDeviceId) {
      localStorage.setItem('dmx_audio_device_id', selectedAudioDeviceId);
    }
  }, [linkedGroups, isAmbianceAutoColorActive, isAmbiancePulseActive, groupStrobeValues, selectedAudioDeviceId]);

  const [customPresets, setCustomPresets] = React.useState<Record<string, AmbiancePreset>>(() => {
    const saved = localStorage.getItem('dmx_custom_ambiance_presets');
    if (saved) return JSON.parse(saved);
    
    // Initialiser les 8 presets vides
    const initial: Record<string, AmbiancePreset> = {};
    for (let i = 1; i <= 8; i++) {
      initial[i.toString()] = { name: `Ambiance ${i}`, groupStates: {} };
    }
    return initial;
  });

  // Couleurs personnalisées U1/U2 (indépendantes par groupe)
  const [userColors, setUserColors] = React.useState<Record<string, {r: number, g: number, b: number}>>(() => {
    const saved = localStorage.getItem('dmx_user_colors');
    return saved ? JSON.parse(saved) : {};
  });

  // Helper pour récupérer les couleurs U1/U2 spécifiques à un groupe
  const getGroupUserColors = (groupId: string | 'master') => {
    return {
      'U1': userColors[`${groupId}_U1`] || { r: 255, g: 255, b: 255 },
      'U2': userColors[`${groupId}_U2`] || { r: 255, g: 255, b: 255 }
    };
  };

  // Sauvegarder les couleurs U1/U2
  React.useEffect(() => {
    localStorage.setItem('dmx_user_colors', JSON.stringify(userColors));
  }, [userColors]);

  // Sauvegarder les presets quand ils changent
  React.useEffect(() => {
    localStorage.setItem('dmx_custom_ambiance_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  // Fonction pour capturer l'état actuel de tous les groupes
  const captureAmbianceState = (presetName: string): AmbiancePreset => {
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
  };

  // Fonction pour appliquer un preset d'ambiance
  const applyAmbiancePreset = (presetId: string) => {
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

        // Envoyer les commandes DMX réelles
        handleMultiFixtureAction(group.fixtureIds, 'dimmer', state.dim);
        handleMultiFixtureAction(group.fixtureIds, 'strobe', state.str);
        handleMultiFixtureAction(group.fixtureIds, 'color', state.color);
      }
    });

    setGroupIntensities(newIntensities);
    setGroupColors(newColors);
    setGroupAutoColorActive(newAuto);
    setGroupPulseActive(newPulse);
  };

  const handleSaveAmbiance = (presetId: string, name: string) => {
    const newState = captureAmbianceState(name);
    setCustomPresets((prev: Record<string, AmbiancePreset>) => ({ ...prev, [presetId]: newState }));
    setIsSavePresetModalOpen(false);
  };

  const handleRenamePreset = (presetId: string, newName: string) => {
    setCustomPresets((prev: Record<string, AmbiancePreset>) => ({
      ...prev,
      [presetId]: { ...prev[presetId], name: newName }
    }));
  };

  const [activePresetToEdit, setActivePresetToEdit] = React.useState<string | null>(null);
  const [activeUserColorToEdit, setActiveUserColorToEdit] = React.useState<string | null>(null);
  const [tempColor, setTempColor] = React.useState({ r: 255, g: 255, b: 255 });
  const [tempHue, setTempHue] = React.useState(0);
  const [tempSat, setTempSat] = React.useState(100);
  const [tempLum, setTempLum] = React.useState(50);
  const [isDraggingColor, setIsDraggingColor] = React.useState(false);
  const [isDraggingHue, setIsDraggingHue] = React.useState(false);
  const colorWheelRef = React.useRef<HTMLDivElement>(null);
  const hueSliderRef = React.useRef<HTMLDivElement>(null);
  const [tempStrobeVal, setTempStrobeVal] = React.useState("");

  // Gestion du spectre (Saturation / Valeur/Luminosité)
  const handleSpectrumAction = (clientX: number, clientY: number) => {
    if (!colorWheelRef.current) return;
    const rect = colorWheelRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, clientY - rect.top), rect.height);
    
    const sat = (x / rect.width) * 100;
    const val = 100 - (y / rect.height) * 100;
    
    setTempSat(sat);
    setTempLum(val); // On utilise tempLum pour stocker la "Value" du HSV
    setTempColor(hsvToRgb(tempHue, sat, val));
  };

  // Gestion de la barre de teinte (Hue)
  const handleHueAction = (clientX: number) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const hue = (x / rect.width) * 360;
    
    setTempHue(hue);
    setTempColor(hsvToRgb(hue, tempSat, tempLum));
  };

  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingColor) {
        e.preventDefault();
        handleSpectrumAction(e.clientX, e.clientY);
      } else if (isDraggingHue) {
        e.preventDefault();
        handleHueAction(e.clientX);
      }
    };
    const handleGlobalMouseUp = () => {
      setIsDraggingColor(false);
      setIsDraggingHue(false);
    };

    if (isDraggingColor || isDraggingHue) {
      window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingColor, isDraggingHue, tempHue, tempSat, tempLum]);

  const autoColorHueRef = React.useRef(0);
  const pulseIntensityRef = React.useRef(255);
  
  // Initialiser les intensités et couleurs des groupes si non persistés
  React.useEffect(() => {
    setGroupIntensities((prev: Record<string, {dim: number, str: number}>) => {
      const newIntensities = { ...prev };
      groups.forEach(g => {
        if (!newIntensities[g.id]) {
          newIntensities[g.id] = { dim: 255, str: 0 };
        }
      });
      return newIntensities;
    });
    setGroupColors((prev: Record<string, {r: number, g: number, b: number, v?: number}>) => {
      const newColors = { ...prev };
      groups.forEach(g => {
        if (!newColors[g.id]) {
          newColors[g.id] = { r: 255, g: 255, b: 255 };
        }
      });
      return newColors;
    });
  }, []);

  // Liste de TOUTES les fixtures pour le Master Global
  const allFixtureIds = fixtures.map(f => f.id);

  // Helper pour les actions GLOBALES (Toutes sections)
  const handleGlobalAction = (action: 'dimmer' | 'color' | 'strobe', value: any) => {
    console.log(`Global Action: ${action}`, value);
    if (action === 'dimmer') {
      setMasterVal(value);
      setCurrentMasterIntensity(value);
      handleMasterDimmer(value);
      // Le Master Dimmer global n'écrase plus les faders individuels des groupes
      // Il agit comme un multiplicateur final (via le backend DMX)
    } else if (action === 'strobe') {
      setGlobalStrobe(value);
      handleMasterStrobe(value);
      // Le Master Strobe écrase visuellement les faders de strobe de tous les groupes
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
      // Mettre à jour visuellement TOUS les groupes (pas seulement ambiance)
      const newColors = { ...groupColors };
      groups.forEach(g => {
        newColors[g.id] = value;
      });
      setGroupColors(newColors);
    }
  };

  // Basculer le lien d'un groupe
  const toggleGroupLink = (groupId: string) => {
    setLinkedGroups((prev: string[]) => {
      const isLinking = !prev.includes(groupId);
      const next = isLinking ? [...prev, groupId] : prev.filter(id => id !== groupId);
      
      // Synchronisation de l'état Auto/Pulse lors de la liaison
      if (isLinking) {
        if (isAmbianceAutoColorActive) {
          setGroupAutoColorActive((curr: Record<string, boolean>) => ({ ...curr, [groupId]: true }));
        }
        if (isAmbiancePulseActive) {
          setGroupPulseActive((curr: Record<string, boolean>) => ({ ...curr, [groupId]: true }));
        }
      } else {
        // LORS DU DÉLIEMENT : La carte devient autonome et GARDE son état (Pulse, Auto-Color et Valeurs)
        // L'opérateur décide ensuite s'il veut les désactiver manuellement sur la carte
        
        const group = groups.find(g => g.id === groupId);
        if (group) {
          const currentDim = groupIntensities[groupId]?.dim ?? 255;
          const currentStr = groupIntensities[groupId]?.str ?? 0;
          const currentColor = groupColors[groupId] ?? { r: 255, g: 255, b: 255 };
          
          // On renvoie une commande DMX pour stabiliser l'état hérité du Master
          handleMultiFixtureAction(group.fixtureIds, 'dimmer', currentDim);
          handleMultiFixtureAction(group.fixtureIds, 'strobe', currentStr);
          handleMultiFixtureAction(group.fixtureIds, 'color', currentColor);
        }
      }
      
      return next;
    });
  };

  // Récupérer tous les fixtureIds des groupes liés
  const getLinkedFixtureIds = () => {
    return groups
      .filter(g => linkedGroups.includes(g.id))
      .flatMap(g => g.fixtureIds);
  };

  // Charger les presets
  React.useEffect(() => {
    const savedPresets = localStorage.getItem('dmx_presets');
    if (savedPresets) setPresets(JSON.parse(savedPresets));
  }, []);

  // Sync Audio Peak et Calcul Automatique du BPM
  const [audioPeakTimes, setAudioPeakTimes] = React.useState<number[]>([]);
  React.useEffect(() => {
    if (isAudioActive && audioStats.isPeak) {
      invoke('trigger_peak');
      
      // Calcul automatique du BPM basé sur les pics audio
      const now = Date.now();
      const newPeaks = [...audioPeakTimes, now].slice(-4);
      setAudioPeakTimes(newPeaks);
      
      if (newPeaks.length >= 2) {
        const intervals = [];
        for (let i = 1; i < newPeaks.length; i++) {
          intervals.push(newPeaks[i] - newPeaks[i-1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const newBpm = Math.round(60000 / avgInterval);
        
        // On ne met à jour que si le BPM est réaliste (40-220)
        if (newBpm >= 40 && newBpm <= 220) {
          setBpm(newBpm);
          invoke('set_bpm', { bpm: newBpm });
        }
      }
    }
  }, [audioStats.isPeak, isAudioActive]);

  // Visual Beat
  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsBeatActive(true);
      setTimeout(() => setIsBeatActive(false), 100);
    }, (60 / bpm) * 1000);
    return () => clearInterval(interval);
  }, [bpm]);

  const handleTap = () => {
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
  };

  const handleLoadPreset = async (preset: Preset) => {
    try { await invoke('apply_preset', { universeData: preset.data, fadeTimeMs: fadeTime * 1000 }); } catch (e) { console.error(e); }
  };

  const handleBlackout = async () => { try { await invoke('blackout'); } catch (e) { console.error(e); } };

  // Fonction FIN DE MORCEAU (BREAK)
  const handleEndOfSong = () => {
    // 1. Stopper les modes auto
    setIsAutoColorActive(false);
    
    // 2. Réinitialiser les Lyres (Dimmer 0, Pan/Tilt Centre)
    const movingHeads = fixtures.filter(f => f.type === 'Moving Head');
    movingHeads.forEach(f => {
      handleMultiFixtureAction([f.id], 'dimmer', 0);
      handleMultiFixtureAction([f.id], 'pan', 128);
      handleMultiFixtureAction([f.id], 'tilt', 128);
    });

    // 3. Stopper les Lasers et Effets (XTREM LED, etc.)
    const effects = fixtures.filter(f => f.type === 'Laser' || f.type === 'Effect');
    effects.forEach(f => {
      // On met le canal d'intensité/contrôle à 0
      updateDmx(f.address - 1, 0);
    });

    // Note: Les projecteurs d'Ambiance ne sont pas touchés, ils gardent leur couleur actuelle.
  };

  // Logique du cycle de couleur Auto (Rainbow)
  React.useEffect(() => {
    if (!isAutoColorActive) return;

    const interval = setInterval(() => {
      autoColorHueRef.current = (autoColorHueRef.current + 5) % 360;
      const { r, g, b } = hslToRgb(autoColorHueRef.current, 100, 50);
      handleGlobalAction('color', { r, g, b });
    }, 100); // 20Hz pour un fondu fluide

    return () => clearInterval(interval);
  }, [isAutoColorActive]);

  // Logique du cycle de couleur Auto pour l'Ambiance (Master)
  // Cette boucle est également supprimée. Le Master pilote directement
  // les états Auto-Color des groupes liés.

  // Logique du mode Pulse (synchronisé sur le BPM)
  React.useEffect(() => {
    if (!isPulseActive) {
      // Si on désactive, on remet le master à sa valeur avant pulse (ou 255)
      setCurrentMasterIntensity(masterVal);
      handleMasterDimmer(masterVal);
      return;
    }

    let startTime = Date.now();
    const beatDuration = (60 / bpm) * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % beatDuration) / beatDuration;
      
      // Courbe de décroissance exponentielle pour un effet "impact"
      // 1.0 au début du beat -> 0.0 à la fin
      const decay = Math.pow(1 - progress, 2);
      const currentIntensity = Math.round(255 * decay);
      
      if (currentIntensity !== pulseIntensityRef.current) {
        pulseIntensityRef.current = currentIntensity;
        // On applique l'intensité via le master global
        setCurrentMasterIntensity(currentIntensity);
        handleMasterDimmer(currentIntensity);
      }
    }, 30); // 33fps pour une fluidité correcte

    return () => clearInterval(interval);
  }, [isPulseActive, bpm, masterVal]);

  // Logique du mode Pulse pour l'Ambiance (Master)
  // Cette boucle est supprimée car le Master pilote maintenant directement
  // les états Pulse individuels des groupes liés.
  // Cela garantit une synchronisation parfaite et évite les conflits DMX.

  // Logique du cycle automatique des gobos
  // Migré vers App.tsx pour fonctionnement en arrière-plan

  // Logique du générateur de mouvements (Shapes)
  // Migré vers App.tsx pour fonctionnement en arrière-plan

  // Logique du mode Pulse pour chaque groupe individuel
  // Migré vers App.tsx pour fonctionnement en arrière-plan

  // Helper pour les intensités (Dimmer/Strobe)
  const sendIntensity = (fixtureIds: number[], type: 'dim' | 'str', val: number, groupId?: string, isAuto = false) => {
    // Si c'est une action manuelle sur le dimmer, on coupe le mode Pulse correspondant
    if (type === 'dim' && !isAuto) {
      if (groupId) {
        setGroupPulseActive((prev: Record<string, boolean>) => ({ ...prev, [groupId]: false }));
      } else {
        // L'action Master Ambiance coupe le Pulse sur TOUS les groupes liés
        const newPulse = { ...groupPulseActive };
        linkedGroups.forEach(id => {
          newPulse[id] = false;
        });
        setGroupPulseActive(newPulse);
        setIsAmbiancePulseActive(false);
      }
    }

    // Déterminer les cibles : soit le groupe spécifique, soit tous les groupes liés (Master Ambiance)
    const targetIds = groupId 
      ? fixtureIds 
      : getLinkedFixtureIds();

    if (targetIds.length === 0) return;

    console.log(`Intensity: ${type} to ${val} for ${targetIds.length} fixtures (Group: ${groupId || 'MASTER AMBIANCE'})`);
    handleMultiFixtureAction(targetIds, type === 'dim' ? 'dimmer' : 'strobe', val);
    
    // CRUCIAL : On ne met à jour l'état local QUE si ce n'est PAS un automatisme (Pulse/Auto)
    // Cela permet de garder les faders stables pendant que les VU-mètres s'animent via le flux DMX réel
    if (!isAuto) {
      if (!groupId) {
        // Action Master Ambiance : On met à jour l'état local de TOUS les groupes liés
        const newIntensities = { ...groupIntensities };
        linkedGroups.forEach(id => {
          newIntensities[id] = { ...newIntensities[id], [type]: val };
        });
        setGroupIntensities(newIntensities);
      } else {
        // Action individuelle : On ne met à jour QUE ce groupe
        setGroupIntensities((prev: Record<string, {dim: number, str: number}>) => ({
          ...prev,
          [groupId]: { ...prev[groupId], [type]: val }
        }));
      }
    }
  };

  // Réinitialisation du Pilotage Ambiance quand plus utilisé
  React.useEffect(() => {
    if (linkedGroups.length === 0) {
      setIsAmbianceAutoColorActive(false);
      setIsAmbiancePulseActive(false);
    }
  }, [linkedGroups]);

  // Helper pour les couleurs RGB
  const sendColor = (fixtureIds: number[], r: number, g: number, b: number, groupId?: string, isAuto = false, wheelValue?: number) => {
    // Désactiver le mode Auto Color seulement si c'est une action manuelle
    if (!isAuto) {
      if (groupId) {
        setGroupAutoColorActive((prev: Record<string, boolean>) => ({ ...prev, [groupId]: false }));
      } else {
        // L'action Master Ambiance coupe l'Auto-Color sur TOUS les groupes liés
        const newAuto = { ...groupAutoColorActive };
        linkedGroups.forEach(id => {
          newAuto[id] = false;
        });
        setGroupAutoColorActive(newAuto);
        setIsAmbianceAutoColorActive(false);
      }
    }

    // Si pas de groupId, c'est l'action Master -> On agit sur TOUT le lien
    const targetIds = !groupId ? getLinkedFixtureIds() : fixtureIds;

    console.log(`Color: RGB(${r}, ${g}, ${b}) Wheel:${wheelValue} for ${targetIds.length} fixtures (Action from: ${groupId || 'MASTER'})`);
    
    // Si une valeur de roue est fournie (pour les Moving Head), on l'utilise
    targetIds.forEach(id => {
      const fixture = fixtures.find(f => f.id === id);
      if (fixture) {
        if (fixture.type === 'Moving Head' && wheelValue !== undefined) {
          // Canal 8 pour PicoSpot (address + 7)
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
      // Action Master : On met à jour tous les groupes liés
      const newColors = { ...groupColors };
      linkedGroups.forEach(id => {
        newColors[id] = { r, g, b, v: wheelValue };
      });
      setGroupColors(newColors);
    } else {
      // Action individuelle : On ne met à jour QUE ce groupe
      setGroupColors((prev: Record<string, {r: number, g: number, b: number, v?: number}>) => ({ ...prev, [groupId]: { r, g, b, v: wheelValue } }));
    }
  };

  // Helper pour les mouvements (Pan/Tilt)
  const sendMovement = (fixtureIds: number[], pan: number, tilt: number, groupId: string) => {
    console.log(`Movement: Pan ${pan}, Tilt ${tilt} for group ${groupId}`);
    
    fixtureIds.forEach(id => {
      const fixture = fixtures.find(f => f.id === id);
      if (fixture && fixture.type === 'Moving Head') {
        const cal = fixtureCalibration[id] || { invertPan: false, invertTilt: false, offsetPan: 0, offsetTilt: 0 };
        
        // Appliquer l'offset et l'inversion
        let finalPan = pan + (cal.offsetPan || 0);
        let finalTilt = tilt + (cal.offsetTilt || 0);
        
        // Clamp 0-255
        finalPan = Math.min(255, Math.max(0, finalPan));
        finalTilt = Math.min(255, Math.max(0, finalTilt));
        
        // Appliquer l'inversion
        if (cal.invertPan) finalPan = 255 - finalPan;
        if (cal.invertTilt) finalTilt = 255 - finalTilt;
        
        // Canal Pan est address, Tilt est address + 2 (pour PicoSpot)
        updateDmx(fixture.address - 1, finalPan);
        updateDmx(fixture.address + 1, finalTilt);
      }
    });

    setGroupPan((prev: Record<string, number>) => ({ ...prev, [groupId]: pan }));
    setGroupTilt((prev: Record<string, number>) => ({ ...prev, [groupId]: tilt }));
  };

  // Helper pour les macros U1-U4
  const handleMacro = (fixtureIds: number[], macro: string, groupId?: string) => {
    // Si aucun groupe n'est lié, on avertit visuellement l'utilisateur
    if (fixtureIds.length === 0 && (macro === 'U2' || macro === 'U4')) {
      setActiveMacro('ERROR');
      setTimeout(() => setActiveMacro(null), 1000);
      console.warn(`Macro ${macro} cancelled: no fixtures selected (check linked groups)`);
      return;
    }

    // Feedback visuel persistant ou temporaire selon le mode
    if (macro === 'U2' || macro === 'U4' || macro === 'U5') {
      setActiveMacro(macro);
      setTimeout(() => setActiveMacro(null), 500); // Feedback plus long pour les actions one-shot
    }
    
    console.log(`Executing macro ${macro} for ${fixtureIds.length} fixtures (Group: ${groupId || 'MASTER'})`);
    
    switch (macro) {
      case 'U1': // RAINBOW
        if (!groupId) {
          const newState = !isAmbianceAutoColorActive;
          setIsAmbianceAutoColorActive(newState);
          // Le Master pilote les cartes : on active/désactive l'Auto-Color sur chaque groupe lié
          const newGroupAuto = { ...groupAutoColorActive };
          linkedGroups.forEach(id => {
            newGroupAuto[id] = newState;
          });
          setGroupAutoColorActive(newGroupAuto);
        } else {
          setGroupAutoColorActive((prev: Record<string, boolean>) => ({ ...prev, [groupId]: !prev[groupId] }));
        }
        break;
      case 'U2': // STROBE FAST (Flash de 1s)
        handleMultiFixtureAction(fixtureIds, 'strobe', 255);
        setTimeout(() => {
          handleMultiFixtureAction(fixtureIds, 'strobe', 0);
          if (!groupId) {
            const newIntensities = { ...groupIntensities };
            linkedGroups.forEach(id => {
              if (newIntensities[id]) newIntensities[id] = { ...newIntensities[id], str: 0 };
            });
            setGroupIntensities(newIntensities);
          } else {
            setGroupIntensities((prev: Record<string, {dim: number, str: number}>) => ({ ...prev, [groupId]: { ...prev[groupId], str: 0 } }));
          }
        }, 1000);
        break;
      case 'U3': // PULSE
        if (!groupId) {
          const newState = !isAmbiancePulseActive;
          setIsAmbiancePulseActive(newState);
          // Le Master pilote les cartes : on active/désactive le Pulse sur chaque groupe lié
          const newGroupPulse = { ...groupPulseActive };
          linkedGroups.forEach(id => {
            newGroupPulse[id] = newState;
          });
          setGroupPulseActive(newGroupPulse);
        } else {
          setGroupPulseActive((prev: Record<string, boolean>) => ({ ...prev, [groupId]: !prev[groupId] }));
        }
        break;
      case 'U4': // RANDOM COLOR
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        sendColor(fixtureIds, r, g, b, groupId);
        break;
      case 'U5': // FANNING (Rainbow spread)
        if (fixtureIds.length === 0) return;
        // Distribuer un arc-en-ciel sur l'ensemble des fixtures
        fixtureIds.forEach((id, index) => {
          const hue = (index / fixtureIds.length) * 360;
          const { r, g, b } = hslToRgb(hue, 100, 50);
          handleMultiFixtureAction([id], 'color', { r, g, b });
        });
        // Mettre à jour visuellement le master (couleur moyenne ou première fixture)
        if (!groupId) {
          const firstHsl = hslToRgb(0, 100, 50);
          const newColors = { ...groupColors };
          linkedGroups.forEach(id => {
            newColors[id] = firstHsl;
          });
          setGroupColors(newColors);
        }
        break;
      case 'U6': // AUTO GOBO
        if (groupId) {
          const newState = !groupAutoGoboActive[groupId];
          setGroupAutoGoboActive((prev: Record<string, boolean>) => ({ ...prev, [groupId]: newState }));
          
          // L'effet DMX sera géré par le useEffect de cycle automatique
        }
        break;
      default:
        if (macro.startsWith('G')) {
          const goboIndex = parseInt(macro.substring(1));
          if (!isNaN(goboIndex) && groupId) {
            // Désactiver le mode Auto Gobo lors d'une sélection manuelle
            setGroupAutoGoboActive((prev: Record<string, boolean>) => ({ ...prev, [groupId]: false }));
            
            setGroupGobos((prev: Record<string, number>) => ({ ...prev, [groupId]: goboIndex }));
            // La valeur DMX pour les gobos est généralement un multiple de 32
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
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
    onRenameGroup(groupId, newName);
  };

  const onStrobeEdit = (groupId: string | null) => {
    const id = groupId || 'master';
    const value = groupStrobeValues[id] || 128;
    setTempStrobeVal(Math.round((value / 255) * 100).toString());
    setActiveStrobeGroupId(id);
    setIsStrobeModalOpen(true);
  };

  const onUserColorEdit = (id: string, groupId: string | null) => {
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
  };

  const ambianceGroups = groups.filter(g => 
    g.fixtureIds.length > 0 && 
    g.isAmbiance === true
  );

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      
      {/* COLONNE PRINCIPALE (Gaucher) */}
      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8 pb-20">
        
        {/* SECTION MASTER GLOBAL (Format Ultra-Compact) */}
        <MasterGlobalSection 
          masterVal={masterVal}
          globalStrobe={globalStrobe}
          handleGlobalAction={handleGlobalAction}
          handleEndOfSong={handleEndOfSong}
          bpm={bpm}
          setBpm={setBpm}
          isAudioActive={isAudioActive}
          setIsAudioActive={setIsAudioActive}
          handleTap={handleTap}
          isBeatActive={isBeatActive}
          audioDevices={audioDevices}
          selectedAudioDeviceId={selectedAudioDeviceId}
          setSelectedAudioDeviceId={setSelectedAudioDeviceId}
          audioStats={audioStats}
        />

        {/* SECTION AMBIANCES */}
        <AmbianceSection 
          ambianceGroups={ambianceGroups}
          linkedGroups={linkedGroups}
          toggleGroupLink={toggleGroupLink}
          groupIntensities={groupIntensities}
          groupColors={groupColors}
          isAmbianceAutoColorActive={isAmbianceAutoColorActive}
          isAmbiancePulseActive={isAmbiancePulseActive}
          activeMacro={activeMacro}
          getLinkedFixtureIds={getLinkedFixtureIds}
          sendIntensity={sendIntensity}
          sendColor={sendColor}
          handleMacro={handleMacro}
          onStrobeEdit={onStrobeEdit}
          groupStrobeValues={groupStrobeValues}
          onUserColorEdit={onUserColorEdit}
          getGroupUserColors={getGroupUserColors}
          currentMasterIntensity={currentMasterIntensity}
          groupAutoColorActive={groupAutoColorActive}
          groupPulseActive={groupPulseActive}
          customPresets={customPresets}
          applyAmbiancePreset={applyAmbiancePreset}
          setPresetToSaveId={setPresetToSaveId}
          setIsSavePresetModalOpen={setIsSavePresetModalOpen}
          fadeTime={fadeTime}
          setFadeTime={setFadeTime}
          channels={channels}
          fixtures={fixtures}
        />

        {/* SECTION MOUVEMENTS (LYRES) */}
        <MovementSection 
          groups={groups}
          fixtures={fixtures}
          handlePanChange={handlePanChange}
          handleTiltChange={handleTiltChange}
          handleMultiFixtureAction={handleMultiFixtureAction}
          groupColors={groupColors}
          groupIntensities={groupIntensities}
          currentMasterIntensity={currentMasterIntensity}
          groupPulseActive={groupPulseActive}
          groupAutoColorActive={groupAutoColorActive}
          groupAutoGoboActive={groupAutoGoboActive}
          groupGobos={groupGobos}
          groupPan={groupPan}
          groupTilt={groupTilt}
          liveGroupPositions={liveGroupPositions}
          sendIntensity={sendIntensity}
          sendColor={sendColor}
          sendMovement={sendMovement}
          handleMacro={handleMacro}
          onStrobeEdit={onStrobeEdit}
          groupStrobeValues={groupStrobeValues}
          channels={channels}
          updateDmx={updateDmx}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          onOpenEffects={(groupId, groupName, fixtureIds) => {
            setEffectsModalState({
              isOpen: true,
              groupId,
              groupName,
              fixtureIds
            });
          }}
        />

        <CalibrationModal 
          isOpen={isCalibrationOpen}
          onClose={() => setIsCalibrationOpen(false)}
          fixtures={fixtures}
          calibration={fixtureCalibration}
          onUpdateCalibration={(id, settings) => {
            setFixtureCalibration(prev => ({
              ...prev,
              [id]: { ...(prev[id] || { invertPan: false, invertTilt: false, offsetPan: 0, offsetTilt: 0 }), ...settings }
            }));
          }}
          onReset={(id) => {
            setFixtureCalibration(prev => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }}
        />

        <EffectsModal 
          isOpen={effectsModalState.isOpen}
          onClose={() => setEffectsModalState(prev => ({ ...prev, isOpen: false }))}
          groupId={effectsModalState.groupId}
          groupName={effectsModalState.groupName}
          fixtureIds={effectsModalState.fixtureIds}
          fixtures={fixtures}
          groupMovements={groupMovements}
          setGroupMovements={setGroupMovements}
          groupPan={groupPan}
          groupTilt={groupTilt}
          sendMovement={sendMovement}
          groupPositions={groupPositions}
          setGroupPositions={setGroupPositions}
          groupMovementPresets={groupMovementPresets}
          setGroupMovementPresets={setGroupMovementPresets}
        />

        {/* SECTION RYTHME ET EFFETS */}
        {/* Masqué car remplacé par les modales d'effets par groupe */}
        {false && <RythmeSection 
          fixtures={fixtures}
          channels={channels}
          updateDmx={updateDmx}
        />}
      </div>

      {/* MODALES DE RÉGLAGES */}
      <StrobeModal 
        isOpen={isStrobeModalOpen}
        onClose={() => setIsStrobeModalOpen(false)}
        tempValue={tempStrobeVal}
        onChange={setTempStrobeVal}
        onSave={() => {
          if (activeStrobeGroupId) {
            const newValue = Math.round((parseInt(tempStrobeVal) / 100) * 255);
            setGroupStrobeValues(prev => ({ ...prev, [activeStrobeGroupId]: newValue }));
          }
          setIsStrobeModalOpen(false);
        }}
      />

      <ColorPickerModal 
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        title={`SÉLECTEUR DE COULEURS ${activeColorGroupId ? '(GROUPE)' : '(MASTER)'}`}
        tempColor={tempColor}
        tempHue={tempHue}
        tempSat={tempSat}
        tempLum={tempLum}
        onColorChange={setTempColor}
        onHueChange={setTempHue}
        onSatChange={setTempSat}
        onLumChange={setTempLum}
        onSave={() => {
          if (activePresetToEdit) {
            setCustomPresets(prev => ({ ...prev, [activePresetToEdit]: tempColor as any }));
            setActivePresetToEdit(null);
          } else if (activeUserColorToEdit) {
            // CLIC DROIT U1/U2 : On sauvegarde seulement la couleur dans l'état
            // On ne l'applique PAS immédiatement aux projecteurs
            setUserColors(prev => ({ ...prev, [activeUserColorToEdit]: tempColor }));
            setActiveUserColorToEdit(null);
          } else {
            // Sélection directe via le spectre (pas clic droit)
            const targetIds = activeColorGroupId 
              ? groups.find(g => g.id === activeColorGroupId)?.fixtureIds || []
              : getLinkedFixtureIds();
            sendColor(targetIds, tempColor.r, tempColor.g, tempColor.b, activeColorGroupId || undefined);
          }
          setIsColorModalOpen(false);
        }}
        colorWheelRef={colorWheelRef}
        hueSliderRef={hueSliderRef}
        handleSpectrumAction={handleSpectrumAction}
        handleHueAction={handleHueAction}
        setIsDraggingColor={setIsDraggingColor}
        setIsDraggingHue={setIsDraggingHue}
        activePresetToEdit={activePresetToEdit}
      />

      <SavePresetModal 
        isOpen={isSavePresetModalOpen}
        onClose={() => setIsSavePresetModalOpen(false)}
        defaultName={presetToSaveId ? customPresets[presetToSaveId]?.name || `Preset ${presetToSaveId}` : ""}
        onSave={(name) => {
          if (presetToSaveId) {
            const newState = captureAmbianceState(name);
            setCustomPresets(prev => ({
              ...prev,
              [presetToSaveId]: newState
            }));
          }
          setIsSavePresetModalOpen(false);
          setPresetToSaveId(null);
        }}
      />
    </div>
  );
};

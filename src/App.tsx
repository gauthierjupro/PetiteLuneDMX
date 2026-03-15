import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Zap,
  Activity,
  Settings as SettingsIcon,
  Layout,
  RefreshCw,
  Edit2,
  Users,
  Move,
  Sliders,
  Maximize2,
  Box,
  Info
} from 'lucide-react';

import fixturesData from './data/fixtures_patch.json';
import groupsData from './data/groups.json';
import { hslToRgb } from './utils/colorUtils';

// Components
import { LiveTab } from './components/tabs/LiveTab';
import { FixturesTab } from './components/tabs/FixturesTab';
import { PatchTab } from './components/tabs/PatchTab';
import { DmxConsoleTab } from './components/tabs/DmxConsoleTab';
import { StageTab } from './components/tabs/StageTab';
import { FixtureEditorTab } from './components/tabs/FixtureEditorTab';
import { GlassCard } from './components/ui/GlassCard';
import { AboutModal } from './components/ui/AboutModal';

type TabType = 'live' | 'fixtures' | 'patch' | 'console' | 'stage' | 'editor' | 'settings';

interface CalibrationSettings {
  invertPan: boolean;
  invertTilt: boolean;
  offsetPan: number;
  offsetTilt: number;
}

function App() {
  const APP_VERSION = "1.3.0";
  const [channels, setChannels] = useState<number[]>(Array(512).fill(0));
  const [isConnected, setIsConnected] = useState(false);
  const [pan, setPan] = useState(127);
  const [tilt, setTilt] = useState(127);
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [selectedFixture, setSelectedFixture] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState('COM3');
  const [selectedFixtures, setSelectedFixtures] = useState<number[]>([]);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // --- États du Moteur DMX (Migrés de LiveTab pour tourner en arrière-plan) ---
  const [groupMovements, setGroupMovements] = useState<Record<string, { 
    shape: 'none' | 'circle' | 'eight' | 'pan_sweep' | 'tilt_sweep' | 'custom', 
    speed: number, 
    sizePan: number,
    sizeTilt: number,
    fan: number,
    invert180: boolean,
    customPoints?: {x: number, y: number}[]
  }>>(() => {
    const saved = localStorage.getItem('dmx_group_movements');
    return saved ? JSON.parse(saved) : {};
  });

  const [groupCustomTrajectories, setGroupCustomTrajectories] = useState<Record<string, {
    id: string,
    label: string,
    points: {x: number, y: number}[]
  }[]>>(() => {
    const saved = localStorage.getItem('dmx_custom_trajectories');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('dmx_custom_trajectories', JSON.stringify(groupCustomTrajectories));
  }, [groupCustomTrajectories]);

  const [groupPan, setGroupPan] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('dmx_group_pan');
    return saved ? JSON.parse(saved) : {};
  });

  const [groupTilt, setGroupTilt] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('dmx_group_tilt');
    return saved ? JSON.parse(saved) : {};
  });

  const [groupAutoColorActive, setGroupAutoColorActive] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('dmx_group_auto_color');
    return saved ? JSON.parse(saved) : {};
  });

  const [groupAutoGoboActive, setGroupAutoGoboActive] = useState<Record<string, boolean>>(() => {
     const saved = localStorage.getItem('dmx_group_auto_gobo');
     return saved ? JSON.parse(saved) : {};
   });
 
   const [groupIntensities, setGroupIntensities] = useState<Record<string, {dim: number, str: number}>>(() => {
     const saved = localStorage.getItem('dmx_group_intensities');
     return saved ? JSON.parse(saved) : {};
   });

   const [groupColors, setGroupColors] = useState<Record<string, {r: number, g: number, b: number, v?: number}>>(() => {
     const saved = localStorage.getItem('dmx_group_colors');
     return saved ? JSON.parse(saved) : {};
   });

   const [groupGobos, setGroupGobos] = useState<Record<string, number>>(() => {
     const saved = localStorage.getItem('dmx_group_gobos');
     return saved ? JSON.parse(saved) : {};
   });
 
   const [groupPositions, setGroupPositions] = useState<Record<string, { 
     x: number, 
     y: number, 
     label: string 
   }[]>>(() => {
     const saved = localStorage.getItem('dmx_group_positions');
     return saved ? JSON.parse(saved) : {};
   });
 
   const [groupMovementPresets, setGroupMovementPresets] = useState<Record<string, { 
     shape: string,
     speed: number,
     sizePan: number,
     sizeTilt: number,
     fan: number,
     invert180: boolean,
     label: string 
   }[]>>(() => {
     const saved = localStorage.getItem('dmx_group_movement_presets');
     return saved ? JSON.parse(saved) : {};
   });
 
   const [fixtureCalibration, setFixtureCalibration] = useState<Record<number, CalibrationSettings>>(() => {
    const saved = localStorage.getItem('dmx_fixture_calibration');
    return saved ? JSON.parse(saved) : {};
  });

  const [groupPulseActive, setGroupPulseActive] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('dmx_group_pulse');
    return saved ? JSON.parse(saved) : {};
  });

  const [bpm, setBpm] = useState(120);

  const [liveGroupPositions, setLiveGroupPositions] = useState<Record<string, { pan: number, tilt: number }>>({});
  const [liveGroupColors, setLiveGroupColors] = useState<Record<string, number>>({});
  const [liveGroupGobos, setLiveGroupGobos] = useState<Record<string, number>>({});
  // --------------------------------------------------------------------------
  
  // Initialisation des fixtures depuis localStorage ou données par défaut
  const [fixtures, setFixtures] = useState(() => {
    const saved = localStorage.getItem('dmx_patched_fixtures');
    return saved ? JSON.parse(saved) : fixturesData;
  });

  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('dmx_groups');
    return saved ? JSON.parse(saved) : groupsData;
  });

  // Sauvegarde des fixtures quand elles changent
  useEffect(() => {
    localStorage.setItem('dmx_patched_fixtures', JSON.stringify(fixtures));
  }, [fixtures]);

  // Sauvegarde des groupes quand ils changent
  useEffect(() => {
    localStorage.setItem('dmx_groups', JSON.stringify(groups));
  }, [groups]);

  // Sauvegarde des états du moteur DMX
  useEffect(() => {
    localStorage.setItem('dmx_group_movements', JSON.stringify(groupMovements));
    localStorage.setItem('dmx_group_pan', JSON.stringify(groupPan));
    localStorage.setItem('dmx_group_tilt', JSON.stringify(groupTilt));
    localStorage.setItem('dmx_group_auto_color', JSON.stringify(groupAutoColorActive));
    localStorage.setItem('dmx_group_auto_gobo', JSON.stringify(groupAutoGoboActive));
    localStorage.setItem('dmx_group_pulse', JSON.stringify(groupPulseActive));
    localStorage.setItem('dmx_group_intensities', JSON.stringify(groupIntensities));
    localStorage.setItem('dmx_group_colors', JSON.stringify(groupColors));
    localStorage.setItem('dmx_group_gobos', JSON.stringify(groupGobos));
    localStorage.setItem('dmx_group_positions', JSON.stringify(groupPositions));
    localStorage.setItem('dmx_group_movement_presets', JSON.stringify(groupMovementPresets));
    localStorage.setItem('dmx_fixture_calibration', JSON.stringify(fixtureCalibration));
  }, [groupMovements, groupPan, groupTilt, groupAutoColorActive, groupAutoGoboActive, groupPulseActive, groupIntensities, groupColors, groupGobos, groupPositions, groupMovementPresets, fixtureCalibration]);

  const getFixtureById = (id: number | null) => fixtures.find((f: any) => f.id === id);

  // Sync avec le backend Rust
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await invoke<boolean>('get_connection_status');
        setIsConnected(status);
        const universe = await invoke<number[]>('get_universe');
        if (universe && universe.length > 0) {
          // On ne met à jour QUE si les données ont changé pour économiser les re-renders
          setChannels(prev => {
            const hasChanged = universe.some((val, i) => val !== prev[i]);
            return hasChanged ? [...universe] : prev;
          });
        }
      } catch (e) {
        console.error("Erreur status:", e);
      }
    }, 50); // Réduit à 50ms pour une vue fluide (20Hz)
    return () => clearInterval(interval);
  }, []);

  const updateDmx = async (ch: number, val: string | number) => {
    // On arrondit systématiquement à l'entier le plus proche (le DMX ne gère que 0-255)
    const rawVal = typeof val === 'string' ? parseFloat(val) : val;
    const numVal = Math.round(Math.min(255, Math.max(0, rawVal)));
    
    // Mettre à jour l'état local immédiatement pour la vue DMX
    setChannels(prev => {
      if (prev[ch] === numVal) return prev;
      const newChannels = [...prev];
      newChannels[ch] = numVal;
      return newChannels;
    });

    try {
      await invoke('update_dmx', { channel: ch + 1, value: numVal });
    } catch (e) {
      // Éviter de logguer en boucle les erreurs de port
    }
  };

  const handleMasterDimmer = async (val: number) => {
    for (const fixture of fixtures) {
      const start = fixture.address - 1;
      if (fixture.type === 'RGB') {
        await updateDmx(start, val);
      } else if (fixture.type === 'Moving Head') {
        await updateDmx(start + 5, val); // CH6 pour PicoSpot
      }
    }
  };

  const handleMasterStrobe = async (val: number) => {
    for (const fixture of fixtures) {
      const start = fixture.address - 1;
      if (fixture.type === 'RGB') {
        await updateDmx(start + 4, val); // CH5 pour Flood Panel
      } else if (fixture.type === 'Moving Head') {
        await updateDmx(start + 8, val); // CH9 pour PicoSpot
      }
    }
  };

  const handleMultiFixtureAction = async (fixtureIds: number[], action: 'dimmer' | 'color' | 'strobe' | 'pan' | 'tilt', value: any) => {
    for (const fixtureId of fixtureIds) {
      const fixture = fixtures.find((f: any) => f.id === fixtureId);
      if (!fixture) continue;

      const start = fixture.address - 1;

      if (action === 'dimmer') {
        if (fixture.type === 'RGB') await updateDmx(start, value);
        else if (fixture.type === 'Moving Head') await updateDmx(start + 5, value);
        else if (fixture.type === 'Effect') await updateDmx(start, value);
      } else if (action === 'strobe') {
        if (fixture.type === 'RGB') await updateDmx(start + 4, value);
        else if (fixture.type === 'Moving Head') await updateDmx(start + 8, value);
      } else if (action === 'color') {
        if (fixture.type === 'RGB') {
          await updateDmx(start + 1, value.r);
          await updateDmx(start + 2, value.g);
          await updateDmx(start + 3, value.b);
        }
      } else if (action === 'pan') {
        if (fixture.type === 'Moving Head') await updateDmx(start, value);
      } else if (action === 'tilt') {
        if (fixture.type === 'Moving Head') await updateDmx(start + 2, value);
      }
    }
  };

  const handleGroupAction = async (groupId: string, action: 'dimmer' | 'color' | 'strobe', value: any) => {
    const group = groups.find((g: any) => g.id === groupId);
    if (!group) return;

    for (const fixtureId of group.fixtureIds) {
      const fixture = fixtures.find((f: any) => f.id === fixtureId);
      if (!fixture) continue;

      const start = fixture.address - 1;

      if (action === 'dimmer') {
        if (fixture.type === 'RGB') {
          await updateDmx(start, value);
        } else if (fixture.type === 'Moving Head') {
          await updateDmx(start + 5, value);
        }
      } else if (action === 'strobe') {
        if (fixture.type === 'RGB') {
          await updateDmx(start + 4, value);
        } else if (fixture.type === 'Moving Head') {
          await updateDmx(start + 8, value);
        }
      } else if (action === 'color') {
        if (fixture.type === 'RGB') {
          await updateDmx(start + 1, value.r);
          await updateDmx(start + 2, value.g);
          await updateDmx(start + 3, value.b);
        }
      }
    }
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
    setGroups((prev: any[]) => prev.map((g: any) => g.id === groupId ? { ...g, name: newName } : g));
  };

  const handleCreateGroup = (name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '_');
    setGroups((prev: any[]) => [...prev, { id, name, fixtureIds: [], isAmbiance: false }]);
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev: any[]) => prev.filter((g: any) => g.id !== groupId));
  };

  const handleUpdateGroupFixtures = (groupId: string, fixtureIds: number[]) => {
    setGroups((prev: any[]) => prev.map((g: any) => g.id === groupId ? { ...g, fixtureIds } : g));
  };

  const handleToggleGroupAmbiance = (groupId: string) => {
    setGroups((prev: any[]) => prev.map((g: any) => g.id === groupId ? { ...g, isAmbiance: !g.isAmbiance } : g));
  };

  const handlePanChange = (val: string) => {
    const numVal = parseInt(val);
    setPan(numVal);
    updateDmx(0, numVal);
  };

  const handleTiltChange = (val: string) => {
    const numVal = parseInt(val);
    setTilt(numVal);
    updateDmx(1, numVal);
  };

  const handleUpdateAddress = (fixtureId: number, newAddress: number) => {
    setFixtures((prev: any[]) => prev.map((f: any) => f.id === fixtureId ? { ...f, address: newAddress } : f));
  };

  const handleAddFixture = (newFixture: any) => {
    setFixtures((prev: any[]) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((f: any) => f.id)) + 1 : 1;
      return [...prev, { ...newFixture, id: nextId }];
    });
  };

  const handleDeleteFixture = (id: number) => {
    setFixtures((prev: any[]) => prev.filter((f: any) => f.id !== id));
  };

  const handleIdentify = async (fixtureId: number) => {
    const fixture = getFixtureById(fixtureId);
    if (!fixture) return;
    
    const start = fixture.address - 1;
    const len = fixture.channels;
    
    try {
      // Flash à 255
      for (let i = 0; i < len; i++) {
        await invoke('update_dmx', { channel: start + i + 1, value: 255 });
      }
      
      // Attendre 1.5s puis remettre à 0 (ou à l'état précédent, mais 0 est plus simple pour l'identification)
      setTimeout(async () => {
        for (let i = 0; i < len; i++) {
          await invoke('update_dmx', { channel: start + i + 1, value: 0 });
        }
      }, 1500);
    } catch (e) {
      console.error("Erreur identification:", e);
    }
  };

  // --- LOGIQUE DU MOTEUR DMX EN ARRIÈRE-PLAN ---

  // Logique du générateur de mouvements (Shapes)
  useEffect(() => {
    const activeGroups = Object.keys(groupMovements).filter((id: string) => 
      groupMovements[id]?.shape !== 'none' && groups.some(g => g.id === id)
    );
    
    if (activeGroups.length === 0) {
      if (Object.keys(liveGroupPositions).length > 0) setLiveGroupPositions({});
      return;
    }

    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newLivePositions: Record<string, { pan: number, tilt: number }> = {};

      activeGroups.forEach((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        const config = groupMovements[groupId];
        if (!group || !config) return;

        const speed = config.speed / 50;
        const sizePan = (config.sizePan ?? 64) / 2;
        const sizeTilt = (config.sizeTilt ?? 64) / 2;
        const fan = config.fan;

        // Calcul de la position "live" pour le groupe
        const basePhase = elapsed * speed;
        let basePanOffset = 0;
        let baseTiltOffset = 0;

        switch (config.shape) {
          case 'circle':
            basePanOffset = Math.cos(basePhase) * sizePan;
            baseTiltOffset = Math.sin(basePhase) * sizeTilt;
            break;
          case 'eight':
            basePanOffset = Math.cos(basePhase) * sizePan;
            baseTiltOffset = Math.sin(basePhase * 2) * (sizeTilt / 2);
            break;
          case 'pan_sweep':
            basePanOffset = Math.cos(basePhase) * sizePan;
            break;
          case 'tilt_sweep':
            baseTiltOffset = Math.sin(basePhase) * sizeTilt;
            break;
          case 'custom':
            if (config.customPoints && config.customPoints.length > 1) {
              const pts = config.customPoints;
              const total = pts.length;
              // On utilise un temps normalisé pour éviter les saccades en fin de boucle
              const t = (basePhase % total);
              const i = Math.floor(t);
              const nextI = (i + 1) % total;
              const frac = t - i;
              
              const p1 = pts[i];
              const p2 = pts[nextI];
              
              // Interpolation linéaire continue
              basePanOffset = (p1.x + (p2.x - p1.x) * frac - 127) * (config.sizePan / 128);
              baseTiltOffset = (p1.y + (p2.y - p1.y) * frac - 127) * (config.sizeTilt / 128);
            }
            break;
        }

        newLivePositions[groupId] = {
          pan: Math.min(255, Math.max(0, (groupPan[groupId] ?? 127) + basePanOffset)),
          tilt: Math.min(255, Math.max(0, (groupTilt[groupId] ?? 127) + baseTiltOffset))
        };

        group.fixtureIds.forEach((id: number, index: number) => {
          const fixture = fixtures.find(f => f.id === id);
          if (fixture && fixture.type === 'Moving Head') {
            const phase = elapsed * speed + (index * (fan / 255) * Math.PI * 2);
            let panOffset = 0;
            let tiltOffset = 0;

            switch (config.shape) {
              case 'circle':
                panOffset = Math.cos(phase) * sizePan;
                tiltOffset = Math.sin(phase) * sizeTilt;
                break;
              case 'eight':
                panOffset = Math.cos(phase) * sizePan;
                tiltOffset = Math.sin(phase * 2) * (sizeTilt / 2);
                break;
              case 'pan_sweep':
                panOffset = Math.cos(phase) * sizePan;
                break;
              case 'tilt_sweep':
                tiltOffset = Math.sin(phase) * sizeTilt;
                break;
              case 'custom':
                if (config.customPoints && config.customPoints.length > 1) {
                  const pts = config.customPoints;
                  const total = pts.length;
                  // On utilise un temps normalisé pour éviter les saccades en fin de boucle
                  const t = (phase % total);
                  const i = Math.floor(t);
                  const nextI = (i + 1) % total;
                  const frac = t - i;
                  
                  const p1 = pts[i];
                  const p2 = pts[nextI];
                  
                  // Interpolation linéaire continue
                  panOffset = (p1.x + (p2.x - p1.x) * frac - 127) * (config.sizePan / 128);
                  tiltOffset = (p1.y + (p2.y - p1.y) * frac - 127) * (config.sizeTilt / 128);
                }
                break;
            }

            if (config.invert180 && index % 2 !== 0) {
              panOffset = -panOffset;
              tiltOffset = -tiltOffset;
            }

            const finalPan = Math.min(255, Math.max(0, (groupPan[groupId] ?? 127) + panOffset));
            const finalTilt = Math.min(255, Math.max(0, (groupTilt[groupId] ?? 127) + tiltOffset));

            const cal = fixtureCalibration[id] || { invertPan: false, invertTilt: false, offsetPan: 0, offsetTilt: 0 };
            let calPan = Math.min(255, Math.max(0, finalPan + cal.offsetPan));
            let calTilt = Math.min(255, Math.max(0, finalTilt + cal.offsetTilt));
            
            if (cal.invertPan) calPan = 255 - calPan;
            if (cal.invertTilt) calTilt = 255 - calTilt;

            // Utilisation d'un batch update ou invoke direct pour éviter la surcharge de l'état React
            invoke('update_dmx', { channel: fixture.address, value: Math.round(calPan) }).catch(() => {});
            invoke('update_dmx', { channel: fixture.address + 2, value: Math.round(calTilt) }).catch(() => {});
          }
        });
      });

      setLiveGroupPositions(newLivePositions);
    }, 40);

    return () => clearInterval(interval);
  }, [groupMovements, groupPan, groupTilt, groups, fixtures, fixtureCalibration]);

  // Logique Auto-Color
  useEffect(() => {
    const activeGroups = Object.keys(groupAutoColorActive).filter(id => 
      groupAutoColorActive[id] === true && groups.some(g => g.id === id)
    );
    
    if (activeGroups.length === 0) {
      if (Object.keys(liveGroupColors).length > 0) setLiveGroupColors({});
      return;
    }

    const wheelColors = [
      { r: 255, g: 255, b: 255, v: 5 },  { r: 255, g: 0,   b: 0,   v: 16 },
      { r: 255, g: 128, b: 0,   v: 27 }, { r: 255, g: 255, b: 0,   v: 38 },
      { r: 0,   g: 255, b: 0,   v: 49 }, { r: 0,   g: 0,   b: 255, v: 60 },
      { r: 0,   g: 255, b: 255, v: 71 }, { r: 255, g: 0,   b: 255, v: 82 }
    ];

    const interval = setInterval(() => {
      const newLiveColors: Record<string, number> = {};
      activeGroups.forEach(groupId => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
          const hasMovingHead = fixtures.some(f => group.fixtureIds.includes(f.id) && f.type === 'Moving Head');
          if (hasMovingHead) {
            // Cycle plus lent pour les lyres (Color Wheel), changement toutes les 1.5 secondes
            const colorIndex = Math.floor((Date.now() / 1500) % wheelColors.length);
            const color = wheelColors[colorIndex];
            newLiveColors[groupId] = color.v;
            
            group.fixtureIds.forEach(id => {
              const f = fixtures.find(fx => fx.id === id);
              if (f && f.type === 'Moving Head') {
                updateDmx(f.address + 5, color.v);   // PicoSpot CH6 : Color Wheel (address+5)
              }
            });
          } else {
            const currentHue = (Date.now() / 20) % 360;
            const { r, g, b } = hslToRgb(currentHue, 100, 50);
            
            group.fixtureIds.forEach(id => {
              const f = fixtures.find(fx => fx.id === id);
              if (f && f.type === 'RGB') {
                updateDmx(f.address, r);             // Canal 2 : Rouge
                updateDmx(f.address + 1, g);         // Canal 3 : Vert
                updateDmx(f.address + 2, b);         // Canal 4 : Bleu
              }
            });
          }
        }
      });
      setLiveGroupColors(newLiveColors);
    }, 50); // Fréquence augmentée à 20Hz (50ms) pour des transitions fluides

    return () => clearInterval(interval);
  }, [groupAutoColorActive, groups, fixtures]);

  // Logique du mode Pulse (synchronisé sur le BPM)
  useEffect(() => {
    const activeGroups = Object.keys(groupPulseActive).filter(id => 
      groupPulseActive[id] === true && groups.some(g => g.id === id)
    );
    
    if (activeGroups.length === 0) return;

    const interval = setInterval(() => {
      const beatDuration = (60 / bpm) * 1000;
      const elapsed = Date.now();
      const progress = (elapsed % beatDuration) / beatDuration;
      
      // Courbe de décroissance exponentielle pour un effet "impact"
      const decay = Math.pow(1 - progress, 2);
      const currentIntensity = Math.round(255 * decay);
      
      activeGroups.forEach(groupId => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
          group.fixtureIds.forEach(id => {
            const fixture = fixtures.find(f => f.id === id);
            if (fixture) {
              const start = fixture.address - 1;
              if (fixture.type === 'RGB') {
                updateDmx(start, currentIntensity);
              } else if (fixture.type === 'Moving Head') {
                updateDmx(start + 5, currentIntensity);
              } else if (fixture.type === 'Effect') {
                updateDmx(start, currentIntensity);
              }
            }
          });
        }
      });
    }, 30); // 33fps pour une fluidité correcte

    return () => clearInterval(interval);
  }, [groupPulseActive, bpm, groups, fixtures]);

  // Logique Auto-Gobo
  useEffect(() => {
    const activeGroups = Object.keys(groupAutoGoboActive).filter(id => 
      groupAutoGoboActive[id] === true && groups.some(g => g.id === id)
    );
    
    if (activeGroups.length === 0) {
      if (Object.keys(liveGroupGobos).length > 0) setLiveGroupGobos({});
      return;
    }

    const interval = setInterval(() => {
      const newLiveGobos: Record<string, number> = {};
      activeGroups.forEach(groupId => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
          // Cycle des gobos (0-7), changement toutes les 2 secondes
          const goboIndex = Math.floor((Date.now() / 2000) % 8);
          const dmxValue = goboIndex * 32;
          newLiveGobos[groupId] = goboIndex;
          
          group.fixtureIds.forEach(id => {
            const f = fixtures.find(fx => fx.id === id);
            if (f && f.type === 'Moving Head') {
              updateDmx(f.address + 6, dmxValue);   // PicoSpot CH7 : Gobo (address+6)
            }
          });
        }
      });
      setLiveGroupGobos(newLiveGobos);
    }, 100);

    return () => clearInterval(interval);
  }, [groupAutoGoboActive, groups, fixtures]);

  const handlePortChange = async (newPort: string) => {
    setSelectedPort(newPort);
    console.log("Changement de port vers:", newPort);
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-8 font-sans selection:bg-cyan-500/30 flex flex-col">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
              PETITELUNE<span className="text-cyan-500">DMX</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Pro Lighting Control v{APP_VERSION}</p>
              <button 
                onClick={() => setIsAboutModalOpen(true)}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-500 hover:text-cyan-400 transition-all active:scale-90"
                title="Informations sur l'application"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        
        <nav className="flex bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 gap-1">
          {[
            { id: 'live', label: 'Live', icon: Zap },
            { id: 'fixtures', label: 'Projecteurs', icon: Layout },
            { id: 'stage', label: 'Plateau', icon: Maximize2 },
            { id: 'editor', label: 'Librairie', icon: Box },
            { id: 'console', label: 'Vue DMX', icon: Sliders },
            { id: 'patch', label: 'Patch', icon: Edit2 },
            { id: 'settings', label: 'Réglages', icon: SettingsIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className={`flex items-center gap-3 px-5 py-2 rounded-full border ${
          isConnected ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-cyan-400' : 'bg-red-400'}`} />
          <span className="text-xs font-bold uppercase tracking-widest">
            {isConnected ? `Interface Active : ${selectedPort}` : 'Déconnecté'}
          </span>
          <RefreshCw className="w-4 h-4 ml-2 cursor-pointer hover:rotate-180 transition-transform duration-500" />
        </div>
      </header>

      <main className="flex-1">
        {activeTab === 'live' && (
          <LiveTab 
            fixtures={fixtures}
            channels={channels} 
            pan={pan} 
            tilt={tilt} 
            groups={groups}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            selectedFixtures={selectedFixtures}
            setSelectedFixtures={setSelectedFixtures}
            updateDmx={updateDmx} 
            handlePanChange={handlePanChange} 
            handleTiltChange={handleTiltChange} 
            handleGroupAction={handleGroupAction}
            handleMultiFixtureAction={handleMultiFixtureAction}
            handleMasterDimmer={handleMasterDimmer}
            handleMasterStrobe={handleMasterStrobe}
            onRenameGroup={handleRenameGroup}
            
            // États migrés vers App pour persistance en arrière-plan
            groupMovements={groupMovements}
            setGroupMovements={setGroupMovements}
            groupPan={groupPan}
            setGroupPan={setGroupPan}
            groupTilt={groupTilt}
            setGroupTilt={setGroupTilt}
            groupAutoColorActive={groupAutoColorActive}
            setGroupAutoColorActive={setGroupAutoColorActive}
            groupAutoGoboActive={groupAutoGoboActive}
            setGroupAutoGoboActive={setGroupAutoGoboActive}
            groupGobos={groupGobos}
            setGroupGobos={setGroupGobos}
            groupPositions={groupPositions}
            setGroupPositions={setGroupPositions}
            groupMovementPresets={groupMovementPresets}
            setGroupMovementPresets={setGroupMovementPresets}
            groupCustomTrajectories={groupCustomTrajectories}
            setGroupCustomTrajectories={setGroupCustomTrajectories}
            fixtureCalibration={fixtureCalibration}
            setFixtureCalibration={setFixtureCalibration}
            liveGroupPositions={liveGroupPositions}
            liveGroupColors={liveGroupColors}
            liveGroupGobos={liveGroupGobos}
            
            // Intensités pour le moteur Auto-Color
            groupIntensities={groupIntensities}
            setGroupIntensities={setGroupIntensities}
            groupColors={groupColors}
            setGroupColors={setGroupColors}
            groupPulseActive={groupPulseActive}
            setGroupPulseActive={setGroupPulseActive}
            bpm={bpm}
            setBpm={setBpm}
          />
        )}

        {activeTab === 'fixtures' && (
          <FixturesTab 
            fixtures={fixtures}
            selectedFixture={selectedFixture}
            setSelectedFixture={setSelectedFixture}
            getFixtureById={getFixtureById}
            channels={channels}
            updateDmx={updateDmx}
            onIdentify={handleIdentify}
          />
        )}

        {activeTab === 'patch' && (
          <PatchTab 
            fixtures={fixtures}
            groups={groups}
            channels={channels}
            onUpdateAddress={handleUpdateAddress}
            onAddFixture={handleAddFixture}
            onDeleteFixture={handleDeleteFixture}
            onIdentify={handleIdentify}
            onCreateGroup={handleCreateGroup}
            onDeleteGroup={handleDeleteGroup}
            onUpdateGroupFixtures={handleUpdateGroupFixtures}
            onRenameGroup={handleRenameGroup}
            onToggleGroupAmbiance={handleToggleGroupAmbiance}
          />
        )}

        {activeTab === 'console' && (
          <DmxConsoleTab 
            fixtures={fixtures}
            channels={channels}
            updateDmx={updateDmx}
            onIdentify={handleIdentify}
          />
        )}

        {activeTab === 'stage' && (
          <StageTab 
            fixtures={fixtures}
            channels={channels}
          />
        )}

        {activeTab === 'editor' && (
          <FixtureEditorTab />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <GlassCard title="Configuration Système" icon={SettingsIcon}>
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Interface DMX</p>
                    <p className="text-[10px] text-slate-500">Enttec Open DMX / FT232R USB UART</p>
                  </div>
                  <select 
                    value={selectedPort}
                    onChange={(e) => handlePortChange(e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-lg text-xs p-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="COM1">COM1</option>
                    <option value="COM2">COM2</option>
                    <option value="COM3">COM3</option>
                    <option value="COM4">COM4</option>
                    <option value="COM99">COM99</option>
                  </select>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Fréquence de Rafraîchissement</p>
                    <p className="text-[10px] text-slate-500">Standard DMX (40Hz)</p>
                  </div>
                  <span className="text-cyan-400 font-mono text-xs">40 Hz</span>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </main>
      {/* Modale À Propos */}
      <AboutModal 
        isOpen={isAboutModalOpen} 
        onClose={() => setIsAboutModalOpen(false)} 
        version={APP_VERSION} 
      />
    </div>
  );
}

export default App;

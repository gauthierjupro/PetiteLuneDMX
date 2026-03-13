import React, { useState, useEffect, useCallback } from 'react';
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
  Box
} from 'lucide-react';

import fixturesData from './data/fixtures_patch.json';
import groupsData from './data/groups.json';

// Components
import { LiveTab } from './components/tabs/LiveTab';
import { FixturesTab } from './components/tabs/FixturesTab';
import { PatchTab } from './components/tabs/PatchTab';
import { EffectsTab } from './components/tabs/EffectsTab';
import { DmxConsoleTab } from './components/tabs/DmxConsoleTab';
import { StageTab } from './components/tabs/StageTab';
import { FixtureEditorTab } from './components/tabs/FixtureEditorTab';
import { GlassCard } from './components/ui/GlassCard';

type TabType = 'live' | 'fixtures' | 'effects' | 'patch' | 'console' | 'stage' | 'editor' | 'settings';

function App() {
  const [channels, setChannels] = useState<number[]>(Array(512).fill(0));
  const [isConnected, setIsConnected] = useState(false);
  const [pan, setPan] = useState(127);
  const [tilt, setTilt] = useState(127);
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [selectedFixture, setSelectedFixture] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState('COM3');
  const [selectedFixtures, setSelectedFixtures] = useState<number[]>([]);
  
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
    const numVal = typeof val === 'string' ? parseInt(val) : val;
    try {
      await invoke('update_dmx', { channel: ch + 1, value: numVal });
    } catch (e) {
      console.error(e);
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

  const handlePortChange = async (newPort: string) => {
    setSelectedPort(newPort);
    console.log("Changement de port vers:", newPort);
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-8 font-sans selection:bg-cyan-500/30 flex flex-col">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
            PETITELUNE<span className="text-cyan-500">DMX</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Professional Lighting Control v1.0</p>
        </div>
        
        <nav className="flex bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 gap-1">
          {[
            { id: 'live', label: 'Live', icon: Zap },
            { id: 'fixtures', label: 'Projecteurs', icon: Layout },
            { id: 'effects', label: 'Effets', icon: Activity },
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

        {activeTab === 'effects' && (
          <EffectsTab fixtures={fixtures} />
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
    </div>
  );
}

export default App;

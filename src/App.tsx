import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Zap,
  Settings as SettingsIcon,
  Layout,
  Edit2,
  Maximize2,
  Box,
  Database,
  Sliders,
  Info,
} from 'lucide-react';

import { LiveTab } from './components/tabs/LiveTab';
import { FixturesTab } from './components/tabs/FixturesTab';
import { PatchTab } from './components/tabs/PatchTab';
import { DmxConsoleTab } from './components/tabs/DmxConsoleTab';
import { StageTab } from './components/tabs/StageTab';
import { Stage3DTab } from './components/tabs/Stage3DTab';
import { FixtureEditorTab } from './components/tabs/FixtureEditorTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { AboutModal } from './components/ui/AboutModal';
import { ConnectionStatus } from './components/ui/ConnectionStatus';

import { TabType, FixtureControlAction, GroupControlAction, RgbColor } from './types';
import { usePatchStore } from './hooks/usePatchStore';
import { useLiveStore } from './hooks/useLiveStore';
import { useSettingsStore } from './hooks/useSettingsStore';
import { useLiveEngine } from './hooks/useLiveEngine';
import { useAppPreferences } from './hooks/useAppPreferences';
import { useWebMidi } from './hooks/useWebMidi';
import { FirstShowWizard } from './components/ui/FirstShowWizard';

const APP_VERSION = '1.7.0';

const TABS = [
  { id: 'live' as const, label: 'Live', icon: Zap },
  { id: 'fixtures' as const, label: 'Projecteurs', icon: Layout },
  { id: 'stage' as const, label: 'Plateau', icon: Maximize2 },
  { id: 'stage3d' as const, label: 'Vue 3D', icon: Box },
  { id: 'editor' as const, label: 'Librairie', icon: Database },
  { id: 'console' as const, label: 'Vue DMX', icon: Sliders },
  { id: 'patch' as const, label: 'Patch', icon: Edit2 },
  { id: 'settings' as const, label: 'Réglages', icon: SettingsIcon },
];

function App() {
  const patch = usePatchStore();
  const live = useLiveStore();
  const settings = useSettingsStore();
  const prefs = useAppPreferences();

  useLiveEngine({
    fixtures: patch.fixtures,
    groups: patch.groups,
    live,
    updateDmx: settings.updateDmx,
    reportDmxError: settings.reportDmxError,
  });

  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [selectedFixture, setSelectedFixture] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedFixtures, setSelectedFixtures] = useState<number[]>([]);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  useWebMidi(prefs.midiEnabled, activeTab === 'live', (val) => {
    live.setMasterDimmer(val);
  });

  const applyGlobalIntensity = async (_val: number) => {
    // Géré par la boucle Master dans useLiveEngine
  };

  const handleMasterDimmer = async (val: number) => {
    live.setMasterDimmer(val);
  };

  const handleMasterStrobe = async (val: number) => {
    for (const fixture of patch.fixtures) {
      const start = fixture.address - 1;
      if (fixture.type === 'RGB') {
        await settings.updateDmx(start + 4, val);
      } else if (fixture.type === 'Moving Head') {
        await settings.updateDmx(start + 8, val);
      }
    }
  };

  const handleMultiFixtureAction = async (
    fixtureIds: number[],
    action: FixtureControlAction,
    value: number | RgbColor
  ) => {
    for (const fixtureId of fixtureIds) {
      const fixture = patch.fixtures.find((f) => f.id === fixtureId);
      if (!fixture) continue;
      const start = fixture.address - 1;

      if (action === 'strobe' && typeof value === 'number') {
        if (fixture.type === 'RGB') await settings.updateDmx(start + 4, value);
        else if (fixture.type === 'Moving Head') await settings.updateDmx(start + 8, value);
      } else if (action === 'color' && fixture.type === 'RGB' && typeof value === 'object') {
        await settings.updateDmx(start + 1, value.r);
        await settings.updateDmx(start + 2, value.g);
        await settings.updateDmx(start + 3, value.b);
      } else if (action === 'pan' && fixture.type === 'Moving Head' && typeof value === 'number') {
        await settings.updateDmx(start, value);
      } else if (action === 'tilt' && fixture.type === 'Moving Head' && typeof value === 'number') {
        await settings.updateDmx(start + 2, value);
      }
    }
  };

  const handleGroupAction = async (
    groupId: string,
    action: GroupControlAction,
    value: number | RgbColor
  ) => {
    const group = patch.groups.find((g) => g.id === groupId);
    if (!group || action === 'dimmer') return;

    for (const fixtureId of group.fixtureIds) {
      const fixture = patch.fixtures.find((f) => f.id === fixtureId);
      if (!fixture) continue;
      const start = fixture.address - 1;

      if (action === 'strobe' && typeof value === 'number') {
        if (fixture.type === 'RGB') await settings.updateDmx(start + 4, value);
        else if (fixture.type === 'Moving Head') await settings.updateDmx(start + 8, value);
      } else if (action === 'color' && fixture.type === 'RGB' && typeof value === 'object') {
        await settings.updateDmx(start + 1, value.r);
        await settings.updateDmx(start + 2, value.g);
        await settings.updateDmx(start + 3, value.b);
      }
    }
  };

  const handlePanChange = (val: string) => {
    const numVal = parseInt(val, 10);
    live.setPan(numVal);
    void settings.updateDmx(0, numVal);
  };

  const handleTiltChange = (val: string) => {
    const numVal = parseInt(val, 10);
    live.setTilt(numVal);
    void settings.updateDmx(1, numVal);
  };

  const handleIdentify = async (fixtureId: number) => {
    const fixture = patch.getFixtureById(fixtureId);
    if (!fixture) return;

    const start = fixture.address - 1;
    const len = fixture.channels;

    try {
      for (let i = 0; i < len; i++) {
        await invoke('update_dmx', { channel: start + i + 1, value: 255 });
      }
      setTimeout(async () => {
        for (let i = 0; i < len; i++) {
          await invoke('update_dmx', { channel: start + i + 1, value: 0 });
        }
      }, 1500);
    } catch (e) {
      console.error('Erreur identification:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-8 font-sans selection:bg-cyan-500/30 flex flex-col">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
              PETITELUNE<span className="text-cyan-500">DMX</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
                Pro Lighting Control v{APP_VERSION}
              </p>
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
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

        <ConnectionStatus
          isConnected={settings.isConnected}
          port={settings.selectedPort}
          connectionError={settings.connectionError}
          actualHz={settings.actualHz}
          targetHz={settings.targetHz}
          latencyMs={settings.latencyMs}
          onReconnect={settings.handleForceReconnect}
        />
      </header>

      <main className="flex-1">
        {activeTab === 'live' && (
          <LiveTab
            fixtures={patch.fixtures}
            channels={settings.channels}
            pan={live.pan}
            tilt={live.tilt}
            groups={patch.groups}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            selectedFixtures={selectedFixtures}
            setSelectedFixtures={setSelectedFixtures}
            updateDmx={settings.updateDmx}
            handlePanChange={handlePanChange}
            handleTiltChange={handleTiltChange}
            handleGroupAction={handleGroupAction}
            handleMultiFixtureAction={handleMultiFixtureAction}
            handleMasterDimmer={handleMasterDimmer}
            applyGlobalIntensity={applyGlobalIntensity}
            masterDimmer={live.masterDimmer}
            handleMasterStrobe={handleMasterStrobe}
            onRenameGroup={patch.handleRenameGroup}
            groupMovements={live.groupMovements}
            setGroupMovements={live.setGroupMovements}
            groupPan={live.groupPan}
            setGroupPan={live.setGroupPan}
            groupTilt={live.groupTilt}
            setGroupTilt={live.setGroupTilt}
            groupAutoColorActive={live.groupAutoColorActive}
            setGroupAutoColorActive={live.setGroupAutoColorActive}
            groupAutoGoboActive={live.groupAutoGoboActive}
            setGroupAutoGoboActive={live.setGroupAutoGoboActive}
            groupGobos={live.groupGobos}
            setGroupGobos={live.setGroupGobos}
            groupPositions={live.groupPositions}
            setGroupPositions={live.setGroupPositions}
            groupMovementPresets={live.groupMovementPresets}
            setGroupMovementPresets={live.setGroupMovementPresets}
            groupCustomTrajectories={live.groupCustomTrajectories}
            setGroupCustomTrajectories={live.setGroupCustomTrajectories}
            fixtureCalibration={live.fixtureCalibration}
            setFixtureCalibration={live.setFixtureCalibration}
            liveGroupPositions={live.liveGroupPositions}
            liveGroupColors={live.liveGroupColors}
            liveGroupGobos={live.liveGroupGobos}
            groupIntensities={live.groupIntensities}
            setGroupIntensities={live.setGroupIntensities}
            groupColors={live.groupColors}
            setGroupColors={live.setGroupColors}
            groupPulseActive={live.groupPulseActive}
            setGroupPulseActive={live.setGroupPulseActive}
            bpm={live.bpm}
            setBpm={live.setBpm}
          />
        )}

        {activeTab === 'fixtures' && (
          <FixturesTab
            fixtures={patch.fixtures}
            selectedFixture={selectedFixture}
            setSelectedFixture={setSelectedFixture}
            getFixtureById={patch.getFixtureById}
            channels={settings.channels}
            updateDmx={settings.updateDmx}
            onIdentify={handleIdentify}
          />
        )}

        {activeTab === 'patch' && (
          <PatchTab
            fixtures={patch.fixtures}
            groups={patch.groups}
            channels={settings.channels}
            onUpdateAddress={patch.handleUpdateAddress}
            onAddFixture={patch.handleAddFixture}
            onDeleteFixture={patch.handleDeleteFixture}
            onIdentify={handleIdentify}
            onCreateGroup={patch.handleCreateGroup}
            onDeleteGroup={patch.handleDeleteGroup}
            onUpdateGroupFixtures={patch.handleUpdateGroupFixtures}
            onRenameGroup={patch.handleRenameGroup}
            onToggleGroupAmbiance={patch.handleToggleGroupAmbiance}
          />
        )}

        {activeTab === 'console' && (
          <DmxConsoleTab
            fixtures={patch.fixtures}
            channels={settings.channels}
            updateDmx={settings.updateDmx}
            onIdentify={handleIdentify}
          />
        )}

        {activeTab === 'stage' && (
          <StageTab fixtures={patch.fixtures} channels={settings.channels} />
        )}

        {activeTab === 'stage3d' && (
          <Stage3DTab fixtures={patch.fixtures} channels={settings.channels} />
        )}

        {activeTab === 'editor' && <FixtureEditorTab />}

        {activeTab === 'settings' && (
          <SettingsTab
            selectedPort={settings.selectedPort}
            onPortChange={settings.handlePortChange}
            blackoutOnDisconnect={settings.blackoutOnDisconnect}
            onBlackoutOnDisconnectChange={settings.handleBlackoutOnDisconnectChange}
            isConnected={settings.isConnected}
            connectionError={settings.connectionError}
            actualHz={settings.actualHz}
            targetHz={settings.targetHz}
            latencyMs={settings.latencyMs}
            appVersion={APP_VERSION}
            theme={prefs.theme}
            onThemeChange={prefs.setTheme}
            density={prefs.density}
            onDensityChange={prefs.setDensity}
            midiEnabled={prefs.midiEnabled}
            onMidiEnabledChange={prefs.setMidiEnabled}
          />
        )}
      </main>

      <FirstShowWizard onGoToTab={(tab) => setActiveTab(tab)} />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        version={APP_VERSION}
      />
    </div>
  );
}

export default App;

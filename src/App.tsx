import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Zap,
  Settings as SettingsIcon,
  Edit2,
  Maximize2,
  Database,
  Info,
  Sparkles,
} from 'lucide-react';

import { LiveTab } from './components/tabs/LiveTab';
import { PatchDmxTab } from './components/tabs/PatchDmxTab';
import { findProfileForFixture } from './utils/fixtureProfileImage';
import { loadFixtureProfilesFromStorage } from './hooks/useFixtureProfiles';
import { applyFixtureDmxAction } from './utils/fixtureDmxChannels';
import {
  createProfileFromFixture,
  openFixtureProfileEditorDraft,
} from './utils/fixtureProfileFromPatch';
import { StageSceneTab } from './components/tabs/StageSceneTab';
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
import { loadAutoLiveState } from './utils/autoLiveConfig';
import { AutoLiveBackgroundBadge } from './components/live/AutoLiveBackgroundBadge';
import type { AutoLiveState } from './types/autoLive';

const APP_VERSION = '1.8.0';

const TABS = [
  { id: 'live' as const, label: 'Live', icon: Zap },
  { id: 'autoLive' as const, label: 'Auto Live', icon: Sparkles },
  { id: 'stage' as const, label: 'Scène', icon: Maximize2 },
  { id: 'editor' as const, label: 'Librairie', icon: Database },
  { id: 'patch' as const, label: 'Patch & DMX', icon: Edit2 },
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
  const [openCalibrationFromScene, setOpenCalibrationFromScene] = useState(false);
  const [autoLiveState, setAutoLiveState] = useState<AutoLiveState>(() => loadAutoLiveState());

  const liveSessionMounted =
    activeTab === 'live' ||
    activeTab === 'autoLive' ||
    autoLiveState.enabled;

  const liveTabHeadless =
    liveSessionMounted && activeTab !== 'live' && activeTab !== 'autoLive';

  const showAutoLiveBackgroundBadge =
    autoLiveState.enabled && liveTabHeadless;

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
    const profiles = loadFixtureProfilesFromStorage();
    for (const fixture of patch.fixtures) {
      applyFixtureDmxAction(fixture, 'strobe', val, (ch, v) => {
        void settings.updateDmx(ch, v);
      }, profiles);
    }
  };

  const handleMultiFixtureAction = async (
    fixtureIds: number[],
    action: FixtureControlAction,
    value: number | RgbColor
  ) => {
    const profiles = loadFixtureProfilesFromStorage();
    for (const fixtureId of fixtureIds) {
      const fixture = patch.fixtures.find((f) => f.id === fixtureId);
      if (!fixture) continue;
      applyFixtureDmxAction(fixture, action, value, (ch, v) => {
        void settings.updateDmx(ch, v);
      }, profiles);
    }
  };

  const handleGroupAction = async (
    groupId: string,
    action: GroupControlAction,
    value: number | RgbColor
  ) => {
    const group = patch.groups.find((g) => g.id === groupId);
    if (!group || action === 'dimmer') return;

    const profiles = loadFixtureProfilesFromStorage();
    for (const fixtureId of group.fixtureIds) {
      const fixture = patch.fixtures.find((f) => f.id === fixtureId);
      if (!fixture) continue;
      if (action === 'strobe' && typeof value === 'number') {
        applyFixtureDmxAction(fixture, 'strobe', value, (ch, v) => {
          void settings.updateDmx(ch, v);
        }, profiles);
      } else if (action === 'color' && typeof value === 'object') {
        applyFixtureDmxAction(fixture, 'color', value, (ch, v) => {
          void settings.updateDmx(ch, v);
        }, profiles);
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
    <div className="min-h-screen bg-[var(--pl-bg)] text-[var(--pl-text)] p-8 font-sans selection:bg-cyan-500/30 flex flex-col">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-[var(--pl-title-from)] to-[var(--pl-title-to)] bg-clip-text text-transparent">
              PETITELUNE<span className="text-cyan-500">DMX</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[var(--pl-muted)] text-sm font-medium uppercase tracking-widest">
                Pro Lighting Control v{APP_VERSION}
              </p>
              <button
                onClick={() => setIsAboutModalOpen(true)}
                className="p-1.5 bg-[var(--pl-hover)] hover:opacity-90 border border-[var(--pl-border)] rounded-lg text-[var(--pl-muted)] hover:text-cyan-400 transition-all active:scale-90"
                title="Informations sur l'application"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex bg-[var(--pl-panel)] backdrop-blur-md p-1.5 rounded-2xl border border-[var(--pl-border)] gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-[var(--pl-muted)] hover:text-[var(--pl-text)] hover:bg-[var(--pl-hover)] border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {showAutoLiveBackgroundBadge && (
            <AutoLiveBackgroundBadge onOpenAutoLive={() => setActiveTab('autoLive')} />
          )}
          <ConnectionStatus
            isConnected={settings.isConnected}
            port={settings.selectedPort}
            connectionError={settings.connectionError}
            actualHz={settings.actualHz}
            targetHz={settings.targetHz}
            latencyMs={settings.latencyMs}
            onReconnect={settings.handleForceReconnect}
          />
        </div>
      </header>

      <main className="flex-1">
        {liveSessionMounted && (
          <LiveTab
            headless={liveTabHeadless}
            variant={
              activeTab === 'autoLive' ? 'auto' : 'manual'
            }
            autoLiveState={autoLiveState}
            setAutoLiveState={setAutoLiveState}
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
            groupMovementCenters={live.groupMovementCenters}
            setGroupMovementCenters={live.setGroupMovementCenters}
            groupMovementCenterLinked={live.groupMovementCenterLinked}
            setGroupMovementCenterLinked={live.setGroupMovementCenterLinked}
            groupAutoColorActive={live.groupAutoColorActive}
            setGroupAutoColorActive={live.setGroupAutoColorActive}
            groupAutoGoboActive={live.groupAutoGoboActive}
            setGroupAutoGoboActive={live.setGroupAutoGoboActive}
            groupGobos={live.groupGobos}
            setGroupGobos={live.setGroupGobos}
            groupPositions={live.groupPositions}
            setGroupPositions={live.setGroupPositions}
            groupCenterPositions={live.groupCenterPositions}
            setGroupCenterPositions={live.setGroupCenterPositions}
            groupPositionMemoryMode={live.groupPositionMemoryMode}
            setGroupPositionMemoryMode={live.setGroupPositionMemoryMode}
            groupQuickMovementSaves={live.groupQuickMovementSaves}
            setGroupQuickMovementSaves={live.setGroupQuickMovementSaves}
            groupCustomTrajectories={live.groupCustomTrajectories}
            setGroupCustomTrajectories={live.setGroupCustomTrajectories}
            groupCustomMovementSlotLinks={live.groupCustomMovementSlotLinks}
            setGroupCustomMovementSlotLinks={live.setGroupCustomMovementSlotLinks}
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
            openCalibrationWhenActive={openCalibrationFromScene}
            onCalibrationActivated={() => setOpenCalibrationFromScene(false)}
            onGoToPatch={() => setActiveTab('patch')}
            onOpenAutoLive={() => setActiveTab('autoLive')}
            autoLiveActiveInBackground={
              autoLiveState.enabled && activeTab === 'live'
            }
            dmxConnected={settings.isConnected}
            dmxPort={settings.selectedPort}
            dmxConnectionError={settings.connectionError}
            onDmxReconnect={settings.handleForceReconnect}
            confirmBlackout={prefs.liveConfirmBlackout}
            liveCompact={prefs.liveCompact}
            liveProfile={prefs.liveProfile}
            autoLiveEasyMode={prefs.autoLiveEasyMode}
            onAutoLiveEasyModeChange={prefs.setAutoLiveEasyMode}
          />
        )}

        {activeTab === 'patch' && (
          <PatchDmxTab
            fixtures={patch.fixtures}
            groups={patch.groups}
            channels={settings.channels}
            selectedFixture={selectedFixture}
            setSelectedFixture={setSelectedFixture}
            getFixtureById={patch.getFixtureById}
            updateDmx={settings.updateDmx}
            onUpdateAddress={patch.handleUpdateAddress}
            onAddFixture={patch.handleAddFixture}
            onDeleteFixture={patch.handleDeleteFixture}
            onIdentify={handleIdentify}
            onCreateGroup={patch.handleCreateGroup}
            onDeleteGroup={patch.handleDeleteGroup}
            onUpdateGroupFixtures={patch.handleUpdateGroupFixtures}
            onRenameGroup={patch.handleRenameGroup}
            onToggleGroupAmbiance={patch.handleToggleGroupAmbiance}
            onToggleGroupMovement={patch.handleToggleGroupMovement}
            onEditLibraryProfile={(fixture) => {
              const library = loadFixtureProfilesFromStorage();
              const existing = findProfileForFixture(fixture, library);
              openFixtureProfileEditorDraft(
                existing ?? createProfileFromFixture(fixture)
              );
              setActiveTab('editor');
            }}
          />
        )}

        {(activeTab === 'stage' || activeTab === 'stage3d') && (
          <StageSceneTab
            fixtures={patch.fixtures}
            channels={settings.channels}
            groups={patch.groups}
            groupColors={live.groupColors}
            initialView={activeTab === 'stage3d' ? '3d' : 'plan'}
            onIdentifyFixture={handleIdentify}
            onOpenCalibration={() => {
              setOpenCalibrationFromScene(true);
              setActiveTab('live');
            }}
          />
        )}

        {activeTab === 'editor' && (
          <FixtureEditorTab patchedFixtures={patch.fixtures} />
        )}

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
            liveConfirmBlackout={prefs.liveConfirmBlackout}
            onLiveConfirmBlackoutChange={prefs.setLiveConfirmBlackout}
            liveCompact={prefs.liveCompact}
            onLiveCompactChange={prefs.setLiveCompact}
            liveProfile={prefs.liveProfile}
            onLiveProfileChange={prefs.setLiveProfile}
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

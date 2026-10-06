import React, { useState } from 'react';
import { LiveToast } from './LiveToast';
import { getQuickMovementSave } from '../../../utils/movementQuickSaves';
import type {
  CustomTrajectory,
  GroupCustomMovementSlotLinks,
  GroupQuickMovementSaves,
} from '../../../types';
import { Move, Activity, HeartPulse, RefreshCw, Settings2, Sparkles, MapPin, HelpCircle, ChevronDown } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { XYPad } from '../../ui/XYPad';
import { Tooltip } from '../../ui/Tooltip';
import { VerticalSlider } from '../../ui/VerticalSlider';
import { LiveEmptyState } from './LiveEmptyState';
import { LiveGroupStatusBadges } from './LiveGroupStatusBadges';
import { LiveMovingHeadKindBadge } from './LiveMovingHeadKindBadge';
import { LIVE_MACRO_HELP } from '../../../utils/liveMacros';
import { lyreStatusBadges } from '../../../utils/liveGroupStatusBadges';
import {
  movementShapeLabel,
  getStopGroupMovement,
  type QuickMovementPresetId,
} from '../../../utils/movementQuickPresets';
import {
  getMovementPresetLink,
  resolvePersoSlotApply,
} from '../../../utils/movementCustomSlots';
import { getGroupCenterPosition } from '../../../utils/groupMovementCenter';
import {
  applySavedMovementCenters,
  isGroupMovementCenterLinked,
  movementCenterListForHeads,
} from '../../../utils/groupMovementCenters';
import {
  fixtureIsLyreControllable,
  fixtureIsMovementCapable,
} from '../../../utils/autoLiveGroups';
import {
  getMovingHeadIds,
  positionMemoryDisplayDots,
  positionMemoryPerFixtureVisual,
  readLogicalPanTiltFromChannels,
  recallGroupPosition,
} from '../../../utils/groupPositionFixtures';
import { FixedPositionMemoryButton } from './FixedPositionMemoryButton';
import { MovementPresetsAndSliders } from './MovementPresetsAndSliders';
import { LyreCentreApercuBlock } from './LyreCentreApercuBlock';
import {
  buildSyntheticLyreGroups,
  getLiveLyreDisplayGroups,
} from '../../../utils/liveGroups';
import type {
  Fixture,
  FixtureControlAction,
  Group,
  GroupMovement,
  CalibrationSettings,
  GroupPosition,
  LivePanTilt,
  RgbColor,
  GroupIntensity,
} from '../../../types';

interface MovementSectionProps {
  groups: Group[];
  fixtures: Fixture[];
  handlePanChange: (val: string) => void;
  handleTiltChange: (val: string) => void;
  handleMultiFixtureAction: (
    ids: number[],
    action: FixtureControlAction,
    val: number | RgbColor
  ) => void;
  groupColors: Record<string, RgbColor>;
  groupIntensities: Record<string, GroupIntensity>;
  currentMasterIntensity: number;
  groupPulseActive: Record<string, boolean>;
  groupAutoColorActive: Record<string, boolean>;
  groupAutoGoboActive: Record<string, boolean>;
  groupGobos: Record<string, number>;
  groupPan: Record<string, number>;
  groupTilt: Record<string, number>;
  liveGroupPositions: Record<string, LivePanTilt>;
  liveGroupColors: Record<string, number>;
  liveGroupGobos: Record<string, number>;
  sendIntensity: (ids: number[], type: 'dim' | 'str', val: number, groupId?: string) => void;
  sendColor: (
    ids: number[],
    r: number,
    g: number,
    b: number,
    groupId?: string,
    isAuto?: boolean,
    wheelValue?: number
  ) => void;
  sendMovement: (
    ids: number[],
    pan: number,
    tilt: number,
    groupId: string,
    options?: { onlyFixtureId?: number }
  ) => void;
  handleMacro: (ids: number[], macro: string, groupId?: string) => void;
  onStrobeEdit: (groupId: string | null) => void;
  groupStrobeValues: Record<string, number>;
  channels: number[];
  updateDmx: (channel: number, value: number) => void;
  onOpenCalibration: () => void;
  onOpenCalibrationForGroup?: (groupId: string, groupName: string, fixtureIds: number[]) => void;
  groupMovements: Record<string, GroupMovement>;
  onOpenEffects: (groupId: string, groupName: string, fixtureIds: number[]) => void;
  groupPositions: Record<string, GroupPosition[]>;
  groupCenterPositions: Record<string, GroupPosition>;
  groupMovementCenters: Record<string, Record<string, { x: number; y: number }>>;
  groupMovementCenterLinked: Record<string, boolean>;
  setGroupMovementCenterLinked: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  fixtureCalibration: Record<number, CalibrationSettings>;
  groupQuickMovementSaves: GroupQuickMovementSaves;
  groupCustomMovementSlotLinks: GroupCustomMovementSlotLinks;
  groupCustomTrajectories: Record<string, CustomTrajectory[]>;
  setGroupMovements: React.Dispatch<React.SetStateAction<Record<string, GroupMovement>>>;
  onGoToPatch?: () => void;
  beginnerMode?: boolean;
}

export const MovementSection = ({
  groups,
  fixtures,
  handlePanChange,
  handleTiltChange,
  handleMultiFixtureAction,
  groupColors,
  groupIntensities,
  currentMasterIntensity,
  groupPulseActive,
  groupAutoColorActive,
  groupAutoGoboActive,
  groupGobos,
  groupPan,
  groupTilt,
  liveGroupPositions,
  liveGroupColors,
  liveGroupGobos,
  sendIntensity,
  sendColor,
  sendMovement,
  handleMacro,
  onStrobeEdit,
  groupStrobeValues,
  channels,
  updateDmx,
  onOpenCalibration,
  onOpenCalibrationForGroup,
  onOpenEffects,
  groupPositions,
  groupCenterPositions,
  groupMovementCenters,
  groupMovementCenterLinked,
  setGroupMovementCenterLinked,
  fixtureCalibration,
  groupMovements,
  groupQuickMovementSaves,
  groupCustomMovementSlotLinks,
  groupCustomTrajectories,
  setGroupMovements,
  onGoToPatch,
  beginnerMode = false,
}: MovementSectionProps) => {
  const movingHeadGroupsPreview = getLiveLyreDisplayGroups(groups, fixtures);
  const [lyresExpanded, setLyresExpanded] = useState(
    () => !beginnerMode || movingHeadGroupsPreview.length > 0
  );
  const [movementToast, setMovementToast] = useState<string | null>(null);
  const isMovementTarget = (id: number) => {
    const f = fixtures.find((fx) => fx.id === id);
    return f != null && fixtureIsMovementCapable(f);
  };
  const isLyreControllable = (id: number) => {
    const f = fixtures.find((fx) => fx.id === id);
    return f != null && fixtureIsLyreControllable(f);
  };

  const applyQuickMovement = (
    groupId: string,
    fixtureIds: number[],
    id: QuickMovementPresetId
  ) => {
    const saved = getQuickMovementSave(groupQuickMovementSaves, groupId, id);
    const trajs = groupCustomTrajectories[groupId] ?? [];
    let resolved;
    const link = getMovementPresetLink(
      groupCustomMovementSlotLinks,
      groupId,
      id,
      groupQuickMovementSaves
    );
    if (!link) {
      setMovementToast('Inactif — programmer dans Mouvement & formes');
      return;
    }
    resolved = resolvePersoSlotApply(id, link, saved, trajs);
    if (!resolved) {
      setMovementToast('Bouton vide — enregistrer dans Mouvement & formes');
      return;
    }
    const { movement } = resolved;
    setGroupMovements((prev) => ({
      ...prev,
      [groupId]: movement,
    }));
    const headIds = getMovingHeadIds(fixtureIds, isMovementTarget);
    applySavedMovementCenters(
      saved,
      groupId,
      fixtureIds,
      headIds,
      sendMovement,
      setGroupMovementCenterLinked
    );
  };

  const getLiveIntensity = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.fixtureIds || group.fixtureIds.length === 0) return 0;
    
    // On prend le premier projecteur du groupe comme référence
    const firstFixtureId = group.fixtureIds[0];
    const fixture = fixtures.find(f => f.id === firstFixtureId);
    
    if (!fixture) return 0;
    
    const address = fixture.address - 1;
    let dmxValue = 0;
    
    if (fixture.type === 'RGB') {
      dmxValue = channels[address] || 0;
    } else if (fixture.type === 'Moving Head') {
      // Pour PicoSpot 20, le dimmer est au canal 6 (address + 5)
      dmxValue = channels[address + 5] || 0;
    } else if (fixture.type === 'Effect') {
      dmxValue = channels[address] || 0;
    }
    
    return (dmxValue / 255) * 100;
  };

  const getLiveColor = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.fixtureIds || group.fixtureIds.length === 0) return groupColors[groupId] || { r: 255, g: 255, b: 255 };
    
    const firstFixtureId = group.fixtureIds[0];
    const fixture = fixtures.find(f => f.id === firstFixtureId);
    
    if (!fixture) return groupColors[groupId] || { r: 255, g: 255, b: 255 };
    
    const address = fixture.address - 1;
    
    if (fixture.type === 'Moving Head') {
      const v = channels[address + 5] || 0;
      // Correspondance simplifiée de la roue de couleur PicoSpot
      if (v < 10) return { r: 255, g: 255, b: 255 }; // Blanc
      if (v < 21) return { r: 255, g: 0,   b: 0   }; // Rouge
      if (v < 32) return { r: 255, g: 128, b: 0   }; // Orange
      if (v < 43) return { r: 255, g: 255, b: 0   }; // Jaune
      if (v < 54) return { r: 0,   g: 255, b: 0   }; // Vert
      if (v < 65) return { r: 0,   g: 0,   b: 255 }; // Bleu
      if (v < 76) return { r: 0,   g: 255, b: 255 }; // Cyan
      if (v < 87) return { r: 255, g: 0,   b: 255 }; // Magenta
    }
    
    return groupColors[groupId] || { r: 255, g: 255, b: 255 };
  };

  const movingHeadGroups = movingHeadGroupsPreview;
  const orphanLyreGroups = buildSyntheticLyreGroups(groups, fixtures);

  const emptyLyres = (
    <LiveEmptyState
      title="Aucune lyre"
      description="Cochez « Mouvement » sur un groupe au Patch (lyres, scans, lasers). Les effets s’ouvrent via « Mouvement & formes » sur chaque carte."
      actionLabel="Aller au Patch"
      onAction={onGoToPatch}
    />
  );

  const lyresHeader = beginnerMode ? (
    <button
      type="button"
      onClick={() => setLyresExpanded((v) => !v)}
      className="flex w-full items-center justify-between gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-left hover:bg-blue-500/15 transition-colors"
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-2">
        <Move className="h-3.5 w-3.5" />
        Lyres &amp; mouvements (optionnel)
      </span>
      <ChevronDown
        className={`h-4 w-4 text-blue-400/80 transition-transform ${lyresExpanded ? 'rotate-180' : ''}`}
      />
    </button>
  ) : null;

  if (movingHeadGroups.length === 0) {
    if (beginnerMode) {
      return (
        <section className="space-y-3 h-full flex flex-col">
          {lyresHeader}
          {lyresExpanded && emptyLyres}
        </section>
      );
    }
    return (
      <section className="space-y-4 h-full flex flex-col">
        <h2 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
          <Move className="w-3.5 h-3.5" /> Lyres
        </h2>
        {emptyLyres}
      </section>
    );
  }

  const lyresBody = (
    <section className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
            <Move className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">
              Mouvements &amp; formes
            </h2>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Contrôle des lyres & Calibration</p>
          </div>
        </div>

        <button 
          onClick={onOpenCalibration}
          className="flex items-center gap-3 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all hover:text-cyan-400 hover:border-cyan-500/30 active:scale-95 group"
        >
          <Settings2 className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-500" />
          Paramétrage des lyres
        </button>
      </div>
      {orphanLyreGroups.length > 0 && (
        <p className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 leading-relaxed mx-2">
          <span className="font-black uppercase tracking-wide">Scans / lyres hors groupe</span>
          {' — '}
          Les cartes ci-dessous (ex. Dynamo) ne sont pas dans un groupe Patch. Pour les sauvegarder
          dans le projet : Patch &amp; DMX → Groupes → créez « Scans Dynamo » et assignez les
          appareils.
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {movingHeadGroups.map(group => {
          const liveHeight = getLiveIntensity(group.id);
          const liveColor = getLiveColor(group.id);
          const firstFixtureId = group.fixtureIds[0];
          const fixture = fixtures.find(f => f.id === firstFixtureId);
          const statusBadges = lyreStatusBadges({
            pulse: !!groupPulseActive[group.id],
            autoColor: !!groupAutoColorActive[group.id],
            autoGobo: !!groupAutoGoboActive[group.id],
            movement: groupMovements[group.id],
            motionLive: !!liveGroupPositions[group.id],
          });

          return (
            <div key={group.id} className="bg-[#111317] border-2 border-blue-500/20 rounded-[2rem] p-5 space-y-5 shadow-[0_0_40px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden group/card">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none group-hover/card:bg-blue-500/20 transition-colors duration-500" />
              
              <div className="flex justify-between items-start gap-3 border-b border-white/10 pb-3 relative z-10">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">{group.name}</h3>
                    <LiveMovingHeadKindBadge group={group} fixtures={fixtures} />
                    {onOpenCalibrationForGroup && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenCalibrationForGroup(group.id, group.name, group.fixtureIds)
                        }
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/60 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                        title="Calibration des lyres de ce groupe"
                      >
                        <Settings2 className="w-3 h-3" />
                        Calibrer
                      </button>
                    )}
                  </div>
                  <LiveGroupStatusBadges badges={statusBadges} />
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div 
                       className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-lg transition-all duration-300"
                       style={{ 
                         backgroundColor: `rgb(${liveColor.r}, ${liveColor.g}, ${liveColor.b})`,
                         boxShadow: `0 0 10px rgb(${liveColor.r}, ${liveColor.g}, ${liveColor.b})`
                       }}
                    />
                    <div className="w-20 h-1 bg-slate-900 rounded-full overflow-hidden relative shadow-inner">
                       <div 
                         className="absolute left-0 h-full bg-blue-400 shadow-[0_0_10px_#60a5fa] transition-all duration-75"
                         style={{ width: `${liveHeight}%` }}
                       />
                    </div>
                    {/* Lecture PAN/TILT à droite du VU-mètre */}
                    <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded border border-white/5 shadow-inner ml-1">
                      <span className="text-[10px] font-mono font-black text-cyan-400">P:{Math.round(liveGroupPositions[group.id]?.pan ?? groupPan[group.id] ?? 127)}</span>
                      <span className="text-[10px] font-mono font-black text-indigo-400">T:{Math.round(liveGroupPositions[group.id]?.tilt ?? groupTilt[group.id] ?? 127)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 relative z-10">
                {/* Bloc Contrôles (Lumière, Couleurs, Gobos, Modes) */}
                <div className="flex flex-wrap gap-4 min-w-fit">
                  <div className="space-y-3 shrink-0">
                    <div className="flex items-center justify-between border-l-2 border-blue-500 pl-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lumière</p>
                      <Tooltip text="Dimmer: Intensité lumineuse. Strobe: Fréquence de clignotement (Clic droit pour éditer la valeur max).">
                        <HelpCircle className="w-3 h-3 text-slate-600 hover:text-blue-400 cursor-help transition-colors ml-2" />
                      </Tooltip>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <div className="flex flex-col items-center gap-2">
                        <VerticalSlider 
                          value={groupIntensities[group.id]?.dim || 0} 
                          onChange={(v) => sendIntensity(group.fixtureIds, 'dim', v, group.id)} 
                          label="Dim" 
                          height="h-28" 
                          color="bg-blue-500" 
                        />
                        <div className="flex flex-col gap-1 w-full pt-1">
                          <button onClick={() => sendIntensity(group.fixtureIds, 'dim', 255, group.id)} className="w-10 py-1.5 bg-blue-500 hover:bg-blue-400 text-[#05070a] rounded-lg text-[9px] font-black uppercase transition-all active:scale-90 shadow-lg">100</button>
                          <button onClick={() => sendIntensity(group.fixtureIds, 'dim', 0, group.id)} className="w-10 py-1.5 bg-slate-800 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase border border-white/5 transition-all active:scale-90">0</button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <VerticalSlider 
                          value={groupIntensities[group.id]?.str || 0} 
                          onChange={(v) => sendIntensity(group.fixtureIds, 'str', v, group.id)} 
                          label="Str" 
                          height="h-28" 
                          color="bg-emerald-500" 
                        />
                        <div className="flex flex-col gap-1 w-full pt-1">
                          <button 
                            onClick={() => sendIntensity(group.fixtureIds, 'str', groupStrobeValues[group.id] || 255, group.id)} 
                            onContextMenu={(e) => {
                              e.preventDefault();
                              onStrobeEdit(group.id);
                            }}
                            className="w-10 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#05070a] rounded-lg text-[9px] font-black uppercase transition-all active:scale-90 shadow-lg"
                          >
                            {Math.round(((groupStrobeValues[group.id] || 255) / 255) * 100)}
                          </button>
                          <button onClick={() => sendIntensity(group.fixtureIds, 'str', 0, group.id)} className="w-10 py-1.5 bg-slate-800 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase border border-white/5 transition-all active:scale-90">0</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 shrink-0">
                    <div className="flex items-center justify-between border-l-2 border-purple-500 pl-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Couleurs</p>
                      <Tooltip text="Sélection directe des couleurs via la roue chromatique de la lyre PicoSpot.">
                        <HelpCircle className="w-3 h-3 text-slate-600 hover:text-purple-400 cursor-help transition-colors ml-2" />
                      </Tooltip>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { l: 'W',  r: 255, g: 255, b: 255, hex: '#ffffff', v: 5 },
                        { l: 'R',  r: 255, g: 0,   b: 0,   hex: '#ff0000', v: 16 },
                        { l: 'Or', r: 255, g: 128, b: 0,   hex: '#ff8000', v: 27 },
                        { l: 'Ja', r: 255, g: 255, b: 0,   hex: '#ffff00', v: 38 },
                        { l: 'V',  r: 0,   g: 255, b: 0,   hex: '#00ff00', v: 49 },
                        { l: 'B',  r: 0,   g: 0,   b: 255, hex: '#0000ff', v: 60 },
                        { l: 'Cy', r: 0,   g: 255, b: 255, hex: '#00ffff', v: 71 },
                        { l: 'Li', r: 255, g: 0,   b: 255, hex: '#ff00ff', v: 82 }
                      ].map(c => (
                        <button 
                          key={c.l} 
                          onClick={() => sendColor(group.fixtureIds, c.r, c.g, c.b, group.id, false, c.v)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-10 h-10 rounded-lg border transition-all shadow-xl active:scale-90 flex items-center justify-center ${
                            groupAutoColorActive[group.id]
                            ? (liveGroupColors[group.id] === c.v ? 'border-white border-[3px] scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-white/20 hover:scale-105')
                            : (groupColors[group.id]?.v === c.v ? 'border-white border-[3px] scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-white/20 hover:scale-105')
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 shrink-0">
                    <div className="flex items-center justify-between border-l-2 border-amber-500 pl-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gobos</p>
                      <Tooltip text="Sélecteur de motifs (Gobos) pour la lyre. '∅' correspond à aucun motif (faisceau plein).">
                        <HelpCircle className="w-3 h-3 text-slate-600 hover:text-amber-500 cursor-help transition-colors ml-2" />
                      </Tooltip>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map(g => (
                        <button 
                          key={g} 
                          onClick={() => handleMacro(group.fixtureIds, `G${g}`, group.id)}
                          className={`w-10 h-10 border rounded-lg text-[9px] font-black transition-all ${
                            groupAutoGoboActive[group.id]
                            ? (liveGroupGobos[group.id] === g ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105' : 'bg-slate-800/80 border-white/5 text-slate-500 hover:text-white')
                            : (groupGobos[group.id] === g ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105' : 'bg-slate-800/80 border-white/5 text-slate-500 hover:text-white')
                          }`}
                        >
                          {g || '∅'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 shrink-0">
                    <div className="flex items-center justify-between border-l-2 border-indigo-500 pl-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Modes</p>
                      <Tooltip
                        text={`${LIVE_MACRO_HELP.U1.tooltip} · ${LIVE_MACRO_HELP.U3.tooltip} · ${LIVE_MACRO_HELP.U6.tooltip}`}
                      >
                        <HelpCircle className="w-3 h-3 text-slate-600 hover:text-indigo-400 cursor-help transition-colors ml-2" />
                      </Tooltip>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <Tooltip text={LIVE_MACRO_HELP.U1.tooltip}>
                        <button
                          type="button"
                          onClick={() => handleMacro(group.fixtureIds, 'U1', group.id)}
                          className={`w-24 h-10 border rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${groupAutoColorActive[group.id] ? 'bg-cyan-500 text-[#05070a] border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-400'}`}
                        >
                          <Activity className={`w-3 h-3 ${groupAutoColorActive[group.id] ? 'animate-pulse' : ''}`} />
                          {LIVE_MACRO_HELP.U1.shortLabel}
                        </button>
                      </Tooltip>
                      <Tooltip text={LIVE_MACRO_HELP.U3.tooltip}>
                        <button
                          type="button"
                          onClick={() => handleMacro(group.fixtureIds, 'U3', group.id)}
                          className={`w-24 h-10 border rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${groupPulseActive[group.id] ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'}`}
                        >
                          <HeartPulse className={`w-3 h-3 ${groupPulseActive[group.id] ? 'animate-bounce' : ''}`} />
                          {LIVE_MACRO_HELP.U3.shortLabel}
                        </button>
                      </Tooltip>
                      <Tooltip text={LIVE_MACRO_HELP.U6.tooltip}>
                        <button
                          type="button"
                          onClick={() => handleMacro(group.fixtureIds, 'U6', group.id)}
                          className={`w-24 h-10 border rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${groupAutoGoboActive[group.id] ? 'bg-indigo-500 text-[#05070a] border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400'}`}
                        >
                          <RefreshCw className={`w-3 h-3 ${groupAutoGoboActive[group.id] ? 'animate-spin' : ''}`} />
                          {LIVE_MACRO_HELP.U6.shortLabel}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Bloc Mouvement (PAD + presets / réglages) */}
                <div className="flex flex-col gap-2 min-w-[320px] max-w-[480px] border-l border-white/5 pl-4">
                  <div className="flex items-center justify-between pr-1">
                    <div className="flex items-center border-l-2 border-cyan-500 pl-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mouvement</p>
                      <Tooltip text="Utilisez le PAD pour définir la position centrale. Le point bleu indique le mouvement en temps réel.">
                        <HelpCircle className="w-3 h-3 text-slate-600 hover:text-cyan-400 cursor-help transition-colors ml-2" />
                      </Tooltip>
                    </div>
                    <button 
                      onClick={() => onOpenEffects(group.id, group.name, group.fixtureIds)}
                      className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-[9px] font-black text-purple-400 uppercase transition-all flex items-center justify-center gap-1.5 active:scale-90 duration-75 group/eff"
                    >
                      <Sparkles className="w-2.5 h-2.5 group-hover/eff:animate-pulse" /> Mouvement &amp; formes
                    </button>
                  </div>
                  
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0">
                      {(() => {
                        const headIds = getMovingHeadIds(
                          group.fixtureIds,
                          isLyreControllable
                        );
                        const centerLinked = isGroupMovementCenterLinked(
                          group.id,
                          groupMovementCenterLinked
                        );
                        const motionCenters = movementCenterListForHeads(
                          group.id,
                          headIds,
                          groupPan,
                          groupTilt,
                          groupMovementCenters,
                          centerLinked
                        );
                        return (
                      <LyreCentreApercuBlock
                        fixtureIds={group.fixtureIds}
                        fixtures={fixtures}
                        channels={channels}
                        fixtureCalibration={fixtureCalibration}
                        config={groupMovements[group.id]}
                        groupPan={groupPan[group.id] ?? 127}
                        groupTilt={groupTilt[group.id] ?? 127}
                        motionCenters={motionCenters}
                        centerLinked={centerLinked}
                        onMoveLinked={(nx, ny) => {
                          sendMovement(group.fixtureIds, nx, ny, group.id);
                        }}
                        onMoveFixture={(fixtureId, nx, ny) => {
                          sendMovement(group.fixtureIds, nx, ny, group.id, {
                            onlyFixtureId: fixtureId,
                          });
                        }}
                      />
                        );
                      })()}
                      <p className="text-[8px] font-black uppercase text-slate-600 mt-1 text-center">
                        {movementShapeLabel(groupMovements[group.id]?.shape ?? 'none')}
                        {group.fixtureIds.length > 1 &&
                        (groupMovements[group.id]?.fan ?? 0) > 0
                          ? ' · fan'
                          : ''}
                      </p>
                    </div>

                    <MovementPresetsAndSliders
                      config={
                        groupMovements[group.id] ?? {
                          shape: 'none',
                          speed: 128,
                          sizePan: 64,
                          sizeTilt: 64,
                          fan: 0,
                          invert180: false,
                        }
                      }
                      presetMaxWidth={168}
                      movingHeadCount={
                        getMovingHeadIds(group.fixtureIds, isMovementTarget).length
                      }
                      groupId={group.id}
                      quickSaves={groupQuickMovementSaves}
                      customTrajectories={groupCustomTrajectories[group.id] ?? []}
                      customSlotLinks={groupCustomMovementSlotLinks}
                      onApplyPreset={(id) =>
                        applyQuickMovement(group.id, group.fixtureIds, id)
                      }
                      recallOnly
                    />
                  </div>

                </div>

                <div className="flex-1 min-w-[200px] border-l border-white/5 pl-4">
                  {(() => {
                    const headIds = getMovingHeadIds(
                      group.fixtureIds,
                      isLyreControllable
                    );
                    return (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-cyan-500" /> Positions fixes
                          </p>
                          <Tooltip text="Tuiles = aperçu pan/tilt. Mémorisation (clic droit) dans Mouvement &amp; formes. Centre = arrêt d’effet. Pad Lié = déplacement.">
                            <HelpCircle className="w-3 h-3 text-slate-600 hover:text-cyan-400 cursor-help transition-colors" />
                          </Tooltip>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const centerPos = getGroupCenterPosition(
                              group.id,
                              groupCenterPositions
                            );
                            const centerDots = positionMemoryDisplayDots(
                              centerPos,
                              headIds
                            ).map((d) => ({ pan: d.x, tilt: d.y }));
                            const presets = groupPositions[group.id] || [];
                            return (
                              <>
                                <FixedPositionMemoryButton
                                  dots={centerDots}
                                  perFixtureVisual={positionMemoryPerFixtureVisual(
                                    centerPos,
                                    headIds
                                  )}
                                  label={centerPos.label}
                                  variant="center"
                                  onClick={() => {
                                    recallGroupPosition(
                                      centerPos,
                                      headIds,
                                      group.fixtureIds,
                                      group.id,
                                      sendMovement
                                    );
                                    setGroupMovements((prev) => ({
                                      ...prev,
                                      [group.id]: getStopGroupMovement(),
                                    }));
                                  }}
                                />
                                {presets.length > 0 ? (
                                  presets.map((pos, idx) => (
                                    <FixedPositionMemoryButton
                                      key={idx}
                                      dots={positionMemoryDisplayDots(
                                        pos,
                                        headIds
                                      ).map((d) => ({ pan: d.x, tilt: d.y }))}
                                      perFixtureVisual={positionMemoryPerFixtureVisual(
                                        pos,
                                        headIds
                                      )}
                                      label={pos.label || `${idx + 1}`}
                                      onClick={() => {
                                        recallGroupPosition(
                                          pos,
                                          headIds,
                                          group.fixtureIds,
                                          group.id,
                                          sendMovement
                                        );
                                        setGroupMovements(
                                          (prev: Record<string, GroupMovement>) => ({
                                            ...prev,
                                            [group.id]: {
                                              ...(prev[group.id] ??
                                                getStopGroupMovement()),
                                              shape: 'none',
                                            },
                                          })
                                        );
                                      }}
                                    />
                                  ))
                                ) : (
                                  <span className="text-[8px] text-slate-600 italic self-center">
                                    Autres positions : Mouvement &amp; formes
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  if (beginnerMode) {
    return (
      <>
        <div className="space-y-3 h-full flex flex-col">
          {lyresHeader}
          {lyresExpanded && lyresBody}
        </div>
        <LiveToast message={movementToast} onDone={() => setMovementToast(null)} />
      </>
    );
  }

  return (
    <>
      {lyresBody}
      <LiveToast message={movementToast} onDone={() => setMovementToast(null)} />
    </>
  );
};

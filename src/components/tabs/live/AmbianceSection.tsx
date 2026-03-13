import React, { useState } from 'react';
import { Sun, Save } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import { MasterAmbianceCard } from './MasterAmbianceCard';
import { AmbianceCard } from './AmbianceCard';
import { ValuePromptModal } from '../../ui/ValuePromptModal';

interface AmbianceSectionProps {
  ambianceGroups: any[];
  linkedGroups: string[];
  toggleGroupLink: (id: string) => void;
  groupIntensities: Record<string, {dim: number, str: number}>;
  groupColors: Record<string, {r: number, g: number, b: number}>;
  isAmbianceAutoColorActive: boolean;
  isAmbiancePulseActive: boolean;
  activeMacro: string | null;
  getLinkedFixtureIds: () => number[];
  sendIntensity: (ids: number[], type: 'dim' | 'str', val: number, groupId?: string) => void;
  sendColor: (ids: number[], r: number, g: number, b: number, groupId?: string, isAuto?: boolean) => void;
  handleMacro: (ids: number[], macro: string, groupId?: string) => void;
  onStrobeEdit: (groupId: string | null) => void;
  groupStrobeValues: Record<string, number>;
  onUserColorEdit: (id: string, groupId: string | null) => void;
  getGroupUserColors: (groupId: string | 'master') => any;
  currentMasterIntensity: number;
  groupAutoColorActive: Record<string, boolean>;
  groupPulseActive: Record<string, boolean>;
  customPresets: any;
  applyAmbiancePreset: (id: string) => void;
  setPresetToSaveId: (id: string | null) => void;
  setIsSavePresetModalOpen: (val: boolean) => void;
  fadeTime: number;
  setFadeTime: (val: number) => void;
  channels: number[];
  fixtures: any[];
}

export const AmbianceSection = ({
  ambianceGroups,
  linkedGroups,
  toggleGroupLink,
  groupIntensities,
  groupColors,
  isAmbianceAutoColorActive,
  isAmbiancePulseActive,
  activeMacro,
  getLinkedFixtureIds,
  sendIntensity,
  sendColor,
  handleMacro,
  onStrobeEdit,
  groupStrobeValues,
  onUserColorEdit,
  getGroupUserColors,
  currentMasterIntensity,
  groupAutoColorActive,
  groupPulseActive,
  customPresets,
  applyAmbiancePreset,
  setPresetToSaveId,
  setIsSavePresetModalOpen,
  fadeTime,
  setFadeTime,
  channels,
  fixtures
}: AmbianceSectionProps) => {
  const [isFadeModalOpen, setIsFadeModalOpen] = useState(false);

  return (
    <>
      <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <Sun className="w-3.5 h-3.5" /> AMBIANCES
          </h2>
          <div className="flex gap-4">
            {ambianceGroups.map(group => (
              <label key={group.id} className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-3.5 h-3.5 accent-cyan-500 rounded border-white/10 bg-slate-800" 
                  checked={linkedGroups.includes(group.id)}
                  onChange={() => toggleGroupLink(group.id)}
                />
                <span className={`text-[11px] font-black uppercase transition-colors ${linkedGroups.includes(group.id) ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {group.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 flex flex-wrap gap-4">
          {/* CARTE MASTER */}
          {linkedGroups.length >= 1 && (
            <MasterAmbianceCard 
                linkedCount={linkedGroups.length}
                intensity={groupIntensities[linkedGroups[0]] || { dim: 255, str: 0 }}
                color={groupColors[linkedGroups[0]] || { r: 255, g: 255, b: 255 }}
                isAutoActive={isAmbianceAutoColorActive}
                isPulseActive={isAmbiancePulseActive}
                activeMacro={activeMacro}
                onIntensityChange={(type, val) => sendIntensity(getLinkedFixtureIds(), type, val)}
                onColorChange={(r, g, b) => sendColor(getLinkedFixtureIds(), r, g, b, undefined, isAmbianceAutoColorActive)}
                onMacro={(macro) => handleMacro(getLinkedFixtureIds(), macro)}
                onStrobeContextMenu={() => onStrobeEdit(null)}
                onUserColorEdit={(id) => onUserColorEdit(id, 'master')}
                userColors={getGroupUserColors('master')}
                strobeShortcutVal={groupStrobeValues['master'] || 128}
                currentMasterIntensity={currentMasterIntensity}
                channels={channels}
                fixtures={fixtures}
                linkedGroups={linkedGroups}
              />
            )}
            
            {/* CARTES INDIVIDUELLES */}
            {ambianceGroups.map(group => (
              <AmbianceCard 
                key={group.id}
                group={group}
                intensity={groupIntensities[group.id] || { dim: 255, str: 0 }}
              color={groupColors[group.id] || { r: 255, g: 255, b: 255 }}
              isAutoActive={groupAutoColorActive[group.id]}
              isPulseActive={groupPulseActive[group.id]}
              onIntensityChange={(type, val) => sendIntensity(group.fixtureIds, type, val, group.id)}
              onColorChange={(r, g, b) => sendColor(group.fixtureIds, r, g, b, group.id)}
              onMacro={(macro) => handleMacro(group.fixtureIds, macro, group.id)}
              onStrobeContextMenu={() => onStrobeEdit(group.id)}
              onUserColorEdit={(id) => onUserColorEdit(id, group.id)}
              userColors={getGroupUserColors(group.id)}
              strobeShortcutVal={groupStrobeValues[group.id] || 128}
              currentMasterIntensity={currentMasterIntensity}
              isLinked={linkedGroups.includes(group.id)}
              channels={channels}
              fixtures={fixtures}
            />
          ))}
        </div>

        {/* CARTE DE PRESETS */}
        <div className="w-fit bg-[#111317] border-2 border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.15)] relative overflow-hidden flex flex-col h-fit ring-1 ring-cyan-500/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex flex-col gap-3 border-b border-white/5 pb-3 mb-4 relative z-10">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <Save className="w-3.5 h-3.5" /> PRESETS
              </h3>
              <span className="text-[11px] font-black font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{fadeTime}s</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-white/5" onContextMenu={(e) => {
              e.preventDefault();
              setIsFadeModalOpen(true);
            }}>
              <span className="text-[9px] font-black text-slate-500 uppercase shrink-0">Fade</span>
              <input 
                type="range" min="0" max="10" step="0.5" 
                value={fadeTime} 
                onChange={(e) => setFadeTime(parseFloat(e.target.value))} 
                className="w-32 h-1 bg-slate-800 accent-cyan-500 rounded-full cursor-pointer" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 content-start">
            {[1,2,3,4,5,6,7,8].map(n => {
              const id = n.toString();
              const preset = customPresets[id];
              const hasData = preset && Object.keys(preset.groupStates).length > 0;
              
              return (
                <Tooltip 
                  key={n} 
                  text={hasData ? `Appliquer l'ambiance complète : ${preset.name} (Clic droit pour réenregistrer)` : `Emplacement ${n} vide (Clic droit pour capturer l'état actuel)`}
                >
                  <button 
                    key={n} 
                    onClick={() => hasData && applyAmbiancePreset(id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setPresetToSaveId(id);
                      setIsSavePresetModalOpen(true);
                    }}
                    className={`w-12 h-12 rounded-xl border-2 text-xs font-black transition-all active:scale-90 flex flex-col items-center justify-center overflow-hidden ${hasData ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-slate-800/40 border-white/5 text-slate-600 hover:border-white/20'}`}
                  >
                    <span className="text-sm">{n}</span>
                    {hasData && <span className="text-[8px] font-bold text-cyan-600 truncate px-0.5 w-full text-center uppercase leading-tight">{preset.name}</span>}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </section>

    <ValuePromptModal
      isOpen={isFadeModalOpen}
      onClose={() => setIsFadeModalOpen(false)}
      onSubmit={(input) => {
        const val = parseFloat(input);
        if (!isNaN(val)) setFadeTime(Math.min(10, Math.max(0, val)));
      }}
      title="Temps de fondu"
      defaultValue={fadeTime.toString()}
      label="Entrez le temps de fondu (0-10s) :"
    />
  </>
);
};

import React, { useState } from 'react';
import { Zap, Square, Music, Activity, Volume2 } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import { invoke } from '@tauri-apps/api/tauri';
import { AudioStats } from '../../../hooks/useAudioAnalyzer';
import { ValuePromptModal } from '../../ui/ValuePromptModal';

interface MasterGlobalSectionProps {
  masterVal: number;
  globalStrobe: number;
  handleGlobalAction: (action: 'dimmer' | 'color' | 'strobe', value: any) => void;
  handleEndOfSong: () => void;
  bpm: number;
  setBpm: (val: number) => void;
  isAudioActive: boolean;
  setIsAudioActive: (val: boolean) => void;
  handleTap: () => void;
  isBeatActive: boolean;
  audioDevices: MediaDeviceInfo[];
  selectedAudioDeviceId: string | null;
  setSelectedAudioDeviceId: (id: string | null) => void;
  audioStats: AudioStats;
}

export const MasterGlobalSection = ({
  masterVal,
  globalStrobe,
  handleGlobalAction,
  handleEndOfSong,
  bpm,
  setBpm,
  isAudioActive,
  setIsAudioActive,
  handleTap,
  isBeatActive,
  audioDevices,
  selectedAudioDeviceId,
  setSelectedAudioDeviceId,
  audioStats
}: MasterGlobalSectionProps) => {
  const [promptData, setPromptData] = useState<{
    isOpen: boolean;
    label: string;
    currentVal: number;
    min: number;
    max: number;
    callback: (val: number) => void;
  }>({
    isOpen: false,
    label: '',
    currentVal: 0,
    min: 0,
    max: 255,
    callback: () => {}
  });

  const handleValuePrompt = (label: string, currentVal: number, min: number, max: number, callback: (val: number) => void) => {
    setPromptData({
      isOpen: true,
      label,
      currentVal,
      min,
      max,
      callback
    });
  };

  const handleModalSubmit = (input: string) => {
    if (input !== "") {
      let newVal: number;
      if (input.includes('%')) {
        const percent = parseFloat(input.replace('%', ''));
        if (!isNaN(percent)) {
          newVal = Math.round((percent / 100) * (promptData.max - promptData.min) + promptData.min);
        } else return;
      } else {
        newVal = parseInt(input);
      }
      if (!isNaN(newVal)) {
        promptData.callback(Math.min(promptData.max, Math.max(promptData.min, newVal)));
      }
    }
  };

  return (
    <>
      <section className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-[#111317]/50 border border-yellow-500/30 rounded-3xl p-3 shadow-2xl relative overflow-hidden h-24 flex items-center">
        <div className="flex items-center gap-6 w-full h-full">
          {/* SECTION 1 : MASTER TOTAL */}
          <div className="flex flex-col gap-1.5 min-w-[160px] border-r border-white/10 pr-6 h-full justify-center">
            <h2 className="text-xs font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 fill-yellow-500" /> MASTER
            </h2>
            <div className="flex gap-1.5">
               <Tooltip text="Blackout">
                 <button onClick={() => handleGlobalAction('dimmer', 0)} className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-rose-600 text-white rounded-lg text-xs font-black uppercase transition-all active:scale-95 shadow-lg">0%</button>
               </Tooltip>
               <Tooltip text="Full">
                 <button onClick={() => handleGlobalAction('dimmer', 255)} className="flex-1 py-2.5 px-4 bg-yellow-500 hover:bg-yellow-400 text-[#05070a] rounded-lg text-xs font-black uppercase transition-all active:scale-95 shadow-lg">100%</button>
               </Tooltip>
            </div>
          </div>

          {/* SECTION 2 : FADERS DIM/STR */}
          <div className="flex gap-6 items-center px-6 border-r border-white/10 h-full">
            <div className="flex flex-col gap-1.5" onContextMenu={(e) => { e.preventDefault(); handleValuePrompt('Dimmer Global', masterVal, 0, 255, (v) => handleGlobalAction('dimmer', v)); }}>
              <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-black text-yellow-500/60 uppercase">Dimmer</span>
                <span className="text-[12px] font-mono font-black text-yellow-500">{Math.round((masterVal/255)*100)}%</span>
              </div>
              <input 
                type="range" min="0" max="255" value={masterVal} 
                onChange={(e) => handleGlobalAction('dimmer', parseInt(e.target.value))}
                className="w-28 h-1 bg-slate-800 accent-yellow-500 rounded-full cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5" onContextMenu={(e) => { e.preventDefault(); handleValuePrompt('Strobe Global', globalStrobe, 0, 255, (v) => handleGlobalAction('strobe', v)); }}>
              <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-black text-emerald-500/60 uppercase">Strobe</span>
                <span className="text-[12px] font-mono font-black text-emerald-500">{Math.round((globalStrobe/255)*100)}%</span>
              </div>
              <input 
                type="range" min="0" max="255" value={globalStrobe} 
                onChange={(e) => handleGlobalAction('strobe', parseInt(e.target.value))}
                className="w-28 h-1 bg-slate-800 accent-emerald-500 rounded-full cursor-pointer"
              />
            </div>
          </div>

          {/* SECTION 3 : RYTHME / AUDIO (Intégration Horizontale) */}
          <div className="flex items-center gap-6 px-6 border-r border-white/10 h-full flex-1">
            <div className="flex flex-col gap-1.5 min-w-[110px]" onContextMenu={(e) => { e.preventDefault(); handleValuePrompt('BPM', bpm, 40, 220, (v) => { setBpm(v); invoke('set_bpm', { bpm: v }); }); }}>
              <h3 className="text-xs font-black text-emerald-400 uppercase flex items-center gap-2">
                <Music className="w-3.5 h-3.5" /> RYTHME {isAudioActive && <span className="text-[10px] bg-emerald-500/20 px-1.5 rounded animate-pulse">AUTO-SYNC</span>}
              </h3>
              <div className={`flex items-center gap-3 p-1.5 rounded-lg border transition-all ${isAudioActive ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/50 border-white/5'}`}>
                <span className={`text-[13px] font-black font-mono w-8 ${isAudioActive ? 'text-emerald-400' : 'text-emerald-500'}`}>{bpm}</span>
                <input 
                  type="range" min="40" max="220" value={bpm} 
                  disabled={isAudioActive}
                  onChange={(e) => { 
                    const v = parseInt(e.target.value);
                    setBpm(v); 
                    invoke('set_bpm', { bpm: v }); 
                  }}
                  className={`w-24 h-1 rounded-full cursor-pointer transition-all ${isAudioActive ? 'accent-emerald-500/30 opacity-50 cursor-not-allowed' : 'accent-emerald-500 bg-slate-800'}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setIsAudioActive(!isAudioActive)} 
                  className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all active:scale-95 flex items-center gap-2 ${isAudioActive ? 'bg-emerald-500 text-white shadow-[0_0_10px_#10b981]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}
                >
                  <Activity className={`w-3.5 h-3.5 ${isAudioActive ? 'animate-pulse' : ''}`} />
                  Audio
                </button>
                <button 
                  onClick={handleTap} 
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-black uppercase border border-white/5 transition-all active:scale-95"
                >
                  Tap
                </button>
              </div>
              
              {/* Sélecteur de Source Audio */}
              <select 
                value={selectedAudioDeviceId || ''} 
                onChange={(e) => setSelectedAudioDeviceId(e.target.value || null)}
                className="bg-slate-900/80 border border-white/5 rounded px-2 py-1 text-[12px] font-bold text-slate-400 outline-none w-36 focus:border-emerald-500/50"
              >
                <option value="">Micro par défaut</option>
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Entrée ${device.deviceId.slice(0, 5)}...`}
                  </option>
                ))}
              </select>
            </div>

            {/* Indicateur de Beat et VU-mètre Audio */}
            <div className="flex items-center gap-4 border-l border-white/5 pl-6 h-full">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-4 h-4 rounded-full transition-all duration-75 ${isBeatActive ? 'bg-emerald-400 shadow-[0_0_15px_#10b981] scale-110' : 'bg-slate-800'}`} />
                <span className="text-[8px] font-black text-slate-500 uppercase">Beat</span>
              </div>

              {isAudioActive && (
                <div className="flex items-end gap-1.5 h-12 pb-1">
                  {/* Basses */}
                  <div className="flex flex-col items-center gap-1 h-full">
                    <div className="w-2 h-full bg-slate-800/50 rounded-full overflow-hidden relative border border-white/5">
                      <div 
                        className="absolute bottom-0 w-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-75" 
                        style={{ height: `${Math.max(5, audioStats.bass * 100)}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-black text-emerald-500/50 uppercase">B</span>
                  </div>
                  {/* Médiums */}
                  <div className="flex flex-col items-center gap-1 h-full">
                    <div className="w-2 h-full bg-slate-800/50 rounded-full overflow-hidden relative border border-white/5">
                      <div 
                        className="absolute bottom-0 w-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-75" 
                        style={{ height: `${Math.max(5, audioStats.mid * 100)}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-black text-cyan-500/50 uppercase">M</span>
                  </div>
                  {/* Aigus */}
                  <div className="flex flex-col items-center gap-1 h-full">
                    <div className="w-2 h-full bg-slate-800/50 rounded-full overflow-hidden relative border border-white/5">
                      <div 
                        className="absolute bottom-0 w-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-75" 
                        style={{ height: `${Math.max(5, audioStats.high * 100)}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-black text-blue-500/50 uppercase">A</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4 : ACTIONS FINALES */}
          <div className="flex items-center gap-3 pl-6 h-full">
            <Tooltip text="Break : Stop immédiat">
              <button 
                onClick={handleEndOfSong}
                className="px-6 py-3 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2 shadow-lg active:scale-95"
              >
                <Square className="w-5 h-5 fill-current" /> Break
              </button>
            </Tooltip>
          </div>
        </div>
      </section>

      <ValuePromptModal
        isOpen={promptData.isOpen}
        onClose={() => setPromptData(prev => ({ ...prev, isOpen: false }))}
        onSubmit={handleModalSubmit}
        title={promptData.label}
        defaultValue={promptData.currentVal.toString()}
        label={`Entrez la valeur pour ${promptData.label} (${promptData.min}-${promptData.max} ou 0-100%) :`}
      />
    </>
  );
};

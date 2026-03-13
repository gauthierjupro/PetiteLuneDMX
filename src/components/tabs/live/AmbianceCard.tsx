import React from 'react';
import { Sun } from 'lucide-react';
import { IntensityControls } from './IntensityControls';
import { ColorGrid } from './ColorGrid';
import { MacroButtons } from './MacroButtons';

interface AmbianceCardProps {
  group: any;
  intensity: { dim: number, str: number };
  color: { r: number, g: number, b: number };
  isAutoActive: boolean;
  isPulseActive: boolean;
  onIntensityChange: (type: 'dim' | 'str', val: number) => void;
  onColorChange: (r: number, g: number, b: number) => void;
  onMacro: (macro: string) => void;
  onStrobeContextMenu: () => void;
  onUserColorEdit: (id: string) => void;
  userColors: any;
  strobeShortcutVal: number;
  currentMasterIntensity: number;
  isLinked?: boolean;
  channels: number[];
  fixtures: any[];
}

export const AmbianceCard = ({
  group,
  intensity,
  color,
  isAutoActive,
  isPulseActive,
  onIntensityChange,
  onColorChange,
  onMacro,
  onStrobeContextMenu,
  onUserColorEdit,
  userColors,
  strobeShortcutVal,
  currentMasterIntensity,
  isLinked = false,
  channels,
  fixtures
}: AmbianceCardProps) => {
  // Calculer la valeur réelle du VU-mètre à partir du flux DMX
  const getLiveIntensity = () => {
    if (!group.fixtureIds || group.fixtureIds.length === 0) return 0;
    
    // On prend le premier projecteur du groupe comme référence
    const firstFixtureId = group.fixtureIds[0];
    const fixture = fixtures.find(f => f.id === firstFixtureId);
    
    if (!fixture) return 0;
    
    const address = fixture.address - 1;
    let dmxValue = 0;
    
    if (fixture.type === 'RGB') {
      dmxValue = channels[address] || 0;
    } else if (fixture.type === 'Moving Head') {
      dmxValue = channels[address + 5] || 0;
    } else if (fixture.type === 'Effect') {
      dmxValue = channels[address] || 0;
    }
    
    return (dmxValue / 255) * 100;
  };

  const liveHeight = getLiveIntensity();

  return (
    <div className={`bg-[#111317] border rounded-3xl p-4 shadow-xl relative overflow-hidden min-h-[200px] flex gap-4 max-w-[420px] transition-all duration-300 ${isLinked ? 'border-cyan-500/30 opacity-60 grayscale-[0.3]' : 'border-amber-500/60 ring-1 ring-amber-500/20 shadow-amber-500/10'}`}>
      {/* Overlay de protection pour les cartes liées */}
      {isLinked && (
        <div className="absolute inset-0 z-50 cursor-not-allowed bg-[#05070a]/10" title="Cette carte est pilotée par le Master" />
      )}

      <div className="flex-1 space-y-4">
        <div className={`flex justify-between items-center border-b pb-2 ${isLinked ? 'border-cyan-500/10' : 'border-amber-500/20'}`}>
          <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isLinked ? 'text-cyan-400/60' : 'text-amber-400'}`}>
            <Sun className="w-3.5 h-3.5" /> {group.name}
          </h3>
          <div className="flex gap-1">
            {isLinked && <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400/70 border border-cyan-500/20 text-[9px] font-black rounded">LECTURE SEULE (LIÉ)</span>}
            {!isLinked && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black rounded tracking-widest animate-pulse">MODE MANUEL</span>}
            {isPulseActive && <span className="px-1.5 py-0.5 bg-rose-500 text-[9px] font-black text-white rounded">PULSE</span>}
            {isAutoActive && <span className="px-1.5 py-0.5 bg-cyan-500 text-[9px] font-black text-black rounded">AUTO</span>}
          </div>
        </div>
        
        <div className="flex gap-4">
          <IntensityControls 
            dimValue={intensity.dim}
            strValue={intensity.str}
            onDimChange={(v) => onIntensityChange('dim', v)}
            onStrChange={(v) => onIntensityChange('str', v)}
            onStrobeContextMenu={onStrobeContextMenu}
            strobeShortcutVal={strobeShortcutVal}
          />
          
          <div className="flex-1 space-y-4">
            <div className="flex gap-4 items-start">
              <ColorGrid 
                onColorSelect={(r, g, b) => onColorChange(r, g, b)}
                onUserColorEdit={onUserColorEdit}
                userColors={userColors}
              />
              <MacroButtons 
                onMacro={onMacro}
                isAutoActive={isAutoActive}
                isPulseActive={isPulseActive}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BARRE LATERALE DROITE */}
      <div className="w-12 flex flex-col items-center justify-between py-1 border-l border-white/5 pl-4 shrink-0">
         <div className="flex flex-col items-center gap-6">
           <div 
             className="w-4 h-4 rounded-full transition-all duration-300" 
             style={{ 
               backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
               boxShadow: `0 0 10px rgb(${color.r}, ${color.g}, ${color.b})`
             }}
           />
           <div className="w-2 h-32 bg-slate-900 rounded-full overflow-hidden relative shadow-inner">
              <div 
                className="absolute bottom-0 w-full bg-blue-400 shadow-[0_0_10px_#60a5fa] transition-all duration-75"
                style={{ height: `${liveHeight}%` }}
              />
           </div>
         </div>
         <div className="flex flex-col gap-1 items-center mb-2">
           <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">R:{color.r}</span>
           <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">G:{color.g}</span>
           <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">B:{color.b}</span>
         </div>
      </div>
    </div>
  );
};

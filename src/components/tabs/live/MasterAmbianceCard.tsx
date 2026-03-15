import React from 'react';
import { Maximize2 } from 'lucide-react';
import { IntensityControls } from './IntensityControls';
import { ColorGrid } from './ColorGrid';
import { MacroButtons } from './MacroButtons';

interface MasterAmbianceCardProps {
  linkedCount: number;
  intensity: { dim: number, str: number };
  color: { r: number, g: number, b: number };
  isAutoActive: boolean;
  isPulseActive: boolean;
  activeMacro: string | null;
  onIntensityChange: (type: 'dim' | 'str', val: number) => void;
  onColorChange: (r: number, g: number, b: number) => void;
  onMacro: (macro: string) => void;
  onStrobeContextMenu: () => void;
  onUserColorEdit: (id: string) => void;
  userColors: any;
  strobeShortcutVal: number;
  currentMasterIntensity: number;
  channels: number[];
  fixtures: any[];
  groups: any[];
  linkedGroups: string[];
}

export const MasterAmbianceCard = ({
  linkedCount,
  intensity,
  color,
  isAutoActive,
  isPulseActive,
  activeMacro,
  onIntensityChange,
  onColorChange,
  onMacro,
  onStrobeContextMenu,
  onUserColorEdit,
  userColors,
  strobeShortcutVal,
  currentMasterIntensity,
  channels,
  fixtures,
  groups,
  linkedGroups
}: MasterAmbianceCardProps) => {
  // Calculer la valeur moyenne du VU-mètre pour les groupes liés
  const getMasterVuHeight = () => {
    if (linkedGroups.length === 0) return 0;
    
    // On utilise la valeur réelle du premier projecteur du premier groupe lié
    const firstGroupId = linkedGroups[0];
    const group = groups.find(g => g.id === firstGroupId);
    if (!group || !group.fixtureIds || group.fixtureIds.length === 0) return (intensity.dim / 255) * 100;

    const firstFixtureId = group.fixtureIds[0];
    const fixture = fixtures.find(f => f.id === firstFixtureId);
    if (!fixture) return (intensity.dim / 255) * 100;

    const address = fixture.address - 1;
    let dmxValue = 0;
    if (fixture.type === 'RGB') dmxValue = channels[address] || 0;
    else if (fixture.type === 'Moving Head') dmxValue = channels[address + 5] || 0;
    else if (fixture.type === 'Effect') dmxValue = channels[address] || 0;

    return (dmxValue / 255) * 100;
  };

  // Calculer la couleur réelle du voyant à partir du flux DMX
  const getLiveColor = () => {
    if (linkedGroups.length === 0) return color;
    
    // On cherche le premier projecteur du premier groupe lié
    const firstGroupId = linkedGroups[0];
    const group = groups.find(g => g.id === firstGroupId);
    if (!group || !group.fixtureIds || group.fixtureIds.length === 0) return color;

    const firstFixtureId = group.fixtureIds[0];
    const fixture = fixtures.find(f => f.id === firstFixtureId);
    if (!fixture) return color;

    const address = fixture.address - 1;
    
    if (fixture.type === 'RGB') {
      return {
        r: channels[address + 1] ?? color.r,
        g: channels[address + 2] ?? color.g,
        b: channels[address + 3] ?? color.b
      };
    } else if (fixture.type === 'Moving Head') {
      const v = channels[address + 5] || 0;
      if (v < 10) return { r: 255, g: 255, b: 255 };
      if (v < 21) return { r: 255, g: 0,   b: 0   };
      if (v < 32) return { r: 255, g: 128, b: 0   };
      if (v < 43) return { r: 255, g: 255, b: 0   };
      if (v < 54) return { r: 0,   g: 255, b: 0   };
      if (v < 65) return { r: 0,   g: 0,   b: 255 };
      if (v < 76) return { r: 0,   g: 255, b: 255 };
      if (v < 87) return { r: 255, g: 0,   b: 255 };
    }
    
    return color;
  };

  const vuHeight = getMasterVuHeight();
  const liveColor = getLiveColor();

  return (
    <div className="bg-[#1a1c22] border-2 border-cyan-500/50 rounded-3xl p-4 shadow-[0_0_20px_rgba(34,211,238,0.2)] animate-in zoom-in duration-300 relative overflow-hidden min-h-[200px] flex gap-4 max-w-[420px]">
      <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_#22d3ee]" />
      
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5" /> PILOTAGE AMBIANCE ({linkedCount} {linkedCount > 1 ? 'GROUPES' : 'GROUPE'})
          </h3>
          <div className="flex gap-1">
            {isPulseActive && <span className="px-1.5 py-0.5 bg-amber-500 text-[10px] font-black text-black rounded animate-pulse">PULSE</span>}
            {isAutoActive && <span className="px-1.5 py-0.5 bg-cyan-500 text-[10px] font-black text-black rounded animate-pulse">AUTO</span>}
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
            dimLabel="M-Dim"
            strLabel="M-Str"
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
                activeMacro={activeMacro}
                showFan={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BARRE LATERALE DROITE */}
      <div className="w-12 flex flex-col items-center justify-between py-1 border-l border-cyan-500/20 pl-4 shrink-0">
         <div className="flex flex-col items-center gap-6">
           <div 
             className="w-4 h-4 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-300" 
             style={{ 
               backgroundColor: `rgb(${liveColor.r}, ${liveColor.g}, ${liveColor.b})`,
               boxShadow: `0 0 15px rgb(${liveColor.r}, ${liveColor.g}, ${liveColor.b})`
             }}
           />
           <div className="w-2 h-32 bg-slate-900 rounded-full overflow-hidden relative shadow-inner">
              <div 
                className="absolute bottom-0 w-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-75"
                style={{ height: `${vuHeight}%` }}
              />
           </div>
         </div>
         <span className="text-[9px] font-black text-cyan-400 rotate-90 origin-center whitespace-nowrap mb-6 uppercase tracking-[0.2em]">LIÉ</span>
      </div>
    </div>
  );
};

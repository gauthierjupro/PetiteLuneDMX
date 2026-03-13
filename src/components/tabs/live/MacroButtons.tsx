import React from 'react';
import { Activity, HeartPulse, Layout } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';

interface MacroButtonsProps {
  onMacro: (macro: string) => void;
  isAutoActive: boolean;
  isPulseActive: boolean;
  activeMacro?: string | null;
  showFan?: boolean;
}

export const MacroButtons = ({ 
  onMacro, 
  isAutoActive, 
  isPulseActive, 
  activeMacro,
  showFan = false
}: MacroButtonsProps) => {
  return (
    <div className="flex flex-col gap-2">
      <Tooltip text="Cycle automatique des couleurs" className="w-full">
        <button 
          onClick={() => onMacro('U1')}
          className={`w-[104px] h-12 border rounded-lg text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${isAutoActive ? 'bg-cyan-500 text-[#05070a] border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-400'}`}
        >
          <Activity className={`w-3.5 h-3.5 ${isAutoActive ? 'animate-pulse' : ''}`} /> Auto
        </button>
      </Tooltip>
      <Tooltip text="Effet de pulsation rythmique" className="w-full">
        <button 
          onClick={() => onMacro('U3')}
          className={`w-[104px] h-12 border rounded-lg text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${isPulseActive ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'}`}
        >
          <HeartPulse className={`w-3.5 h-3.5 ${isPulseActive ? 'animate-bounce' : ''}`} /> Pulse
        </button>
      </Tooltip>
      {showFan && (
        <Tooltip text="Éventail (Fanning) : Distribue un dégradé arc-en-ciel sur tous les projecteurs liés" className="w-full">
          <button 
            onClick={() => onMacro('U5')}
            className={`w-[104px] h-12 border rounded-lg text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${activeMacro === 'U5' ? 'bg-indigo-500 text-[#05070a] border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400'}`}
          >
            <Layout className="w-3.5 h-3.5" /> Fan
          </button>
        </Tooltip>
      )}
    </div>
  );
};

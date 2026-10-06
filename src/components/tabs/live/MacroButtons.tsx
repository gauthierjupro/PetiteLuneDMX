import React from 'react';
import { Activity, HeartPulse, Layout, Sparkles, Zap } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import { LIVE_MACRO_HELP } from '../../../utils/liveMacros';

interface MacroButtonsProps {
  onMacro: (macro: string) => void;
  isAutoActive: boolean;
  isPulseActive: boolean;
  activeMacro?: string | null;
  showFan?: boolean;
  /** Mode Débutant : auto-couleur, pulse, flash seulement. */
  beginnerMode?: boolean;
  buttonHeight?: string;
  buttonWidth?: string;
}

export const MacroButtons = ({
  onMacro,
  isAutoActive,
  isPulseActive,
  activeMacro,
  showFan = false,
  beginnerMode = false,
  buttonHeight = 'h-12',
  buttonWidth = 'w-[104px]',
}: MacroButtonsProps) => {
  const btnBase = `${buttonWidth} ${buttonHeight} border rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 active:scale-90 duration-75`;

  return (
    <div className="flex flex-col gap-2">
      <Tooltip text={LIVE_MACRO_HELP.U1.tooltip} className="w-full">
        <button
          type="button"
          onClick={() => onMacro('U1')}
          className={`${btnBase} ${isAutoActive ? 'bg-cyan-500 text-[#05070a] border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-400'}`}
        >
          <Activity className={`w-3.5 h-3.5 ${isAutoActive ? 'animate-pulse' : ''}`} />
          {LIVE_MACRO_HELP.U1.shortLabel}
        </button>
      </Tooltip>
      <Tooltip text={LIVE_MACRO_HELP.U3.tooltip} className="w-full">
        <button
          type="button"
          onClick={() => onMacro('U3')}
          className={`${btnBase} ${isPulseActive ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'}`}
        >
          <HeartPulse className={`w-3.5 h-3.5 ${isPulseActive ? 'animate-bounce' : ''}`} />
          {LIVE_MACRO_HELP.U3.shortLabel}
        </button>
      </Tooltip>
      <Tooltip text={LIVE_MACRO_HELP.U2.tooltip} className="w-full">
        <button
          type="button"
          onClick={() => onMacro('U2')}
          className={`${btnBase} ${activeMacro === 'U2' ? 'bg-rose-500 text-[#05070a] border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400'}`}
        >
          <Zap className="w-3.5 h-3.5" />
          {LIVE_MACRO_HELP.U2.shortLabel}
        </button>
      </Tooltip>
      {!beginnerMode && (
        <Tooltip text={LIVE_MACRO_HELP.U4.tooltip} className="w-full">
          <button
            type="button"
            onClick={() => onMacro('U4')}
            className={`${btnBase} ${activeMacro === 'U4' ? 'bg-violet-500 text-[#05070a] border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30 text-violet-400'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {LIVE_MACRO_HELP.U4.shortLabel}
          </button>
        </Tooltip>
      )}
      {showFan && !beginnerMode && (
        <Tooltip text={LIVE_MACRO_HELP.U5.tooltip} className="w-full">
          <button
            type="button"
            onClick={() => onMacro('U5')}
            className={`${btnBase} ${activeMacro === 'U5' ? 'bg-indigo-500 text-[#05070a] border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400'}`}
          >
            <Layout className="w-3.5 h-3.5" />
            {LIVE_MACRO_HELP.U5.shortLabel}
          </button>
        </Tooltip>
      )}
    </div>
  );
};

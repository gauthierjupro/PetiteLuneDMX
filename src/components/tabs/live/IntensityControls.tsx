import React from 'react';
import { VerticalSlider } from '../../ui/VerticalSlider';
import { Tooltip } from '../../ui/Tooltip';

interface IntensityControlsProps {
  dimValue: number;
  strValue: number;
  onDimChange: (v: number) => void;
  onStrChange: (v: number) => void;
  onStrobeContextMenu: () => void;
  strobeShortcutVal: number;
  dimLabel?: string;
  strLabel?: string;
}

export const IntensityControls = ({
  dimValue,
  strValue,
  onDimChange,
  onStrChange,
  onStrobeContextMenu,
  strobeShortcutVal,
  dimLabel = "Dim",
  strLabel = "Str"
}: IntensityControlsProps) => {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-2">
        <VerticalSlider 
          value={dimValue} 
          onChange={onDimChange} 
          label={dimLabel} 
          height="h-36" 
          color="bg-blue-500" 
        />
        <div className="flex flex-col gap-1.5">
          <Tooltip text="100%" className="w-full">
            <button onClick={() => onDimChange(255)} className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-[#05070a] rounded-lg text-[11px] font-black uppercase transition-all active:scale-90 shadow-lg">100%</button>
          </Tooltip>
          <Tooltip text="0%" className="w-full">
            <button onClick={() => onDimChange(0)} className="w-full py-3 bg-slate-800 hover:bg-rose-600 text-white rounded-lg text-[11px] font-black uppercase border border-white/5 transition-all active:scale-90">0%</button>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <VerticalSlider 
          value={strValue} 
          onChange={onStrChange} 
          label={strLabel} 
          height="h-36" 
          color="bg-emerald-500" 
        />
        <div className="flex flex-col gap-1.5">
          <Tooltip text={`Strobe ${Math.round((strobeShortcutVal/255)*100)}% (Clic droit pour régler)`} className="w-full">
            <button 
              onClick={() => onStrChange(strobeShortcutVal)} 
              onContextMenu={(e) => {
                e.preventDefault();
                onStrobeContextMenu();
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-[#05070a] rounded-lg text-[11px] font-black uppercase transition-all active:scale-90 shadow-lg"
            >
              {Math.round((strobeShortcutVal/255)*100)}%
            </button>
          </Tooltip>
          <Tooltip text="Strobe 0%" className="w-full">
            <button onClick={() => onStrChange(0)} className="w-full py-3 bg-slate-800 hover:bg-rose-600 text-white rounded-lg text-[11px] font-black uppercase border border-white/5 transition-all active:scale-90">0%</button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

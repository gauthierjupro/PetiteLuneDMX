import React from 'react';

interface ControlSliderProps {
  label: string;
  value: number;
  onChange: (val: string) => void;
  color?: string;
  min?: number;
  max?: number;
}

export const ControlSlider = ({ 
  label, 
  value, 
  onChange, 
  color = "bg-slate-800",
  min = 0,
  max = 255
}: ControlSliderProps) => (
  <div className="group">
    <div className="flex justify-between mb-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
      <span className="text-cyan-400 font-mono text-[10px]">{value}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-1 ${color} rounded-lg appearance-none cursor-pointer accent-cyan-500`}
    />
  </div>
);

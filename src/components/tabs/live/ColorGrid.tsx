import React from 'react';
import { Tooltip } from '../../ui/Tooltip';
import { standardColors } from '../../../utils/colorUtils';

interface ColorGridProps {
  onColorSelect: (r: number, g: number, b: number) => void;
  userColors: Record<string, {r: number, g: number, b: number}>;
  onUserColorEdit: (id: string) => void;
  buttonSize?: string;
}

export const ColorGrid = ({ 
  onColorSelect, 
  userColors,
  onUserColorEdit,
  buttonSize = "w-12 h-12"
}: ColorGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {standardColors.map((c, i) => (
        <Tooltip key={i} text={`${c.cat} : ${c.name}`}>
          <button 
            onClick={() => onColorSelect(c.r, c.g, c.b)} 
            style={{ backgroundColor: c.hex }} 
            className={`${buttonSize} rounded-lg border border-white/20 hover:scale-110 transition-transform shadow-xl active:scale-90 cursor-pointer z-10`} 
          />
        </Tooltip>
      ))}
      {['U1', 'U2'].map((id) => {
        const color = userColors[id] || { r: 255, g: 255, b: 255 };
        const hex = `#${((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1)}`;
        
        return (
          <Tooltip key={id} text={`Couleur ${id} : ${hex} (Clic pour activer, Clic droit pour éditer)`}>
            <button 
              onClick={() => onColorSelect(color.r, color.g, color.b)} 
              onContextMenu={(e) => {
                e.preventDefault();
                onUserColorEdit(id);
              }}
              style={{ backgroundColor: hex }}
              className={`${buttonSize} rounded-lg border-2 border-white/40 hover:scale-110 transition-all shadow-xl active:scale-90 cursor-pointer z-10 flex flex-col items-center justify-center overflow-hidden`}
            >
              <span className="text-[12px] font-black text-white mix-blend-difference">{id}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};

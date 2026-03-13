import React, { useRef, useEffect, useState } from 'react';

interface XYPadProps {
  x: number; // 0-255
  y: number; // 0-255
  onChange: (x: number, y: number) => void;
  size?: number;
}

export const XYPad = ({ x, y, onChange, size = 160 }: XYPadProps) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = (e: MouseEvent | React.MouseEvent) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
    const newY = Math.max(0, Math.min(255, Math.round(((e.clientY - rect.top) / rect.height) * 255)));
    onChange(newX, newY);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMouseMove(e);
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging]);

  return (
    <div 
      ref={padRef}
      onMouseDown={onMouseDown}
      className="bg-[#1a1c20] border-2 border-white/5 rounded-2xl relative cursor-crosshair overflow-hidden shadow-inner"
      style={{ width: size, height: size }}
    >
      {/* Grille */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      {/* Axe central */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-white/5" />
      <div className="absolute top-0 left-1/2 w-px h-full bg-white/5" />

      {/* Curseur */}
      <div 
        className="absolute w-4 h-4 -ml-2 -mt-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] border-2 border-white transition-all duration-75"
        style={{ 
          left: `${(x / 255) * 100}%`, 
          top: `${(y / 255) * 100}%` 
        }}
      />
    </div>
  );
};

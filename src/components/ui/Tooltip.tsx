import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactElement;
  className?: string;
}

export const Tooltip = ({ text, children, className = "" }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updateCoords();
      window.addEventListener('scroll', updateCoords);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isVisible]);

  const trigger = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      setIsVisible(true);
      updateCoords();
      if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      setIsVisible(false);
      if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    }
  });

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      {trigger}
      {isVisible && createPortal(
        <div 
          className="fixed mb-2 px-3 py-2 bg-slate-900/95 border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-2xl shadow-black/50 z-[9999] pointer-events-none animate-in fade-in zoom-in duration-200 backdrop-blur-md max-w-[250px] text-center whitespace-normal"
          style={{ 
            top: coords.top, 
            left: coords.left,
            transform: 'translate(-50%, calc(-100% - 8px))'
          }}
        >
          {text}
          <div 
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[6px] border-transparent border-t-slate-900/95"
          />
        </div>,
        document.body
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { MotionMode } from "../types/dmx";

const MovingHeadSection: React.FC = () => {
  const [pos, setPos] = useState({ x: 127, y: 127 });
  const [activeMode, setActiveMode] = useState<MotionMode | null>(null);
  const [amplitude, setAmplitude] = useState(0.2);
  const [cycleIndex, setCycleIndex] = useState(0);

  const handleMouseMove = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    if (activeMode) {
      await invoke("set_motion_mode", { mode: null });
      setActiveMode(null);
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 255);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 255);
    
    setPos({ x, y });
    
    await invoke("set_channel", { address: 1, value: x });
    await invoke("set_channel", { address: 2, value: y });
  };

  const toggleMotionMode = async (mode: MotionMode) => {
    const newMode = activeMode === mode ? null : mode;
    await invoke("set_motion_mode", { mode: newMode });
    setActiveMode(newMode);
  };

  const handleAmplitudeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmplitude = parseFloat(e.target.value);
    setAmplitude(newAmplitude);
    await invoke("set_motion_amplitude", { amplitude: newAmplitude });
  };

  const resetTime = async () => {
    await invoke("reset_motion_time");
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (activeMode) {
        const theta1 = 0; // This is a placeholder, in a real app you'd get this from the backend
        const index: number = await invoke("get_motion_cycle_index", { theta_1: theta1 });
        setCycleIndex(index);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [activeMode]);

  return (
    <div className="column center-column">
      <h2 className="panel-header">Lyres (Pan / Tilt)</h2>
      <div className="card">
        <div className="xy-pad" onMouseMove={handleMouseMove} onMouseDown={handleMouseMove}>
          <div 
            className="xy-cursor" 
            style={{ 
              left: `${(pos.x / 255) * 100}%`, 
              top: `${(pos.y / 255) * 100}%` 
            }}
          />
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.8rem', textAlign: 'center' }}>
          Pan: {pos.x} | Tilt: {pos.y}
        </div>
      </div>
      <div className="card">
        <h3>Mouvements Automatiques</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <button 
            className={`btn-motion ${activeMode === MotionMode.Circle ? 'active' : ''}`}
            onClick={() => toggleMotionMode(MotionMode.Circle)}
          >
            Cercle
          </button>
          <button 
            className={`btn-motion ${activeMode === MotionMode.Streak ? 'active' : ''}`}
            onClick={() => toggleMotionMode(MotionMode.Streak)}
          >
            Streak (8)
          </button>
          <button 
            className={`btn-motion ${activeMode === MotionMode.Ellipse ? 'active' : ''}`}
            onClick={() => toggleMotionMode(MotionMode.Ellipse)}
          >
            Ellipse
          </button>
        </div>
        <div style={{ marginTop: '15px' }}>
          <label>Amplitude: {amplitude.toFixed(2)}</label>
          <input 
            type="range" 
            min="0.05" 
            max="0.5" 
            step="0.01"
            value={amplitude} 
            onChange={handleAmplitudeChange} 
          />
        </div>
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={resetTime}>Reset Time</button>
          <span>Cycle Index: {cycleIndex}</span>
        </div>
      </div>
    </div>
  );
};

export default MovingHeadSection;

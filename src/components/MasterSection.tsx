import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

const MasterSection: React.FC = () => {
  const [dimmer, setDimmer] = useState(100);
  const [blackout, setBlackout] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const toggleBlackout = async () => {
    const newVal = !blackout;
    setBlackout(newVal);
    await invoke("blackout");
  };

  return (
    <div className="column left-column">
      <h2 className="panel-header">Master Control</h2>
      
      <div className="card">
        <label>Master Dimmer: {dimmer}%</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          className="slider-full"
          value={dimmer} 
          onChange={(e) => setDimmer(parseInt(e.target.value))} 
        />
      </div>

      <div className="card">
        <button 
          className={`btn-blackout ${blackout ? 'active' : ''}`}
          onClick={toggleBlackout}
        >
          {blackout ? 'BLACKOUT ON' : 'BLACKOUT OFF'}
        </button>
      </div>

      <div className="card">
        <div className="status-indicator">
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
          <span>{isConnected ? 'Interface Connectée (COM3)' : 'Interface Déconnectée'}</span>
        </div>
      </div>
    </div>
  );
};

export default MasterSection;

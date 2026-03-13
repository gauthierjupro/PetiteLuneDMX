import React from "react";

const SceneSection: React.FC = () => {
  return (
    <div className="column right-column">
      <h2 className="panel-header">Ambiances & Presets</h2>
      <div className="card">
        <h3>Presets (1-8)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <button key={i} className="btn-preset">Slot {i}</button>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Rythmes</h3>
        <button className="btn-full">Auto-Mode</button>
      </div>
    </div>
  );
};

export default SceneSection;

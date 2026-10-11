import React from 'react';
import { Play, Pause, RotateCcw, Settings, Activity } from 'lucide-react';

export default function Header({ simulationStatus, onStart, onPause, onReset, onOpenThresholds }) {
  const isRunning = simulationStatus?.isRunning;

  return (
    <header style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
          API Reliability & AI Debugging Hub
        </h2>
        {isRunning ? (
          <div className="live-indicator">
            <div className="dot" />
            <span>TRAFFIC SIMULATION LIVE</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--text-muted)', borderRadius: '50%' }} />
            <span>SIMULATION PAUSED</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isRunning ? (
          <button className="btn btn-warning" onClick={onPause}>
            <Pause size={15} />
            Pause Simulation
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onStart}>
            <Play size={15} />
            Start Simulation
          </button>
        )}

        <button className="btn btn-secondary" onClick={onReset} title="Reset all failure states and circuit breakers">
          <RotateCcw size={15} />
          Reset All
        </button>

        <button className="btn btn-secondary" onClick={onOpenThresholds}>
          <Settings size={15} />
          Thresholds
        </button>
      </div>
    </header>
  );
}

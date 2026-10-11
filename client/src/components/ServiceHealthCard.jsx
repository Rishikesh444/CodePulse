import React, { useState } from 'react';
import { Server, AlertOctagon, RotateCcw, Zap, Clock, AlertTriangle } from 'lucide-react';
import CircuitBreakerStatusBadge from './CircuitBreakerStatusBadge.jsx';

export default function ServiceHealthCard({ service, onSimulateFailure, onReset }) {
  const [selectedFailure, setSelectedFailure] = useState('500_BURST');
  const [loading, setLoading] = useState(false);

  const handleFailureTrigger = async () => {
    setLoading(true);
    try {
      await onSimulateFailure(service.service, selectedFailure);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTrigger = async () => {
    setLoading(true);
    try {
      await onReset(service.service);
    } finally {
      setLoading(false);
    }
  };

  const healthClass = service.health?.toLowerCase() || 'healthy';

  return (
    <div className="card" style={{
      borderTop: `3px solid ${
        service.health === 'ISOLATED' ? 'var(--accent-crimson)' :
        service.health === 'DEGRADED' ? 'var(--accent-amber)' : 'var(--accent-emerald)'
      }`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '16px',
    }}>
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {service.service}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span className={`badge badge-${healthClass}`}>
              <span className={`status-dot ${healthClass}`} />
              {service.health}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <CircuitBreakerStatusBadge state={service.circuitState} cooldownExpiry={service.cooldownExpiry} />
          {service.manualFailureMode && (
            <span className="badge badge-critical" style={{ fontSize: '10px' }}>
              CHAOS MODE ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        background: 'var(--bg-main)',
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requests (60s)</div>
          <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
            {service.totalRequests || 0}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Error Rate</div>
          <div style={{
            fontSize: '14px',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            color: service.errorRate > 10 ? 'var(--accent-crimson)' : 'var(--text-primary)',
          }}>
            {service.errorRate || 0}% ({service.errorCount || 0} errs)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avg Latency</div>
          <div style={{
            fontSize: '14px',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            color: service.avgLatency > 1000 ? 'var(--accent-amber)' : 'var(--text-primary)',
          }}>
            {service.avgLatency || 0} ms
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>P95 Latency</div>
          <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
            {service.p95Latency || 0} ms
          </div>
        </div>
      </div>

      {/* Failure Injection & Recovery Simulation Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={selectedFailure}
            onChange={(e) => setSelectedFailure(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            <option value="500_BURST">HTTP 500 Spike (Crash)</option>
            <option value="LATENCY_SPIKE">Latency Spike (Degrade)</option>
          </select>

          <button
            className="btn btn-danger btn-sm"
            onClick={handleFailureTrigger}
            disabled={loading}
            title="Inject simulated failure scenario"
          >
            <Zap size={13} />
            Inject Chaos
          </button>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleResetTrigger}
          disabled={loading}
          style={{ width: '100%' }}
        >
          <RotateCcw size={13} />
          Reset & Trigger Recovery Probe
        </button>
      </div>
    </div>
  );
}

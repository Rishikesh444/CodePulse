import React from 'react';
import { ShieldAlert, Sparkles, CheckCircle2, Clock, ChevronRight } from 'lucide-react';

export default function IncidentList({ incidents, onSelectIncident }) {
  const activeIncidents = (incidents || []).filter((i) => i.status !== 'RESOLVED');
  const resolvedIncidents = (incidents || []).filter((i) => i.status === 'RESOLVED');

  const severityBadge = (sev) => {
    const s = sev?.toUpperCase();
    if (s === 'CRITICAL') return <span className="badge badge-critical">{s}</span>;
    if (s === 'HIGH') return <span className="badge badge-critical" style={{ opacity: 0.9 }}>{s}</span>;
    if (s === 'MEDIUM') return <span className="badge badge-degraded">{s}</span>;
    return <span className="badge badge-info">{s}</span>;
  };

  const statusBadge = (st) => {
    if (st === 'RESOLVED') return <span className="badge badge-healthy"><CheckCircle2 size={12} /> RESOLVED</span>;
    if (st === 'INVESTIGATING') return <span className="badge badge-degraded"><Clock size={12} /> INVESTIGATING</span>;
    return <span className="badge badge-critical"><ShieldAlert size={12} /> OPEN</span>;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <ShieldAlert size={18} color="var(--accent-crimson)" />
          Incident Response & AI Diagnostics Desk
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {activeIncidents.length} Active Incident{activeIncidents.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(!incidents || incidents.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ marginBottom: '8px' }} />
            <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>No active incidents detected</p>
            <p style={{ fontSize: '12px' }}>Traffic simulation is running within normal threshold limits.</p>
          </div>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc.incidentId}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${inc.status === 'RESOLVED' ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="code-font" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                    {inc.incidentId}
                  </span>
                  {severityBadge(inc.severity)}
                  {statusBadge(inc.status)}
                  <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                    CB: {inc.circuitState}
                  </span>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {inc.title}
                </h4>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                  <span>Service: <strong style={{ color: 'var(--text-secondary)' }}>{inc.service}</strong></span>
                  <span>Rule: <code className="code-font" style={{ color: 'var(--accent-amber)' }}>{inc.triggeringRule}</code></span>
                  <span>Started: {new Date(inc.startTime).toLocaleTimeString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {inc.aiAnalysisStatus === 'COMPLETED' ? (
                  <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} /> AI Diagnosis Ready
                  </span>
                ) : inc.aiAnalysisStatus === 'FALLBACK' ? (
                  <span className="badge badge-degraded" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} /> Fallback Diagnosis
                  </span>
                ) : null}

                <button
                  className="btn btn-ai btn-sm"
                  onClick={() => onSelectIncident(inc)}
                >
                  <Sparkles size={14} />
                  Analyze & Debug
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

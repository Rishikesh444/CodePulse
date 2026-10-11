import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import AIAnalysisPanel from './AIAnalysisPanel.jsx';
import { api } from '../services/api.js';

export default function IncidentDetailsModal({ incident, onClose, onRefreshIncident }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(incident);

  if (!incident) return null;

  const handleRunAI = async () => {
    setAnalyzing(true);
    try {
      const res = await api.analyseIncident(currentIncident.incidentId);
      if (res.analysis) {
        setCurrentIncident(prev => ({
          ...prev,
          aiAnalysisStatus: res.analysis.isFallback ? 'FALLBACK' : 'COMPLETED',
          aiAnalysis: res.analysis,
        }));
        if (onRefreshIncident) onRefreshIncident();
      }
    } catch (err) {
      alert(`AI Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: currentIncident.status === 'RESOLVED' ? 'var(--accent-emerald-glow)' : 'var(--accent-crimson-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldAlert size={18} color={currentIncident.status === 'RESOLVED' ? 'var(--accent-emerald)' : 'var(--accent-crimson)'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {currentIncident.incidentId}
                </h3>
                <span className={`badge ${currentIncident.status === 'RESOLVED' ? 'badge-healthy' : 'badge-critical'}`}>
                  {currentIncident.status}
                </span>
                <span className="badge badge-purple">
                  CB: {currentIncident.circuitState}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {currentIncident.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            background: 'var(--bg-main)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Affected Service</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {currentIncident.service}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Triggering Rule</div>
              <div className="code-font" style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>
                {currentIncident.triggeringRule}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Observed Evidence</div>
              <div className="code-font" style={{ fontSize: '12px', color: 'var(--accent-amber)' }}>
                {JSON.stringify(currentIncident.triggeringEvidence)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Start Timestamp</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {new Date(currentIncident.startTime).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Incident Timeline */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={15} color="var(--accent-cyan)" />
              Incident Event Timeline
            </h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderLeft: '2px solid var(--border-color)',
              paddingLeft: '16px',
              marginLeft: '8px',
            }}>
              {(currentIncident.timeline || []).map((ev, idx) => (
                <div key={idx} style={{ position: 'relative', fontSize: '12px' }}>
                  <div style={{
                    position: 'absolute',
                    left: '-21px',
                    top: '4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: ev.event === 'SERVICE_RECOVERED' ? 'var(--accent-emerald)' : 'var(--accent-crimson)',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="code-font" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{ev.event}</strong>
                  </div>
                  {ev.details && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                      {typeof ev.details === 'string' ? ev.details : JSON.stringify(ev.details)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Root-Cause Assistant Section */}
          <div>
            <AIAnalysisPanel
              analysis={currentIncident.aiAnalysis}
              loading={analyzing}
              onTriggerAnalysis={handleRunAI}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

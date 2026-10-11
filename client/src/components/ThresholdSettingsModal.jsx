import React, { useState, useEffect } from 'react';
import { X, Settings, Save } from 'lucide-react';
import { api } from '../services/api.js';

export default function ThresholdSettingsModal({ onClose, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    windowSeconds: 10,
    errorSpikeCount: 5,
    latencyThresholdMs: 1000,
    errorRatePercentage: 20,
    circuitBreakerCooldownMs: 10000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const t = await api.getThresholds();
        if (t) {
          setFormData({
            windowSeconds: t.windowSeconds || 10,
            errorSpikeCount: t.errorSpikeCount || 5,
            latencyThresholdMs: t.latencyThresholdMs || 1000,
            errorRatePercentage: t.errorRatePercentage || 20,
            circuitBreakerCooldownMs: t.circuitBreakerCooldownMs || 10000,
          });
        }
      } catch (err) {
        console.error('Failed to load thresholds', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateThresholds(formData);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      alert(`Failed to save thresholds: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              SRE Monitoring Threshold Configuration
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading rules...</div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Rolling Window Duration (Seconds)
                </label>
                <input
                  type="number"
                  value={formData.windowSeconds}
                  onChange={(e) => setFormData({ ...formData, windowSeconds: parseInt(e.target.value, 10) })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Time window for evaluating rolling log errors.</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Rule 1: HTTP 500 Error Spike Limit
                </label>
                <input
                  type="number"
                  value={formData.errorSpikeCount}
                  onChange={(e) => setFormData({ ...formData, errorSpikeCount: parseInt(e.target.value, 10) })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Minimum HTTP 500 errors in rolling window to trigger CRITICAL incident.</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Rule 2: Average Latency Threshold (ms)
                </label>
                <input
                  type="number"
                  value={formData.latencyThresholdMs}
                  onChange={(e) => setFormData({ ...formData, latencyThresholdMs: parseInt(e.target.value, 10) })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average response latency threshold to trigger DEGRADED status.</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Circuit Breaker Cooldown (ms)
                </label>
                <input
                  type="number"
                  value={formData.circuitBreakerCooldownMs}
                  onChange={(e) => setFormData({ ...formData, circuitBreakerCooldownMs: parseInt(e.target.value, 10) })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duration circuit remains OPEN before testing HALF_OPEN probe.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

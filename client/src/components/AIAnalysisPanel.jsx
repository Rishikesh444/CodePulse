import React from 'react';
import { Sparkles, CheckSquare, AlertCircle, HelpCircle, ShieldAlert, Cpu } from 'lucide-react';

export default function AIAnalysisPanel({ analysis, loading, onTriggerAnalysis }) {
  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-main)',
        border: '1px solid var(--accent-purple)',
        borderRadius: 'var(--radius-md)',
        padding: '32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}>
        <Sparkles size={32} color="var(--accent-purple)" className="spin" />
        <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
          Synthesizing Contextual Incident Evidence...
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Querying AI assistant with recent service metrics, HTTP error rates, and log trace correlation.
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{
        background: 'var(--bg-main)',
        border: '1px border var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}>
        <Sparkles size={28} color="var(--accent-purple)" />
        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
          AI Root-Cause Diagnosis Not Requested Yet
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Click below to analyze logs and evidence with the AI debugging engine.
        </p>
        <button className="btn btn-ai btn-sm" onClick={onTriggerAnalysis}>
          <Sparkles size={14} /> Run AI Root-Cause Analysis
        </button>
      </div>
    );
  }

  const isFallback = analysis.isFallback;

  return (
    <div style={{
      background: 'var(--bg-main)',
      border: `1px solid ${isFallback ? 'var(--accent-amber)' : 'var(--accent-purple)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} color={isFallback ? 'var(--accent-amber)' : 'var(--accent-purple)'} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {isFallback ? 'Rule-Based Fallback Diagnostic Report' : 'AI Root-Cause Debugging Report'}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isFallback ? 'Generated via heuristic fallback engine (AI_API_KEY not set)' : 'Contextually synthesized from metric logs & trace evidence'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {isFallback ? (
            <span className="badge badge-degraded">FALLBACK ENGINE</span>
          ) : (
            <span className="badge badge-purple">LIVE LLM ANALYSIS</span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onTriggerAnalysis}>
            <Sparkles size={12} /> Re-analyze
          </button>
        </div>
      </div>

      {/* Incident Summary */}
      <div>
        <h5 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
          Incident Summary
        </h5>
        <div style={{
          background: 'var(--bg-card)',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          borderLeft: '3px solid var(--accent-purple)',
        }}>
          {analysis.incidentSummary}
        </div>
      </div>

      {/* Grid: Probable Causes & Recommended Remediation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Probable Causes */}
        <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
          <h5 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} color="var(--accent-amber)" />
            Probable Causes & Hypotheses
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(analysis.probableCauses || []).map((c, idx) => (
              <div key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', justifyBetween: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--accent-purple)', fontWeight: '700' }}>•</span>
                <span style={{ flex: 1 }}>{c.hypothesis || c}</span>
                {c.confidence && (
                  <span className={`badge ${c.confidence === 'HIGH' ? 'badge-critical' : 'badge-degraded'}`} style={{ fontSize: '9px' }}>
                    {c.confidence}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Remediation */}
        <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
          <h5 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckSquare size={14} color="var(--accent-emerald)" />
            Suggested Remediation Steps
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(analysis.suggestedRemediation || []).map((step, idx) => (
              <div key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: '700' }}>{idx + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Debugging Steps */}
      <div>
        <h5 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Recommended Investigation Steps
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(analysis.recommendedDebuggingSteps || []).map((step, idx) => (
            <div key={idx} className="code-font" style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--accent-cyan)' }}>
              $ {step}
            </div>
          ))}
        </div>
      </div>

      {/* Confidence & Limitations Statement */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
          <strong style={{ color: 'var(--text-primary)' }}>
            Diagnosis Confidence: {analysis.confidence?.level || 'MEDIUM'}
          </strong>
        </div>
        <div>{analysis.confidence?.explanation}</div>
        {analysis.confidence?.limitations && (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
            Limitations: {analysis.confidence.limitations}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Activity, AlertTriangle, Clock, ShieldAlert, CheckCircle2, ShieldOff } from 'lucide-react';

export default function OverviewCards({ metrics }) {
  const m = metrics || {
    totalSimulatedRequests: 0,
    requestsPerSecond: 0,
    totalHttp500Errors: 0,
    currentErrorRate: 0,
    avgLatency: 0,
    p95Latency: 0,
    healthyServices: 3,
    degradedServices: 0,
    isolatedServices: 0,
    activeIncidents: 0,
  };

  const cards = [
    {
      title: 'THROUGHPUT (RPS)',
      value: `${m.requestsPerSecond || 0} req/s`,
      sub: `${m.totalSimulatedRequests || 0} total requests (60s)`,
      icon: Activity,
      color: 'var(--accent-cyan)',
    },
    {
      title: 'ERROR RATE',
      value: `${m.currentErrorRate || 0}%`,
      sub: `${m.totalHttp500Errors || 0} HTTP 500 errors`,
      icon: AlertTriangle,
      color: m.currentErrorRate > 15 ? 'var(--accent-crimson)' : 'var(--accent-emerald)',
    },
    {
      title: 'LATENCY (AVG / P95)',
      value: `${m.avgLatency || 0} ms`,
      sub: `P95: ${m.p95Latency || 0} ms`,
      icon: Clock,
      color: m.avgLatency > 800 ? 'var(--accent-amber)' : 'var(--accent-cyan)',
    },
    {
      title: 'SERVICE TOPOLOGY',
      value: `${m.healthyServices || 0} Healthy`,
      sub: `${m.degradedServices || 0} Degraded · ${m.isolatedServices || 0} Isolated`,
      icon: m.isolatedServices > 0 ? ShieldOff : CheckCircle2,
      color: m.isolatedServices > 0 ? 'var(--accent-crimson)' : 'var(--accent-emerald)',
    },
    {
      title: 'ACTIVE INCIDENTS',
      value: `${m.activeIncidents || 0}`,
      sub: m.activeIncidents > 0 ? 'Action required' : 'All systems normal',
      icon: ShieldAlert,
      color: m.activeIncidents > 0 ? 'var(--accent-crimson)' : 'var(--accent-emerald)',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
    }}>
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div key={idx} className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                {c.title}
              </span>
              <Icon size={16} color={c.color} />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: c.color, fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>
              {c.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {c.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}

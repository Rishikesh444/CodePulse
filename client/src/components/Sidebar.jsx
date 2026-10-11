import React from 'react';
import { Activity, ShieldAlert, Cpu, Database, Settings, Terminal, Award } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenThresholds, dbStatus }) {
  const navItems = [
    { id: 'dashboard', label: 'Observability', icon: Activity },
    { id: 'incidents', label: 'Incident Desk', icon: ShieldAlert },
    { id: 'logs', label: 'Live Logs', icon: Terminal },
  ];

  return (
    <aside style={{
      width: '240px',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      gap: '24px',
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
        }}>
          <Activity size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            CodePulse<span style={{ color: 'var(--accent-cyan)' }}>Lite</span>
          </h1>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>v1.0.0 SRE ENGINE</p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', padding: '0 10px', marginBottom: '4px', textTransform: 'uppercase' }}>
          Monitoring
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: '600',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              {item.label}
            </button>
          );
        })}

        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', padding: '0 10px', marginTop: '16px', marginBottom: '4px', textTransform: 'uppercase' }}>
          Configuration
        </div>
        <button
          onClick={onOpenThresholds}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Settings size={18} color="var(--text-muted)" />
          SRE Thresholds
        </button>
      </nav>

      {/* Hackathon Portfolio Badge */}
      <div style={{
        background: 'rgba(38, 49, 66, 0.4)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent-amber)', fontWeight: '700' }}>
          <Award size={14} />
          HackCellence Edition
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Simulated booking services, circuit breaker isolation & AI root-cause analysis.
        </p>
      </div>

      {/* Database Status Indicator */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={14} color="var(--accent-emerald)" />
          <span style={{ color: 'var(--text-secondary)' }}>MongoDB</span>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          color: dbStatus?.state === 'connected' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
          fontWeight: '700',
        }}>
          {dbStatus?.isInMemory ? 'IN-MEM' : 'CONNECTED'}
        </span>
      </div>
    </aside>
  );
}

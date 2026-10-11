import React, { useState } from 'react';
import { Terminal, Filter, Search, RefreshCw } from 'lucide-react';

export default function RecentLogsTable({ logs, onFilterChange, loading }) {
  const [serviceFilter, setServiceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const handleApply = (newParams) => {
    onFilterChange(newParams);
  };

  const statusBadge = (code) => {
    if (code >= 500) return <span className="badge badge-critical code-font">{code}</span>;
    if (code >= 400) return <span className="badge badge-degraded code-font">{code}</span>;
    return <span className="badge badge-healthy code-font">{code}</span>;
  };

  const severityBadge = (sev) => {
    const s = sev?.toUpperCase();
    if (s === 'CRITICAL') return <span className="badge badge-critical">{s}</span>;
    if (s === 'ERROR') return <span className="badge badge-critical">{s}</span>;
    if (s === 'WARN') return <span className="badge badge-degraded">{s}</span>;
    return <span className="badge badge-info">{s}</span>;
  };

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="card-title">
          <Terminal size={18} color="var(--accent-cyan)" />
          Live Application Logs
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search log text..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                handleApply({ search: e.target.value, service: serviceFilter, severity: severityFilter, httpStatus: statusFilter });
              }}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px 6px 30px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
                width: '180px',
              }}
            />
          </div>

          <select
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value);
              handleApply({ search: searchText, service: e.target.value, severity: severityFilter, httpStatus: statusFilter });
            }}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          >
            <option value="">All Services</option>
            <option value="Booking Service">Booking Service</option>
            <option value="Search Service">Search Service</option>
            <option value="Payment Service">Payment Service</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              handleApply({ search: searchText, service: serviceFilter, severity: e.target.value, httpStatus: statusFilter });
            }}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          >
            <option value="">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              handleApply({ search: searchText, service: serviceFilter, severity: severityFilter, httpStatus: e.target.value });
            }}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          >
            <option value="">All Status Codes</option>
            <option value="200">200 OK</option>
            <option value="400">400 Bad Request</option>
            <option value="404">404 Not Found</option>
            <option value="500">500 Server Error</option>
            <option value="503">503 Circuit Isolated</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Service</th>
              <th>Severity</th>
              <th>HTTP</th>
              <th>Latency</th>
              <th>Log Message</th>
              <th>Correlation ID</th>
            </tr>
          </thead>
          <tbody>
            {(!logs || logs.length === 0) ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  {loading ? 'Fetching logs...' : 'No application logs match the selected filters.'}
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l._id}>
                  <td className="code-font" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {l.service}
                  </td>
                  <td>{severityBadge(l.severity)}</td>
                  <td>{statusBadge(l.httpStatus)}</td>
                  <td className="code-font" style={{ color: l.latency > 1000 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
                    {l.latency} ms
                  </td>
                  <td className="code-font" style={{
                    maxWidth: '350px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '12px',
                    color: l.httpStatus >= 500 ? '#fca5a5' : 'var(--text-primary)',
                  }}>
                    {l.message}
                  </td>
                  <td className="code-font" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {l.correlationId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

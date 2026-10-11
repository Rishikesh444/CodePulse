import React from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';

export default function CircuitBreakerStatusBadge({ state, cooldownExpiry }) {
  const s = (state || 'CLOSED').toUpperCase();

  if (s === 'CLOSED') {
    return (
      <span className="badge badge-closed" title="Circuit Breaker is CLOSED: Normal request processing permitted">
        <ShieldCheck size={12} />
        CB: CLOSED
      </span>
    );
  }

  if (s === 'HALF_OPEN') {
    return (
      <span className="badge badge-half_open" title="Circuit Breaker is HALF_OPEN: Cooldown expired. Testing probe request recovery">
        <RefreshCw size={12} className="spin" />
        CB: HALF_OPEN
      </span>
    );
  }

  // OPEN
  return (
    <span className="badge badge-open" title={`Circuit Breaker is OPEN: Failing service isolated. Requests fast-failed`}>
      <ShieldAlert size={12} />
      CB: OPEN (ISOLATED)
    </span>
  );
}

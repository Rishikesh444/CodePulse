const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errorData = await res.json();
      errorDetail = errorData.message || errorData.error || res.statusText;
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // System Health
  getHealth: () => fetchJSON('/health'),

  // Services
  getServices: () => fetchJSON('/services'),
  simulateFailure: (serviceName, failureType = '500_BURST') =>
    fetchJSON(`/services/${encodeURIComponent(serviceName)}/simulate-failure`, {
      method: 'POST',
      body: JSON.stringify({ failureType }),
    }),
  resetService: (serviceName) =>
    fetchJSON(`/services/${encodeURIComponent(serviceName)}/reset`, {
      method: 'POST',
    }),

  // Logs
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/logs?${qs}`);
  },

  // Metrics
  getOverviewMetrics: () => fetchJSON('/metrics/overview'),
  getTimeSeriesMetrics: () => fetchJSON('/metrics/timeseries'),

  // Incidents
  getIncidents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/incidents?${qs}`);
  },
  getIncidentById: (id) => fetchJSON(`/incidents/${id}`),
  analyseIncident: (id) =>
    fetchJSON(`/incidents/${id}/analyse`, {
      method: 'POST',
    }),

  // Simulation Controls
  getSimulationStatus: () => fetchJSON('/simulation/status'),
  startSimulation: () => fetchJSON('/simulation/start', { method: 'POST' }),
  pauseSimulation: () => fetchJSON('/simulation/pause', { method: 'POST' }),
  resetSimulation: () => fetchJSON('/simulation/reset', { method: 'POST' }),

  // Thresholds
  getThresholds: () => fetchJSON('/thresholds'),
  updateThresholds: (thresholds) =>
    fetchJSON('/thresholds', {
      method: 'PUT',
      body: JSON.stringify(thresholds),
    }),
};

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import OverviewCards from './components/OverviewCards.jsx';
import ServiceHealthCard from './components/ServiceHealthCard.jsx';
import ChartsSection from './components/ChartsSection.jsx';
import RecentLogsTable from './components/RecentLogsTable.jsx';
import IncidentList from './components/IncidentList.jsx';
import IncidentDetailsModal from './components/IncidentDetailsModal.jsx';
import ThresholdSettingsModal from './components/ThresholdSettingsModal.jsx';
import { api } from './services/api.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logFilterParams, setLogFilterParams] = useState({});
  const [simulationStatus, setSimulationStatus] = useState({ isRunning: false });
  const [dbStatus, setDbStatus] = useState(null);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Data fetching routine
  const refreshData = useCallback(async () => {
    try {
      const [healthRes, metricsRes, timeSeriesRes, servicesRes, incidentsRes, logsRes] = await Promise.all([
        api.getHealth(),
        api.getOverviewMetrics(),
        api.getTimeSeriesMetrics(),
        api.getServices(),
        api.getIncidents(),
        api.getLogs(logFilterParams),
      ]);

      setDbStatus(healthRes.database);
      setSimulationStatus(healthRes.simulation);
      setMetrics(metricsRes);
      setTimeSeries(timeSeriesRes);
      setServices(servicesRes);
      setIncidents(incidentsRes);
      setLogs(logsRes.logs);
      setApiError(null);
    } catch (err) {
      console.error('Polling error:', err);
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }, [logFilterParams]);

  // Polling loop (every 2.5s)
  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 2500);
    return () => clearInterval(timer);
  }, [refreshData]);

  // Simulation Handlers
  const handleStartSimulation = async () => {
    try {
      await api.startSimulation();
      refreshData();
    } catch (err) {
      alert(`Start failed: ${err.message}`);
    }
  };

  const handlePauseSimulation = async () => {
    try {
      await api.pauseSimulation();
      refreshData();
    } catch (err) {
      alert(`Pause failed: ${err.message}`);
    }
  };

  const handleResetSimulation = async () => {
    try {
      await api.resetSimulation();
      refreshData();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  const handleSimulateFailure = async (serviceName, failureType) => {
    try {
      await api.simulateFailure(serviceName, failureType);
      refreshData();
    } catch (err) {
      alert(`Failure injection failed: ${err.message}`);
    }
  };

  const handleResetService = async (serviceName) => {
    try {
      await api.resetService(serviceName);
      refreshData();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenThresholds={() => setShowThresholdModal(true)}
        dbStatus={dbStatus}
      />

      {/* Main Workspace */}
      <main className="main-content">
        <Header
          simulationStatus={simulationStatus}
          onStart={handleStartSimulation}
          onPause={handlePauseSimulation}
          onReset={handleResetSimulation}
          onOpenThresholds={() => setShowThresholdModal(true)}
        />

        <div className="dashboard-body">
          {apiError && (
            <div style={{
              background: 'var(--accent-crimson-glow)',
              border: '1px solid var(--accent-crimson)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              color: 'var(--accent-crimson)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span><strong>Backend Communication Warning:</strong> {apiError}</span>
              <button className="btn btn-secondary btn-sm" onClick={refreshData}>Retry</button>
            </div>
          )}

          {/* Overview Cards always at top */}
          <OverviewCards metrics={metrics} />

          {/* Tab 1: Full Observability Dashboard */}
          {activeTab === 'dashboard' && (
            <>
              {/* Service Topology & Circuit Breaker Health Cards */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Simulated Microservices Topology & Circuit Breakers
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    State Machine: CLOSED ➔ OPEN (Fast Fail) ➔ HALF_OPEN (Probe)
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px',
                }}>
                  {services.map((srv) => (
                    <ServiceHealthCard
                      key={srv.service}
                      service={srv}
                      onSimulateFailure={handleSimulateFailure}
                      onReset={handleResetService}
                    />
                  ))}
                </div>
              </div>

              {/* Real-time Metric Graphs */}
              <ChartsSection timeSeriesData={timeSeries} />

              {/* Incidents Desk Summary */}
              <IncidentList
                incidents={incidents}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
              />

              {/* Live Application Logs */}
              <RecentLogsTable
                logs={logs}
                onFilterChange={(newFilters) => setLogFilterParams(newFilters)}
                loading={loading}
              />
            </>
          )}

          {/* Tab 2: Dedicated Incident Desk */}
          {activeTab === 'incidents' && (
            <IncidentList
              incidents={incidents}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
            />
          )}

          {/* Tab 3: Dedicated Live Logs Explorer */}
          {activeTab === 'logs' && (
            <RecentLogsTable
              logs={logs}
              onFilterChange={(newFilters) => setLogFilterParams(newFilters)}
              loading={loading}
            />
          )}
        </div>
      </main>

      {/* Incident Details & AI Root Cause Modal */}
      {selectedIncident && (
        <IncidentDetailsModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onRefreshIncident={refreshData}
        />
      )}

      {/* Threshold Settings Modal */}
      {showThresholdModal && (
        <ThresholdSettingsModal
          onClose={() => setShowThresholdModal(false)}
          onSaveSuccess={refreshData}
        />
      )}
    </div>
  );
}

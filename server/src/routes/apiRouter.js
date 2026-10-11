import { Router } from 'express';
import {
  getHealth,
  getServices,
  simulateServiceFailure,
  resetServiceFailure,
  getLogs,
  getLogById,
  getOverviewMetrics,
  getTimeSeriesMetrics,
  getIncidents,
  getIncidentById,
  analyseIncident,
  getSimulationStatus,
  startSimulation,
  pauseSimulation,
  resetSimulation,
  getThresholds,
  updateThresholds,
} from '../controllers/apiControllers.js';

const router = Router();

// Health
router.get('/health', getHealth);

// Services & Simulation Failure Injection
router.get('/services', getServices);
router.post('/services/:serviceName/simulate-failure', simulateServiceFailure);
router.post('/services/:serviceName/reset', resetServiceFailure);

// Logs
router.get('/logs', getLogs);
router.get('/logs/:id', getLogById);

// Metrics
router.get('/metrics/overview', getOverviewMetrics);
router.get('/metrics/timeseries', getTimeSeriesMetrics);

// Incidents
router.get('/incidents', getIncidents);
router.get('/incidents/:id', getIncidentById);
router.post('/incidents/:id/analyse', analyseIncident);

// Simulation Engine Controls
router.get('/simulation/status', getSimulationStatus);
router.post('/simulation/start', startSimulation);
router.post('/simulation/pause', pauseSimulation);
router.post('/simulation/reset', resetSimulation);

// Threshold Settings
router.get('/thresholds', getThresholds);
router.put('/thresholds', updateThresholds);

export default router;

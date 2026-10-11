import { Log } from '../models/Log.js';
import { Incident } from '../models/Incident.js';
import { ServiceState } from '../models/ServiceState.js';
import { Threshold } from '../models/Threshold.js';
import { defaultSimulationEngine } from '../simulation/trafficGenerator.js';
import { defaultCircuitBreaker } from '../monitoring/circuitBreaker.js';
import { defaultAIService } from '../services/aiService.js';
import { getDBStatus } from '../config/db.js';
import { MOCK_SERVICES } from '../simulation/mockServices.js';

// HEALTH CONTROLLER
export const getHealth = async (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'CodePulse-Lite Backend',
    database: dbStatus,
    simulation: defaultSimulationEngine.getStatus(),
  });
};

// SERVICES CONTROLLER
export const getServices = async (req, res) => {
  try {
    const serviceNames = Object.keys(MOCK_SERVICES);
    const serviceDetails = [];

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // 1 minute window

    for (const name of serviceNames) {
      let stateDoc = await ServiceState.findOne({ service: name });
      if (!stateDoc) {
        stateDoc = await ServiceState.create({ service: name });
      }

      // Compute recent window stats
      const logs = await Log.find({ service: name, timestamp: { $gte: windowStart } });
      const totalReq = logs.length;
      const errorCount = logs.filter(l => l.httpStatus >= 400).length;
      const http500Count = logs.filter(l => l.httpStatus === 500).length;
      const errorRate = totalReq > 0 ? ((errorCount / totalReq) * 100).toFixed(1) : '0.0';

      const latencies = logs.map(l => l.latency).sort((a, b) => a - b);
      const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
      const p95Idx = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies.length > 0 ? latencies[p95Idx] || latencies[latencies.length - 1] : 0;

      const lastIncident = await Incident.findOne({ service: name }).sort({ startTime: -1 });

      serviceDetails.push({
        service: name,
        health: stateDoc.health,
        circuitState: stateDoc.circuitState,
        totalRequests: totalReq,
        errorCount,
        http500Count,
        errorRate: parseFloat(errorRate),
        avgLatency,
        p95Latency,
        consecutiveFailures: stateDoc.consecutiveFailures,
        lastFailureTime: stateDoc.lastFailureTime,
        lastIncidentTime: lastIncident ? lastIncident.startTime : null,
        cooldownExpiry: stateDoc.cooldownExpiry,
        manualFailureMode: stateDoc.manualFailureMode,
      });
    }

    res.json(serviceDetails);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service health status', message: err.message });
  }
};

export const simulateServiceFailure = async (req, res) => {
  const { serviceName } = req.params;
  const { failureType = '500_BURST' } = req.body;

  try {
    await defaultSimulationEngine.triggerFailure(serviceName, failureType);
    res.json({
      success: true,
      message: `Simulated ${failureType} failure triggered on ${serviceName}`,
      serviceName,
      failureType,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const resetServiceFailure = async (req, res) => {
  const { serviceName } = req.params;
  try {
    await defaultSimulationEngine.resetService(serviceName);
    res.json({
      success: true,
      message: `Failure mode cleared for ${serviceName}. Circuit Breaker transitioned to HALF_OPEN for recovery probe.`,
      serviceName,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// LOGS CONTROLLER
export const getLogs = async (req, res) => {
  try {
    const { service, severity, httpStatus, search, limit = 50, page = 1 } = req.query;
    const query = {};

    if (service) query.service = service;
    if (severity) query.severity = severity.toUpperCase();
    if (httpStatus) query.httpStatus = parseInt(httpStatus, 10);
    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }

    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
    const skipNum = ((parseInt(page, 10) || 1) - 1) * limitNum;

    const [logs, total] = await Promise.all([
      Log.find(query).sort({ timestamp: -1 }).skip(skipNum).limit(limitNum),
      Log.countDocuments(query),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page, 10) || 1,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to query logs', message: err.message });
  }
};

export const getLogById = async (req, res) => {
  try {
    const log = await Log.findById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log entry not found' });
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: 'Invalid Log ID format', message: err.message });
  }
};

// METRICS CONTROLLER
export const getOverviewMetrics = async (req, res) => {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // Past 60 seconds

    const recentLogs = await Log.find({ timestamp: { $gte: windowStart } });
    const totalRequests = recentLogs.length;
    const requestsPerSecond = parseFloat((totalRequests / 60).toFixed(1));
    const total500Errors = recentLogs.filter(l => l.httpStatus === 500).length;
    const totalErrors = recentLogs.filter(l => l.httpStatus >= 400).length;
    const errorRate = totalRequests > 0 ? parseFloat(((totalErrors / totalRequests) * 100).toFixed(1)) : 0;

    const latencies = recentLogs.map(l => l.latency).sort((a, b) => a - b);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies.length > 0 ? latencies[p95Idx] || latencies[latencies.length - 1] : 0;

    const states = await ServiceState.find();
    const healthyCount = states.filter(s => s.health === 'HEALTHY').length;
    const degradedCount = states.filter(s => s.health === 'DEGRADED').length;
    const isolatedCount = states.filter(s => s.health === 'ISOLATED').length;
    const activeIncidents = await Incident.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING'] } });

    res.json({
      totalSimulatedRequests: totalRequests,
      requestsPerSecond,
      totalHttp500Errors: total500Errors,
      currentErrorRate: errorRate,
      avgLatency,
      p95Latency,
      healthyServices: healthyCount,
      degradedServices: degradedCount,
      isolatedServices: isolatedCount,
      activeIncidents,
      windowSeconds: 60,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute overview metrics', message: err.message });
  }
};

export const getTimeSeriesMetrics = async (req, res) => {
  try {
    const nowMs = Date.now();
    // Snap to the latest 5-second boundary
    const endBoundary = Math.floor(nowMs / 5000) * 5000;
    const bucketCount = 24; // Past 2 minutes (24 x 5s)
    const startBoundary = endBoundary - (bucketCount - 1) * 5000;

    const logs = await Log.find({
      timestamp: { $gte: new Date(startBoundary), $lte: new Date(endBoundary + 5000) }
    }).sort({ timestamp: 1 });

    const buckets = new Map();
    for (let i = 0; i < bucketCount; i++) {
      const bMs = startBoundary + i * 5000;
      const d = new Date(bMs);
      // Format as local HH:mm:ss for user readability
      const pad = (n) => String(n).padStart(2, '0');
      const timeLabel = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      buckets.set(bMs, {
        time: timeLabel,
        requests: 0,
        errors: 0,
        http500s: 0,
        totalLatency: 0,
      });
    }

    logs.forEach(l => {
      const logMs = new Date(l.timestamp).getTime();
      const bMs = Math.floor(logMs / 5000) * 5000;
      const b = buckets.get(bMs);
      if (b) {
        b.requests += 1;
        if (l.httpStatus >= 400) b.errors += 1;
        if (l.httpStatus === 500) b.http500s += 1;
        b.totalLatency += l.latency;
      }
    });

    const timeseries = Array.from(buckets.values()).map(b => ({
      time: b.time,
      requests: b.requests,
      errors: b.errors,
      http500s: b.http500s,
      errorRate: b.requests > 0 ? parseFloat(((b.errors / b.requests) * 100).toFixed(1)) : 0,
      avgLatency: b.requests > 0 ? Math.round(b.totalLatency / b.requests) : 0,
    }));

    res.json(timeseries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute time series metrics', message: err.message });
  }
};

// INCIDENTS CONTROLLER
export const getIncidents = async (req, res) => {
  try {
    const { status, service } = req.query;
    const query = {};
    if (status) query.status = status.toUpperCase();
    if (service) query.service = service;

    const incidents = await Incident.find(query).sort({ startTime: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incidents', message: err.message });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findOne({ incidentId: req.params.id });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    res.status(400).json({ error: 'Invalid incident ID format', message: err.message });
  }
};

export const analyseIncident = async (req, res) => {
  try {
    const analysis = await defaultAIService.analyseIncident(req.params.id);
    res.json({
      success: true,
      incidentId: req.params.id,
      analysis,
    });
  } catch (err) {
    res.status(500).json({ error: 'AI analysis failed', message: err.message });
  }
};

// SIMULATION CONTROLLER
export const getSimulationStatus = (req, res) => {
  res.json(defaultSimulationEngine.getStatus());
};

export const startSimulation = (req, res) => {
  defaultSimulationEngine.start();
  res.json({ success: true, status: defaultSimulationEngine.getStatus() });
};

export const pauseSimulation = (req, res) => {
  defaultSimulationEngine.pause();
  res.json({ success: true, status: defaultSimulationEngine.getStatus() });
};

export const resetSimulation = async (req, res) => {
  await defaultSimulationEngine.resetAll();
  res.json({ success: true, message: 'Simulation reset complete.' });
};

// THRESHOLDS CONTROLLER
export const getThresholds = async (req, res) => {
  try {
    let t = await Threshold.findOne({ ruleId: 'default_rules' });
    if (!t) t = await Threshold.create({ ruleId: 'default_rules' });
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch thresholds', message: err.message });
  }
};

export const updateThresholds = async (req, res) => {
  try {
    const allowed = [
      'windowSeconds',
      'errorSpikeCount',
      'latencyThresholdMs',
      'errorRatePercentage',
      'circuitBreakerFailureLimit',
      'circuitBreakerCooldownMs',
    ];
    const update = {};
    for (const key of Object.keys(req.body)) {
      if (allowed.includes(key)) {
        update[key] = parseInt(req.body[key], 10);
      }
    }

    const t = await Threshold.findOneAndUpdate(
      { ruleId: 'default_rules' },
      { $set: update },
      { new: true, upsert: true }
    );

    defaultCircuitBreaker.setThresholds(t.circuitBreakerFailureLimit, t.circuitBreakerCooldownMs);

    res.json({ success: true, thresholds: t });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update thresholds', message: err.message });
  }
};

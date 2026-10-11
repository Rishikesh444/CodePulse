import { Log } from '../models/Log.js';
import { Incident } from '../models/Incident.js';
import { ServiceState } from '../models/ServiceState.js';
import { Threshold } from '../models/Threshold.js';
import { defaultCircuitBreaker } from './circuitBreaker.js';

export class MonitoringEngine {
  constructor() {
    this.services = ['Booking Service', 'Search Service', 'Payment Service'];
  }

  /**
   * Fetch current configured thresholds or return defaults
   */
  async getThresholds() {
    let t = await Threshold.findOne({ ruleId: 'default_rules' });
    if (!t) {
      t = await Threshold.create({ ruleId: 'default_rules' });
    }
    return t;
  }

  /**
   * Run monitoring check across all services for the rolling window
   */
  async evaluateAllServices() {
    const thresholdConfig = await this.getThresholds();
    const windowMs = thresholdConfig.windowSeconds * 1000;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const results = [];

    for (const service of this.services) {
      const evaluation = await this.evaluateService(service, windowStart, now, thresholdConfig);
      results.push(evaluation);
    }

    return results;
  }

  /**
   * Evaluate rolling window logs for a single service
   */
  async evaluateService(serviceName, windowStart, now, thresholds) {
    // Query logs in rolling window
    const logs = await Log.find({
      service: serviceName,
      timestamp: { $gte: windowStart, $lte: now },
    });

    const totalCount = logs.length;
    if (totalCount === 0) {
      // Check if open incident should auto-recover if clear
      await this.checkAutoRecovery(serviceName, 0, 0, 0);
      return { service: serviceName, totalLogs: 0, status: 'NO_DATA' };
    }

    const http500Count = logs.filter(l => l.httpStatus === 500).length;
    const errorCount = logs.filter(l => l.httpStatus >= 400).length;
    const avgLatency = Math.round(logs.reduce((sum, l) => sum + l.latency, 0) / totalCount);
    const errorRatePct = Math.round((errorCount / totalCount) * 100);

    const breachedRules = [];

    // Rule 1: HTTP 500 Error Spike
    if (http500Count >= thresholds.errorSpikeCount) {
      breachedRules.push({
        rule: 'HTTP_500_SPIKE',
        title: `HTTP 500 Error Spike in ${serviceName}`,
        severity: 'CRITICAL',
        evidence: {
          observedValue: http500Count,
          threshold: thresholds.errorSpikeCount,
          windowSeconds: thresholds.windowSeconds,
          metric: 'HTTP 500 count',
        },
      });
    } else if (totalCount >= 5 && errorRatePct > thresholds.errorRatePercentage) {
      // Rule 3: Excessive Error Rate (non-500 or general errors)
      breachedRules.push({
        rule: 'EXCESSIVE_ERROR_RATE',
        title: `High Error Rate (${errorRatePct}%) in ${serviceName}`,
        severity: 'HIGH',
        evidence: {
          observedValue: `${errorRatePct}%`,
          threshold: `${thresholds.errorRatePercentage}%`,
          totalRequests: totalCount,
          errorCount,
          windowSeconds: thresholds.windowSeconds,
          metric: 'Error Rate Percentage',
        },
      });
    }

    // Rule 2: High Latency
    if (avgLatency > thresholds.latencyThresholdMs) {
      breachedRules.push({
        rule: 'HIGH_LATENCY',
        title: `High Average Latency in ${serviceName}`,
        severity: 'HIGH',
        evidence: {
          observedValue: avgLatency,
          threshold: thresholds.latencyThresholdMs,
          windowSeconds: thresholds.windowSeconds,
          metric: 'Average response latency (ms)',
        },
      });
    }

    // Process breached rules or check recovery
    if (breachedRules.length > 0) {
      for (const breach of breachedRules) {
        await this.handleIncidentBreach(serviceName, breach, logs);
      }
    } else {
      // Check if an existing open incident can be auto-recovered
      await this.checkAutoRecovery(serviceName, http500Count, avgLatency, errorRatePct);
    }

    return {
      service: serviceName,
      totalCount,
      http500Count,
      avgLatency,
      errorRatePct,
      breachedRulesCount: breachedRules.length,
    };
  }

  /**
   * Incident Creation & Deduplication Logic
   */
  async handleIncidentBreach(serviceName, breach, recentLogs) {
    // Deduplication check: check if an active (OPEN or INVESTIGATING) incident exists for this service
    let activeIncident = await Incident.findOne({
      service: serviceName,
      status: { $in: ['OPEN', 'INVESTIGATING'] },
    });

    const now = new Date();
    const serviceState = await ServiceState.findOne({ service: serviceName });
    const currentCircuit = serviceState ? serviceState.circuitState : 'CLOSED';

    if (activeIncident) {
      // Deduplicate: Update existing active incident
      activeIncident.lastUpdated = now;
      if (breach.severity === 'CRITICAL' && activeIncident.severity !== 'CRITICAL') {
        activeIncident.severity = 'CRITICAL';
        activeIncident.title = breach.title;
        activeIncident.triggeringRule = breach.rule;
      }
      activeIncident.triggeringEvidence = breach.evidence;
      activeIncident.circuitState = currentCircuit;
      activeIncident.timeline.push({
        timestamp: now,
        event: 'THRESHOLD_BREACH_CONTINUED',
        details: { rule: breach.rule, evidence: breach.evidence },
      });
      await activeIncident.save();
      return activeIncident;
    }

    // Create a new incident
    const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const recentLogIds = recentLogs.slice(-10).map(l => l._id);

    const newIncident = await Incident.create({
      incidentId,
      service: serviceName,
      title: breach.title,
      severity: breach.severity,
      triggeringRule: breach.rule,
      triggeringEvidence: breach.evidence,
      startTime: now,
      lastUpdated: now,
      status: 'OPEN',
      circuitState: currentCircuit,
      aiAnalysisStatus: 'NOT_REQUESTED',
      timeline: [
        { timestamp: recentLogs[0]?.timestamp || now, event: 'FIRST_ABNORMAL_EVENT', details: { message: recentLogs[0]?.message } },
        { timestamp: now, event: 'THRESHOLD_BREACH_DETECTED', details: breach.evidence },
        { timestamp: now, event: 'INCIDENT_CREATED', details: { incidentId, title: breach.title } },
      ],
    });

    // Tag logs with incidentId
    if (recentLogIds.length > 0) {
      await Log.updateMany({ _id: { $in: recentLogIds } }, { $set: { incidentId } });
    }

    // Update Service state to DEGRADED if it was HEALTHY
    if (serviceState && serviceState.health === 'HEALTHY') {
      serviceState.health = 'DEGRADED';
      serviceState.lastIncidentTime = now;
      await serviceState.save();
    }

    return newIncident;
  }

  /**
   * Check if conditions cleared to auto-resolve active incidents
   */
  async checkAutoRecovery(serviceName, http500Count, avgLatency, errorRatePct) {
    const activeIncidents = await Incident.find({
      service: serviceName,
      status: { $in: ['OPEN', 'INVESTIGATING'] },
    });

    if (activeIncidents.length === 0) return;

    const serviceState = await ServiceState.findOne({ service: serviceName });
    const isCircuitClosed = serviceState ? serviceState.circuitState === 'CLOSED' : true;

    // Only resolve if circuit breaker is CLOSED and metrics are within normal ranges
    if (isCircuitClosed && http500Count < 2 && avgLatency < 800 && errorRatePct < 10) {
      const now = new Date();
      for (const inc of activeIncidents) {
        inc.status = 'RESOLVED';
        inc.recoveryTime = now;
        inc.lastUpdated = now;
        inc.timeline.push({
          timestamp: now,
          event: 'SERVICE_RECOVERED',
          details: { message: 'Metrics returned to safe thresholds and Circuit Breaker is CLOSED.' },
        });
        await inc.save();
      }

      if (serviceState && serviceState.health !== 'HEALTHY') {
        serviceState.health = 'HEALTHY';
        serviceState.manualFailureMode = false;
        await serviceState.save();
      }
    }
  }
}

export const defaultMonitoringEngine = new MonitoringEngine();

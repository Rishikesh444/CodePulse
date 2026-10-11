import { Log } from '../models/Log.js';
import { ServiceState } from '../models/ServiceState.js';
import { MOCK_SERVICES } from './mockServices.js';
import { defaultCircuitBreaker } from '../monitoring/circuitBreaker.js';
import { defaultMonitoringEngine } from '../monitoring/monitoringEngine.js';

export class TrafficSimulationEngine {
  constructor() {
    this.isRunning = false;
    this.timer = null;
    this.intervalMs = 1500; // Generate traffic batch every 1.5 seconds
    this.failedService = null; // Currently targeted service for failure injection
    this.failureType = null; // '500_BURST', 'LATENCY_SPIKE', 'DB_FAILURE'
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Simulation] Traffic generator started.');
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[Simulation] Traffic generator paused.');
  }

  async triggerFailure(serviceName, failureType = '500_BURST') {
    if (!MOCK_SERVICES[serviceName]) {
      throw new Error(`Invalid service name: ${serviceName}`);
    }
    this.failedService = serviceName;
    this.failureType = failureType;

    // Update ServiceState model flag
    await ServiceState.findOneAndUpdate(
      { service: serviceName },
      { $set: { manualFailureMode: true, health: 'DEGRADED', lastFailureTime: new Date() } },
      { upsert: true }
    );

    console.log(`[Simulation] Triggered ${failureType} failure on ${serviceName}`);
  }

  async resetService(serviceName) {
    if (this.failedService === serviceName) {
      this.failedService = null;
      this.failureType = null;
    }

    await ServiceState.findOneAndUpdate(
      { service: serviceName },
      { $set: { manualFailureMode: false } },
      { upsert: true }
    );

    // Force Circuit Breaker to test HALF_OPEN or CLOSED recovery
    await defaultCircuitBreaker.forceState(serviceName, 'HALF_OPEN', 'DEGRADED');
    console.log(`[Simulation] Reset failure mode for ${serviceName}. Circuit Breaker set to HALF_OPEN for recovery probe.`);
  }

  async resetAll() {
    this.failedService = null;
    this.failureType = null;
    for (const serviceName of Object.keys(MOCK_SERVICES)) {
      await defaultCircuitBreaker.forceState(serviceName, 'CLOSED', 'HEALTHY');
    }
    console.log('[Simulation] Reset all services to HEALTHY / CLOSED.');
  }

  async tick() {
    if (!this.isRunning) return;

    try {
      const services = Object.keys(MOCK_SERVICES);

      for (const serviceName of services) {
        // 1. Check Circuit Breaker state
        const cbCheck = await defaultCircuitBreaker.checkAllowed(serviceName);

        if (!cbCheck.allowed) {
          // Circuit Breaker is OPEN -> Fast fail / Isolated response
          const fastFailLog = new Log({
            service: serviceName,
            timestamp: new Date(),
            severity: 'WARN',
            httpStatus: 503,
            latency: Math.floor(Math.random() * 5) + 1,
            message: `[CIRCUIT_BREAKER_BLOCKED] Request to ${serviceName} rejected by Circuit Breaker (State: OPEN).`,
            errorCategory: 'CIRCUIT_BREAKER_ISOLATED',
            correlationId: `corr-${Math.random().toString(36).substring(2, 9)}`,
          });
          await fastFailLog.save();

          // Record outcome for statistics
          await defaultCircuitBreaker.recordOutcome(serviceName, false, 503);
          continue;
        }

        // 2. Generate simulated request event
        const isTargetedForFailure = this.failedService === serviceName;
        const event = this.generateEvent(serviceName, isTargetedForFailure, cbCheck.state);

        // 3. Save log to database
        const savedLog = await Log.create(event);

        // 4. Record outcome to Circuit Breaker state machine
        const isSuccess = event.httpStatus < 400;
        const cbOutcome = await defaultCircuitBreaker.recordOutcome(serviceName, isSuccess, event.httpStatus);

        if (cbOutcome.event !== 'NO_CHANGE') {
          console.log(`[CircuitBreaker] ${cbOutcome.message}`);
        }
      }

      // 5. Run Monitoring Engine evaluation
      await defaultMonitoringEngine.evaluateAllServices();
    } catch (err) {
      console.error('[Simulation] Error in simulation tick:', err);
    }
  }

  generateEvent(serviceName, isFailing, circuitState) {
    const meta = MOCK_SERVICES[serviceName];
    const endpoint = meta.endpoints[Math.floor(Math.random() * meta.endpoints.length)];
    const correlationId = `corr-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();

    if (isFailing) {
      if (this.failureType === 'LATENCY_SPIKE') {
        const latency = Math.floor(Math.random() * 2500) + 1200; // 1200 - 3700ms
        const isError = Math.random() < 0.4;
        return {
          service: serviceName,
          timestamp: now,
          severity: isError ? 'ERROR' : 'WARN',
          httpStatus: isError ? 500 : 200,
          latency,
          message: isError ? meta.errorMessages[0] : `HIGH_LATENCY: ${endpoint} took ${latency}ms to respond`,
          errorCategory: isError ? 'SERVER_ERROR' : 'LATENCY_DEGRADATION',
          correlationId,
        };
      }

      // Default 500_BURST failure
      const randomErr = meta.errorMessages[Math.floor(Math.random() * meta.errorMessages.length)];
      return {
        service: serviceName,
        timestamp: now,
        severity: 'CRITICAL',
        httpStatus: 500,
        latency: Math.floor(Math.random() * 800) + 400,
        message: `HTTP 500 Internal Server Error in ${endpoint}: ${randomErr}`,
        errorCategory: 'INTERNAL_SERVER_ERROR',
        correlationId,
      };
    }

    // Normal mode request
    const normalLatency = meta.normalLatencies[Math.floor(Math.random() * meta.normalLatencies.length)] + Math.floor(Math.random() * 20);
    const rand = Math.random();

    if (rand > 0.96) {
      // 4% noncritical 400/404 errors
      const status = Math.random() > 0.5 ? 400 : 404;
      return {
        service: serviceName,
        timestamp: now,
        severity: 'WARN',
        httpStatus: status,
        latency: normalLatency,
        message: status === 400 ? `Bad Request: Invalid query parameter on ${endpoint}` : `Resource Not Found: ${endpoint}`,
        errorCategory: 'CLIENT_ERROR',
        correlationId,
      };
    }

    // 96% Successful request
    return {
      service: serviceName,
      timestamp: now,
      severity: 'INFO',
      httpStatus: 200,
      latency: normalLatency,
      message: `GET ${endpoint} 200 OK`,
      errorCategory: null,
      correlationId,
    };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      failedService: this.failedService,
      failureType: this.failureType,
      intervalMs: this.intervalMs,
    };
  }
}

export const defaultSimulationEngine = new TrafficSimulationEngine();

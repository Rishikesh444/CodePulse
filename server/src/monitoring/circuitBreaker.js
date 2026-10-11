import { ServiceState } from '../models/ServiceState.js';

export class CircuitBreakerEngine {
  constructor(options = {}) {
    this.failureLimit = options.failureLimit || 5;
    this.cooldownMs = options.cooldownMs || 10000; // 10 seconds
  }

  setThresholds(limit, cooldownMs) {
    if (limit) this.failureLimit = limit;
    if (cooldownMs) this.cooldownMs = cooldownMs;
  }

  /**
   * Check if request should be allowed for a given service
   * @param {string} serviceName 
   * @returns {Promise<{ allowed: boolean, state: string, reason?: string }>}
   */
  async checkAllowed(serviceName) {
    let stateDoc = await ServiceState.findOne({ service: serviceName });
    if (!stateDoc) {
      stateDoc = await ServiceState.create({
        service: serviceName,
        health: 'HEALTHY',
        circuitState: 'CLOSED',
      });
    }

    const now = new Date();

    if (stateDoc.circuitState === 'CLOSED') {
      return { allowed: true, state: 'CLOSED' };
    }

    if (stateDoc.circuitState === 'OPEN') {
      // Check if cooldown has expired
      if (stateDoc.cooldownExpiry && now >= stateDoc.cooldownExpiry) {
        // Transition to HALF_OPEN
        stateDoc.circuitState = 'HALF_OPEN';
        stateDoc.health = 'DEGRADED';
        stateDoc.lastStateChange = now;
        await stateDoc.save();

        return {
          allowed: true,
          state: 'HALF_OPEN',
          reason: 'Cooldown expired. Service is in HALF_OPEN state testing recovery with probe traffic.',
        };
      }

      return {
        allowed: false,
        state: 'OPEN',
        reason: `Circuit Breaker is OPEN. Requests blocked until cooldown expires at ${stateDoc.cooldownExpiry?.toISOString()}`,
      };
    }

    if (stateDoc.circuitState === 'HALF_OPEN') {
      // Allow probe request
      return { allowed: true, state: 'HALF_OPEN' };
    }

    return { allowed: true, state: 'CLOSED' };
  }

  /**
   * Record a request outcome for circuit breaker tracking
   * @param {string} serviceName 
   * @param {boolean} isSuccess 
   * @param {number} httpStatus 
   */
  async recordOutcome(serviceName, isSuccess, httpStatus) {
    let stateDoc = await ServiceState.findOne({ service: serviceName });
    if (!stateDoc) {
      stateDoc = await ServiceState.create({ service: serviceName });
    }

    const now = new Date();
    stateDoc.totalRequests += 1;

    if (isSuccess) {
      if (stateDoc.circuitState === 'HALF_OPEN') {
        // Successful probe request in HALF_OPEN -> Close circuit & mark HEALTHY
        stateDoc.circuitState = 'CLOSED';
        stateDoc.health = 'HEALTHY';
        stateDoc.consecutiveFailures = 0;
        stateDoc.lastStateChange = now;
        stateDoc.manualFailureMode = false;
        await stateDoc.save();

        return {
          event: 'CIRCUIT_CLOSED',
          service: serviceName,
          state: 'CLOSED',
          message: `Service ${serviceName} recovered! Circuit Breaker returned to CLOSED.`,
        };
      } else if (stateDoc.circuitState === 'CLOSED') {
        // Reset failure counter on success
        if (stateDoc.consecutiveFailures > 0) {
          stateDoc.consecutiveFailures = 0;
          await stateDoc.save();
        }
      }
    } else {
      // Failure occurred (e.g., 500 error or timeout)
      stateDoc.totalErrors += 1;
      stateDoc.consecutiveFailures += 1;
      stateDoc.lastFailureTime = now;

      if (stateDoc.circuitState === 'HALF_OPEN') {
        // Failed probe request in HALF_OPEN -> Re-open circuit immediately
        stateDoc.circuitState = 'OPEN';
        stateDoc.health = 'ISOLATED';
        stateDoc.cooldownExpiry = new Date(now.getTime() + this.cooldownMs);
        stateDoc.lastStateChange = now;
        await stateDoc.save();

        return {
          event: 'CIRCUIT_REOPENED',
          service: serviceName,
          state: 'OPEN',
          message: `Probe request failed in HALF_OPEN. Circuit Breaker reopened for ${serviceName}.`,
        };
      }

      if (stateDoc.circuitState === 'CLOSED' && stateDoc.consecutiveFailures >= this.failureLimit) {
        // Consecutive failure limit reached -> Open circuit
        stateDoc.circuitState = 'OPEN';
        stateDoc.health = 'ISOLATED';
        stateDoc.cooldownExpiry = new Date(now.getTime() + this.cooldownMs);
        stateDoc.lastStateChange = now;
        await stateDoc.save();

        return {
          event: 'CIRCUIT_OPENED',
          service: serviceName,
          state: 'OPEN',
          message: `Circuit Breaker TRIP! ${serviceName} reached ${stateDoc.consecutiveFailures} consecutive failures. Circuit OPENED (ISOLATED).`,
        };
      }

      await stateDoc.save();
    }

    return { event: 'NO_CHANGE', service: serviceName, state: stateDoc.circuitState };
  }

  /**
   * Force update state (for simulation testing / reset)
   */
  async forceState(serviceName, circuitState, health) {
    const update = {
      circuitState,
      health,
      lastStateChange: new Date(),
    };
    if (circuitState === 'CLOSED') {
      update.consecutiveFailures = 0;
      update.manualFailureMode = false;
      update.cooldownExpiry = null;
    } else if (circuitState === 'OPEN') {
      update.cooldownExpiry = new Date(Date.now() + this.cooldownMs);
    }
    await ServiceState.findOneAndUpdate(
      { service: serviceName },
      { $set: update },
      { upsert: true, new: true }
    );
  }
}

export const defaultCircuitBreaker = new CircuitBreakerEngine();

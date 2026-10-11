import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { MonitoringEngine } from '../src/monitoring/monitoringEngine.js';
import { Log } from '../src/models/Log.js';
import { Incident } from '../src/models/Incident.js';
import { Threshold } from '../src/models/Threshold.js';
import { ServiceState } from '../src/models/ServiceState.js';
import { connectTestDB, disconnectTestDB } from './testHelper.js';

describe('MonitoringEngine Anomaly Detection & Deduplication', () => {
  let engine;

  beforeAll(async () => {
    await connectTestDB('me');
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await Log.deleteMany({});
    await Incident.deleteMany({});
    await ServiceState.deleteMany({});
    await Threshold.deleteMany({});
    engine = new MonitoringEngine();

    // Create thresholds: 5 HTTP 500 errors in 10 seconds -> Spike
    await Threshold.create({
      ruleId: 'default_rules',
      windowSeconds: 10,
      errorSpikeCount: 5,
      latencyThresholdMs: 1000,
      errorRatePercentage: 20,
    });
  });

  it('1. Does not trigger incident when HTTP 500 count is below threshold', async () => {
    const service = 'Booking Service';
    const now = new Date();

    // Insert 4 HTTP 500 errors (below threshold of 5)
    for (let i = 0; i < 4; i++) {
      await Log.create({
        service,
        timestamp: now,
        severity: 'ERROR',
        httpStatus: 500,
        latency: 100,
        message: 'Internal Error',
        correlationId: `c-${i}`,
      });
    }

    const config = await engine.getThresholds();
    const result = await engine.evaluateService(service, new Date(now - 10000), now, config);

    expect(result.http500Count).toBe(4);
    expect(result.breachedRulesCount).toBe(0);

    const incidents = await Incident.find({ service });
    expect(incidents.length).toBe(0);
  });

  it('2. Triggers CRITICAL incident when HTTP 500 threshold is reached', async () => {
    const service = 'Booking Service';
    const now = new Date();

    // Insert 5 HTTP 500 errors (reaches threshold of 5)
    for (let i = 0; i < 5; i++) {
      await Log.create({
        service,
        timestamp: now,
        severity: 'CRITICAL',
        httpStatus: 500,
        latency: 150,
        message: 'Database Connection Error',
        correlationId: `c-${i}`,
      });
    }

    const config = await engine.getThresholds();
    const result = await engine.evaluateService(service, new Date(now - 10000), now, config);

    expect(result.http500Count).toBe(5);
    expect(result.breachedRulesCount).toBe(1);

    const incidents = await Incident.find({ service });
    expect(incidents.length).toBe(1);
    expect(incidents[0].triggeringRule).toBe('HTTP_500_SPIKE');
    expect(incidents[0].status).toBe('OPEN');
  });

  it('3. Deduplicates incidents for ongoing breach conditions', async () => {
    const service = 'Booking Service';
    const now = new Date();
    const config = await engine.getThresholds();

    // Insert 6 errors
    for (let i = 0; i < 6; i++) {
      await Log.create({
        service,
        timestamp: now,
        severity: 'CRITICAL',
        httpStatus: 500,
        latency: 150,
        message: 'Database Error',
        correlationId: `c-${i}`,
      });
    }

    // First evaluation -> Creates incident #1
    await engine.evaluateService(service, new Date(now - 10000), now, config);
    let incidents = await Incident.find({ service });
    expect(incidents.length).toBe(1);
    const firstIncId = incidents[0].incidentId;

    // Insert 2 more errors in same window
    for (let i = 6; i < 8; i++) {
      await Log.create({
        service,
        timestamp: now,
        severity: 'CRITICAL',
        httpStatus: 500,
        latency: 150,
        message: 'Database Error',
        correlationId: `c-${i}`,
      });
    }

    // Second evaluation -> Should DEDUPLICATE (update incident #1 instead of creating incident #2)
    await engine.evaluateService(service, new Date(now - 10000), now, config);
    incidents = await Incident.find({ service });

    expect(incidents.length).toBe(1);
    expect(incidents[0].incidentId).toBe(firstIncId);
    expect(incidents[0].timeline.length).toBeGreaterThan(3);
  });

  it('4. High latency breaches trigger HIGH latency incident', async () => {
    const service = 'Search Service';
    const now = new Date();

    // Insert logs with average latency 2200ms (> 1000ms threshold)
    for (let i = 0; i < 5; i++) {
      await Log.create({
        service,
        timestamp: now,
        severity: 'WARN',
        httpStatus: 200,
        latency: 2200,
        message: 'Search slow',
        correlationId: `c-${i}`,
      });
    }

    const config = await engine.getThresholds();
    const result = await engine.evaluateService(service, new Date(now - 10000), now, config);

    expect(result.avgLatency).toBe(2200);
    expect(result.breachedRulesCount).toBe(1);

    const incidents = await Incident.find({ service, triggeringRule: 'HIGH_LATENCY' });
    expect(incidents.length).toBe(1);
  });
});

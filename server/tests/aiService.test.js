import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { AIService } from '../src/services/aiService.js';
import { Incident } from '../src/models/Incident.js';
import { Log } from '../src/models/Log.js';
import { connectTestDB, disconnectTestDB } from './testHelper.js';

describe('AIService & Fallback Debugging Diagnostics', () => {
  let aiService;

  beforeAll(async () => {
    await connectTestDB('ai');
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await Incident.deleteMany({});
    await Log.deleteMany({});
    aiService = new AIService();
  });

  it('1. Generates rule-based fallback diagnosis when AI_API_KEY is absent', async () => {
    delete process.env.AI_API_KEY;

    const incident = await Incident.create({
      incidentId: 'INC-TEST-001',
      service: 'Payment Service',
      title: 'HTTP 500 Error Spike in Payment Service',
      severity: 'CRITICAL',
      triggeringRule: 'HTTP_500_SPIKE',
      triggeringEvidence: { observedValue: 8, threshold: 5 },
      circuitState: 'OPEN',
      status: 'OPEN',
    });

    await Log.create({
      service: 'Payment Service',
      incidentId: 'INC-TEST-001',
      httpStatus: 500,
      severity: 'CRITICAL',
      latency: 450,
      message: 'Payment Gateway Timeout',
      correlationId: 'c-test-1',
    });

    const analysis = await aiService.analyseIncident('INC-TEST-001');

    expect(analysis).toBeDefined();
    expect(analysis.isFallback).toBe(true);
    expect(analysis.incidentSummary).toContain('Payment Service');
    expect(analysis.probableCauses.length).toBeGreaterThan(0);
    expect(analysis.recommendedDebuggingSteps.length).toBeGreaterThan(0);
    expect(analysis.suggestedRemediation.length).toBeGreaterThan(0);
    expect(analysis.confidence.level).toContain('Fallback');

    const updatedIncident = await Incident.findOne({ incidentId: 'INC-TEST-001' });
    expect(updatedIncident.aiAnalysisStatus).toBe('FALLBACK');
  });
});

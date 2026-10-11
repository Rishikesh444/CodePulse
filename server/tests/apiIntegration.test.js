import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { Log } from '../src/models/Log.js';
import { Incident } from '../src/models/Incident.js';
import { connectTestDB, disconnectTestDB } from './testHelper.js';

describe('REST API Endpoints Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDB('api');
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('GET /api/health returns ok status and DB info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBeDefined();
  });

  it('GET /api/services returns mock services health info', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
    expect(res.body.some(s => s.service === 'Booking Service')).toBe(true);
  });

  it('POST /api/services/:name/simulate-failure triggers failure mode', async () => {
    const res = await request(app)
      .post('/api/services/Booking%20Service/simulate-failure')
      .send({ failureType: '500_BURST' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.serviceName).toBe('Booking Service');
  });

  it('POST /api/services/:name/reset resets failure mode', async () => {
    const res = await request(app).post('/api/services/Booking%20Service/reset');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/logs returns paginated logs', async () => {
    await Log.create({
      service: 'Payment Service',
      httpStatus: 200,
      severity: 'INFO',
      latency: 80,
      message: 'Payment verified',
      correlationId: 'c-api-test',
    });

    const res = await request(app).get('/api/logs?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.logs).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.logs.length).toBeGreaterThan(0);
  });

  it('GET /api/metrics/overview returns summary statistics', async () => {
    const res = await request(app).get('/api/metrics/overview');
    expect(res.status).toBe(200);
    expect(res.body.totalSimulatedRequests).toBeDefined();
    expect(res.body.currentErrorRate).toBeDefined();
    expect(res.body.healthyServices).toBeDefined();
  });

  it('GET /api/thresholds and PUT /api/thresholds reads and updates limits', async () => {
    const getRes = await request(app).get('/api/thresholds');
    expect(getRes.status).toBe(200);
    expect(getRes.body.errorSpikeCount).toBeDefined();

    const putRes = await request(app)
      .put('/api/thresholds')
      .send({ errorSpikeCount: 7, latencyThresholdMs: 1500 });
    expect(putRes.status).toBe(200);
    expect(putRes.body.thresholds.errorSpikeCount).toBe(7);
    expect(putRes.body.thresholds.latencyThresholdMs).toBe(1500);
  });

  it('POST /api/incidents/:id/analyse triggers AI analysis or fallback diagnosis', async () => {
    const inc = await Incident.create({
      incidentId: 'INC-INTEG-01',
      service: 'Search Service',
      title: 'ElasticSearch Latency Breach',
      triggeringRule: 'HIGH_LATENCY',
      severity: 'HIGH',
    });

    const res = await request(app).post(`/api/incidents/${inc.incidentId}/analyse`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.analysis).toBeDefined();
    expect(res.body.analysis.incidentSummary).toBeDefined();
  });
});

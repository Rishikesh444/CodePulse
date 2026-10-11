import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { CircuitBreakerEngine } from '../src/monitoring/circuitBreaker.js';
import { ServiceState } from '../src/models/ServiceState.js';
import { connectTestDB, disconnectTestDB } from './testHelper.js';

describe('CircuitBreakerEngine State Machine', () => {
  let cb;

  beforeAll(async () => {
    await connectTestDB('cb');
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await ServiceState.deleteMany({});
    cb = new CircuitBreakerEngine({ failureLimit: 3, cooldownMs: 100 }); // Fast 100ms cooldown for testing
  });

  it('1. Start in CLOSED state allowing requests', async () => {
    const res = await cb.checkAllowed('Payment Service');
    expect(res.allowed).toBe(true);
    expect(res.state).toBe('CLOSED');
  });

  it('2. Transition from CLOSED to OPEN after failure limit reached', async () => {
    const service = 'Payment Service';

    // 2 consecutive failures -> still CLOSED
    await cb.recordOutcome(service, false, 500);
    await cb.recordOutcome(service, false, 500);
    let state = await cb.checkAllowed(service);
    expect(state.allowed).toBe(true);
    expect(state.state).toBe('CLOSED');

    // 3rd failure -> TRIPS circuit breaker to OPEN
    const outcome = await cb.recordOutcome(service, false, 500);
    expect(outcome.event).toBe('CIRCUIT_OPENED');
    expect(outcome.state).toBe('OPEN');

    // Subsequent request is BLOCKED
    state = await cb.checkAllowed(service);
    expect(state.allowed).toBe(false);
    expect(state.state).toBe('OPEN');
  });

  it('3. Transition from OPEN to HALF_OPEN after cooldown expires', async () => {
    const service = 'Booking Service';

    // Trip circuit
    await cb.recordOutcome(service, false, 500);
    await cb.recordOutcome(service, false, 500);
    await cb.recordOutcome(service, false, 500);

    // Wait 150ms for 100ms cooldown to expire
    await new Promise(r => setTimeout(r, 150));

    const state = await cb.checkAllowed(service);
    expect(state.allowed).toBe(true);
    expect(state.state).toBe('HALF_OPEN');
  });

  it('4. Probe request SUCCESS in HALF_OPEN recovers circuit to CLOSED', async () => {
    const service = 'Search Service';

    // Trip circuit
    await cb.recordOutcome(service, false, 500);
    await cb.recordOutcome(service, false, 500);
    await cb.recordOutcome(service, false, 500);

    // Wait cooldown
    await new Promise(r => setTimeout(r, 150));
    await cb.checkAllowed(service); // Moves to HALF_OPEN

    // Successful probe
    const outcome = await cb.recordOutcome(service, true, 200);
    expect(outcome.event).toBe('CIRCUIT_CLOSED');
    expect(outcome.state).toBe('CLOSED');

    const state = await cb.checkAllowed(service);
    expect(state.allowed).toBe(true);
    expect(state.state).toBe('CLOSED');
  });

  it('5. Probe request FAILURE in HALF_OPEN re-opens circuit to OPEN', async () => {
    const service = 'Booking Service';

    // Trip circuit
    await cb.recordOutcome(service, false, 500);
    await cb.recordOutcome(service, false, 500);
    await cb.recordOutcome(service, false, 500);

    // Wait cooldown
    await new Promise(r => setTimeout(r, 150));
    await cb.checkAllowed(service); // Moves to HALF_OPEN

    // Failed probe
    const outcome = await cb.recordOutcome(service, false, 500);
    expect(outcome.event).toBe('CIRCUIT_REOPENED');
    expect(outcome.state).toBe('OPEN');

    const state = await cb.checkAllowed(service);
    expect(state.allowed).toBe(false);
    expect(state.state).toBe('OPEN');
  });
});

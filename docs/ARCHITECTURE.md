# CodePulse-Lite: Architecture & Engineering Design

## 1. System Overview

**CodePulse-Lite** is a developer-centric API health monitoring, automated incident detection, circuit-breaker isolation, and AI-assisted debugging platform. It simulates microservice traffic, detects anomalies in real-time using rolling-window telemetry, enforces circuit-breaker service isolation, and generates contextual root-cause debugging hypotheses using an LLM (with transparent rule-based fallback).

```
                      ┌─────────────────────────────────────────┐
                      │          React + Vite Frontend          │
                      │  (Charts, Topology, Incidents, Logs)    │
                      └────────────────────▲────────────────────┘
                                           │ HTTP REST / Polling (2.5s)
                      ┌────────────────────▼────────────────────┐
                      │       Node.js / Express Backend         │
                      └───────┬─────────────────────────┬───────┘
                              │                         │
            ┌─────────────────▼────────┐       ┌────────▼────────────────┐
            │  Traffic Simulator       │       │  Monitoring Engine      │
            │  - Booking Service       │       │  - Rolling Time Windows │
            │  - Search Service        │       │  - Deduplication        │
            │  - Payment Service       │       │  - Threshold Breaches   │
            │  - Failure Injection     │       │  - Auto-Recovery Checks │
            └─────────────────┬────────┘       └────────┬────────────────┘
                              │                         │
            ┌─────────────────▼─────────────────────────▼────────────────┐
            │             Circuit Breaker State Machine                  │
            │       [CLOSED] ───(Failures)───► [OPEN (Isolated)]         │
            │          ▲                             │                   │
            │          │                             │ (Cooldown)        │
            │          │                             ▼                   │
            │       [Probe OK] ◄────────────── [HALF_OPEN]               │
            └─────────────────┬──────────────────────────────────────────┘
                              │
            ┌─────────────────▼────────┐       ┌─────────────────────────┐
            │  MongoDB / Memory Server │       │  AI Debugging Assistant │
            │  - Log collection        │       │  - Structured Evidence  │
            │  - Incident model        │       │  - Live LLM / Fallback  │
            │  - ServiceState model    │       │  - Safe Prompt Envelope │
            └──────────────────────────┘       └─────────────────────────┘
```

---

## 2. Deep Dive: Key Engineering Decisions

### 1. Why MERN Stack Was Selected
- **Asynchronous Event Loop**: Node.js is uniquely suited for high-frequency simulated metric processing, timer loops, and non-blocking I/O.
- **Unified TypeScript/JavaScript**: Shared models, JSON payloads, and mathematical formatting between backend metric calculations and frontend rendering.
- **Developer Productivity**: React provides reactive component tree updates for real-time charts and topology state changes without full-page reloads.

### 2. Why Logs Are Stored in MongoDB
- **Document Model**: Application log entries are semi-structured; different endpoints and error types produce differing metadata fields (e.g., `errorCategory`, `correlationId`, `incidentId`).
- **High Ingestion Throughput**: MongoDB accommodates append-heavy write patterns with compound indexes (`{ service: 1, timestamp: -1 }` and `{ timestamp: -1 }`).
- **Time-Bounded Queries**: Rolling window slicing (`$gte: windowStart`) is executed directly via indexed B-Tree range lookups.

### 3. How the Rolling-Window Algorithm Works
- Anomaly detection must never compare against all historical logs, or an error that happened 2 hours ago would contaminate current health.
- When evaluating a service:
  $$\text{windowStart} = \text{currentTime} - (\text{windowSeconds} \times 1000)$$
- Only documents with $\text{timestamp} \ge \text{windowStart}$ are retrieved.
- This creates an exact sliding observation window (default: 10 seconds), reflecting true real-time service behavior.

### 4. How Error Rate Is Calculated
- The request population is defined as the total number of HTTP requests processed by that specific service inside the active rolling window:
  $$\text{Error Rate (\%)} = \left( \frac{\text{HTTP } \ge 400 \text{ count}}{\text{Total Requests in Window}} \right) \times 100$$
- If fewer than 5 requests occurred in the window, rate-based alarms are suppressed to avoid false positives on small sample sizes.

### 5. Circuit Breaker State Machine Mechanics
- **`CLOSED`**: Healthy state. All simulated traffic flows normally. Consecutive failures increment on errors and reset to 0 on successes.
- **`OPEN`**: Tripped when consecutive failures $\ge$ `circuitBreakerFailureLimit` (default: 5). Traffic to the failing service is immediately isolated. Requests fast-fail with HTTP 503 and minimal latency (<5ms), sparing backend resources.
- **`HALF_OPEN`**: After `circuitBreakerCooldownMs` (default: 10s) expires, the circuit transitions to `HALF_OPEN`. It permits a single probe request:
  - If the probe succeeds (200 OK) $\rightarrow$ Circuit transitions to **`CLOSED`** (Service Recovered).
  - If the probe fails (500 Error) $\rightarrow$ Circuit re-trips to **`OPEN`** and restarts cooldown.

### 6. Why Incident Deduplication Is Critical
- Without deduplication, a continuous 10-second failure burst generating 30 errors would spawn 30 redundant critical incidents in the database, causing alarm fatigue.
- CodePulse-Lite checks for existing active (`OPEN` or `INVESTIGATING`) incidents for the affected service.
- If an active incident exists, it updates the observed evidence, updates `lastUpdated`, and appends to the chronological timeline rather than creating a duplicate document.

### 7. How the AI Prompt Uses Evidence
- The LLM prompt is contextually grounded with structured facts: service name, failure type, exact observed value vs configured threshold, circuit breaker state, and the latest 15 correlated error log traces.
- Prompt directives strictly prohibit fabricating root causes, claiming to inspect unprovided source files, or executing unverified scripts.
- The model outputs structured JSON according to a strict schema.

### 8. Handling Incorrect or Missing AI Responses
- If the AI API key is omitted, times out (>8s), or returns malformed output, the system triggers the **Transparent Rule-Based Fallback Engine**.
- Fallbacks are clearly labeled (`isFallback: true`, `badge-degraded`), stating the exact diagnostic heuristics and limitations without fabricating an LLM call.

### 9. Automated Testing Strategy
- Automated unit and integration tests are executed using Vitest and MongoMemoryServer.
- Tested scenarios: Circuit breaker state machine transitions (`CLOSED` $\rightarrow$ `OPEN` $\rightarrow$ `HALF_OPEN` $\rightarrow$ `CLOSED` and `HALF_OPEN` $\rightarrow$ `OPEN`), rolling-window evaluation, incident deduplication, AI fallback persistence, and REST endpoints.

### 10. Requirements for Production Deployment
1. Replace in-memory simulation with real OpenTelemetry / Prometheus log ingestion agents.
2. Ingest logs via Apache Kafka or AWS Kinesis to buffer multi-thousand log bursts before persistence.
3. Replace polling with Server-Sent Events (SSE) or WebSockets for sub-second UI updates.
4. Integrate distributed tracing (Jaeger / OpenTelemetry Span Context) for end-to-end request tracking across microservices.

# CodePulse-Lite: Hackathon Presentation & Demonstration Guide

## 1. Executive Summary & Pitch

### The Problem Statement
In distributed microservice environments (such as high-volume booking and reservation platforms), cascading service failures occur rapidly. When a downstream dependency experiences thread starvation or database connection pool exhaustion, error spikes cascade upward, degrading other systems. Engineers often suffer from alarm fatigue, slow manual triage, and delayed incident mitigation.

### Target Users
- Site Reliability Engineers (SREs)
- DevOps & Platform Engineering Teams
- On-call Backend Engineers

### Why It Matters
Automating the bridge between **Anomaly Detection**, **Autonomous Circuit Breaker Isolation**, and **Contextual AI Diagnosis** drastically cuts Mean Time to Detect (MTTD) and Mean Time to Mitigate (MTTM), preventing catastrophic cascading outages.

---

## 2. 2-Minute Demonstration Script

Use this exact chronological script during a rapid hackathon judging session:

1. **[0:00 - 0:20] Open Dashboard & Normal Baseline**:
   - Point to the dashboard header: *"This is CodePulse-Lite, an automated API health monitoring and SRE incident response platform."*
   - Show the 3 simulated microservices (`Booking Service`, `Search Service`, `Payment Service`).
   - Highlight the green status badges: All services are `HEALTHY`, circuit breakers are `CLOSED`, throughput is ~2.5 requests/sec, and error rate is under 2%.

2. **[0:20 - 0:45] Inject Chaos & Observe Detection**:
   - On the **Booking Service** card, click **Inject Chaos** (Trigger HTTP 500 Spike).
   - Watch the charts update in real time: The HTTP error rate spikes to 100%, and 500 errors rise sharply.
   - Point to the **Incident Desk**: Explain how the rolling-window monitoring engine breached the 5-error threshold in a 10s window and triggered a `CRITICAL` incident.

3. **[0:45 - 1:15] Circuit Breaker Autonomous Isolation**:
   - Point to the Booking Service card: The Circuit Breaker tripped from `CLOSED` to **`OPEN (ISOLATED)`**.
   - Show the logs table: Incoming requests to Booking Service are now fast-failed with HTTP 503 (`[CIRCUIT_BREAKER_BLOCKED]`), with sub-5ms latency, protecting backend resources.

4. **[1:15 - 1:40] AI Root-Cause Debugging**:
   - Click **Analyze & Debug** on the incident.
   - The AI Assistant synthesizes the exact facts, observed metrics, and recent error log traces.
   - Show the structured report: Observed facts, probable cause hypotheses (database pool exhaustion), recommended investigation steps, and suggested remediations (with transparent confidence statement).

5. **[1:40 - 2:00] Controlled Recovery Workflow**:
   - Click **Reset & Trigger Recovery Probe** on Booking Service.
   - The circuit breaker transitions to **`HALF_OPEN`**, permitting a single probe request.
   - The probe succeeds $\rightarrow$ Circuit breaker closes $\rightarrow$ Service status returns to `HEALTHY` $\rightarrow$ Incident auto-resolves.
   - Conclude: *"In under 2 minutes, we demonstrated full detection, automated isolation, AI root-cause diagnosis, and verified recovery."*

---

## 3. 5-Minute Technical Review Walkthrough

For deep technical questions or architecture rounds:

1. **Telemetry & Sliding Windows (Min 1)**: Explain that error counts are computed over an indexed rolling window ($t - \Delta t$), preventing stale historical logs from skewing current health.
2. **Incident Deduplication (Min 2)**: Walk through `monitoringEngine.js`. Explain how consecutive breach ticks update existing incidents rather than spamming duplicate records.
3. **State Machine Integrity (Min 3)**: Walk through `circuitBreaker.js`. Explain the three states (`CLOSED`, `OPEN`, `HALF_OPEN`), cooldown tracking, and automated probe testing.
4. **AI Safety & Structured Prompting (Min 4)**: Explain the prompt envelope in `aiService.js`. Emphasize that logs are untrusted data, AI cannot execute code directly, and transparent rule-based fallback guarantees zero downtime even if API keys or rate limits fail.
5. **Testing & Code Quality (Min 5)**: Highlight our 18 automated unit and integration tests passing in Vitest with MongoMemoryServer.

---

## 4. Technical Review Q&A Preparation

### Q1: Why did you choose MERN instead of Python/FastAPI or Go?
**Answer**: Node.js has a non-blocking asynchronous event loop ideal for simulated multi-service concurrent traffic loops and timers. React provides reactive state rendering for real-time dashboards and charts without full-page reloads. Having JavaScript across the entire stack enabled rapid model and schema sharing.

### Q2: Why store logs in MongoDB rather than Elasticsearch or PostgreSQL?
**Answer**: MongoDB's document model naturally accommodates polymorphic log payloads where different services emit varying error metadata. Compound indexing on `{ service: 1, timestamp: -1 }` allows millisecond-level range scans for rolling time windows without relational schema friction.

### Q3: How does your rolling-window algorithm prevent stale error bias?
**Answer**: Every evaluation query slices exclusively between `now - windowSeconds * 1000` and `now`. Once an error burst passes outside that time horizon, it naturally falls out of the sliding calculation, enabling automated recovery detection.

### Q4: How is error rate computed?
**Answer**: Error rate is computed as `(HTTP >= 400 count) / (total requests in rolling window) * 100`. To prevent false positives from statistical noise on low traffic, rate-based alarms require a minimum of 5 requests in the window.

### Q5: Explain your Circuit Breaker state machine transitions.
**Answer**: In `CLOSED`, all requests are permitted; failures increment a counter. When consecutive failures reach the threshold (5), the breaker transitions to `OPEN`, immediately blocking requests with HTTP 503 fast-fails. When the cooldown timer expires, it enters `HALF_OPEN`, allowing a single probe request. If the probe succeeds, it returns to `CLOSED`; if the probe fails, it re-opens and restarts cooldown.

### Q6: Why is incident deduplication necessary?
**Answer**: When an outage occurs, high-frequency traffic generates dozens of errors per second. Without deduplication, every simulation tick would create a new incident in MongoDB, causing database bloat and severe alert fatigue for on-call engineers. Our engine identifies existing active incidents for that service and appends timeline events to the open incident.

### Q7: How does your AI prompt structure evidence?
**Answer**: The prompt supplies structured facts: service name, triggering rule, observed metric vs threshold, circuit state, and the latest 15 error log entries. The prompt instructs the model to distinguish observed facts from hypotheses, assign confidence ratings, and output strict JSON according to our schema.

### Q8: How does the system handle AI hallucination or API timeouts?
**Answer**: We implement an 8-second request timeout controller (`AbortController`). If the LLM provider fails, times out, or has no configured API key, our transparent rule-based heuristic fallback engine instantly generates a deterministic diagnostic report labeled as `isFallback: true`, ensuring the application never crashes.

### Q9: How did you test the backend and state machines?
**Answer**: We wrote 18 automated tests in Vitest using `MongoMemoryServer` and `supertest`. We explicitly tested all circuit breaker state transitions, rolling-window threshold breaches, incident deduplication, AI fallback persistence, and REST API routes without external network dependencies.

### Q10: What would you change to take this system into production?
**Answer**:
1. Replace simulated traffic with an OpenTelemetry agent collector.
2. Buffer log ingestion using Apache Kafka or AWS Kinesis.
3. Switch client communication from polling to Server-Sent Events (SSE) or WebSockets.
4. Integrate distributed tracing (W3C traceparent headers) across microservices.

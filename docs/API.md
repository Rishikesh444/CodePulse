# CodePulse-Lite: REST API Specification

Base URL: `/api`

All responses return standard `application/json` with appropriate HTTP status codes.

---

## 1. System & Health

### `GET /api/health`
Returns system status, active database state, and simulation status.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-11T08:00:00.000Z",
  "service": "CodePulse-Lite Backend",
  "database": {
    "state": "connected",
    "isInMemory": false,
    "dbName": "codepulse_lite"
  },
  "simulation": {
    "isRunning": true,
    "failedService": null,
    "intervalMs": 1500
  }
}
```

---

## 2. Microservices Topology & Failure Injection

### `GET /api/services`
Retrieves real-time telemetry and circuit breaker state for all services (`Booking Service`, `Search Service`, `Payment Service`).
- **Response `200 OK`**:
```json
[
  {
    "service": "Booking Service",
    "health": "HEALTHY",
    "circuitState": "CLOSED",
    "totalRequests": 48,
    "errorCount": 1,
    "http500Count": 0,
    "errorRate": 2.1,
    "avgLatency": 85,
    "p95Latency": 140,
    "consecutiveFailures": 0,
    "manualFailureMode": false
  }
]
```

### `POST /api/services/:serviceName/simulate-failure`
Injects controlled failure into a simulated service.
- **URL Params**: `serviceName` (e.g. `Booking Service`, `Payment Service`)
- **Request Body**:
```json
{
  "failureType": "500_BURST" // or "LATENCY_SPIKE"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Simulated 500_BURST failure triggered on Booking Service",
  "serviceName": "Booking Service",
  "failureType": "500_BURST"
}
```

### `POST /api/services/:serviceName/reset`
Clears active failure injection and triggers circuit breaker recovery probe (`HALF_OPEN`).
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Failure mode cleared for Booking Service. Circuit Breaker transitioned to HALF_OPEN for recovery probe.",
  "serviceName": "Booking Service"
}
```

---

## 3. Metrics

### `GET /api/metrics/overview`
Retrieves aggregated observability metrics across the active 60-second window.
- **Response `200 OK`**:
```json
{
  "totalSimulatedRequests": 142,
  "requestsPerSecond": 2.4,
  "totalHttp500Errors": 0,
  "currentErrorRate": 1.4,
  "avgLatency": 82,
  "p95Latency": 155,
  "healthyServices": 3,
  "degradedServices": 0,
  "isolatedServices": 0,
  "activeIncidents": 0,
  "windowSeconds": 60
}
```

### `GET /api/metrics/timeseries`
Retrieves 5-second grouped historical data points for real-time charts.
- **Response `200 OK`**:
```json
[
  {
    "time": "08:00:15",
    "requests": 12,
    "errors": 1,
    "http500s": 0,
    "errorRate": 8.3,
    "avgLatency": 92
  }
]
```

---

## 4. Application Logs

### `GET /api/logs`
Searches and filters application logs with pagination.
- **Query Parameters**:
  - `service`: Filter by service name
  - `severity`: Filter by `INFO`, `WARN`, `ERROR`, `CRITICAL`
  - `httpStatus`: Filter by integer HTTP code (e.g. `500`, `503`, `200`)
  - `search`: Case-insensitive regex substring search across messages
  - `limit`: Number of results (default 50, max 200)
  - `page`: Page index (default 1)
- **Response `200 OK`**:
```json
{
  "logs": [
    {
      "_id": "6708b7921a83103",
      "service": "Booking Service",
      "timestamp": "2026-10-11T08:00:15.120Z",
      "severity": "CRITICAL",
      "httpStatus": 500,
      "latency": 450,
      "message": "HTTP 500 Internal Server Error in /api/bookings/create: Database Connection Pool Exhausted",
      "correlationId": "corr-k7z10-412"
    }
  ],
  "pagination": {
    "total": 350,
    "page": 1,
    "limit": 50,
    "totalPages": 7
  }
}
```

---

## 5. Incidents & AI Analysis

### `GET /api/incidents`
Lists detected incidents, ordered by most recent start time.
- **Query Parameters**: `status` (`OPEN`, `INVESTIGATING`, `RESOLVED`), `service`

### `GET /api/incidents/:id`
Retrieves full incident details, observed evidence, timeline, and AI diagnosis.

### `POST /api/incidents/:id/analyse`
Triggers AI root-cause analysis (or fallback engine if API key is not set).
- **Response `200 OK`**:
```json
{
  "success": true,
  "incidentId": "INC-K7Z1-482",
  "analysis": {
    "incidentSummary": "High error spike detected on Booking Service.",
    "observedFacts": ["Service affected: Booking Service", "Observed 5 HTTP 500 errors in rolling 10s window"],
    "probableCauses": [
      { "hypothesis": "Database connection pool exhaustion", "confidence": "HIGH" }
    ],
    "evidence": ["HTTP 500 error count reached 5"],
    "recommendedDebuggingSteps": ["Inspect database pool metrics", "Check lock contention"],
    "suggestedRemediation": ["Increase pool size", "Restart instance"],
    "confidence": { "level": "HIGH", "explanation": "Correlated error logs present." },
    "isFallback": false
  }
}
```

---

## 6. SRE Monitoring Thresholds

### `GET /api/thresholds`
Retrieves current threshold configurations.

### `PUT /api/thresholds`
Updates threshold rules dynamically.
- **Request Body**:
```json
{
  "windowSeconds": 10,
  "errorSpikeCount": 5,
  "latencyThresholdMs": 1000,
  "errorRatePercentage": 20,
  "circuitBreakerFailureLimit": 5,
  "circuitBreakerCooldownMs": 10000
}
```

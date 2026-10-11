# CodePulse-Lite

> **Automated API Health Monitoring, Incident Detection & AI Debugging Platform**
> Built as an advanced SRE & DevOps portfolio project for *HackCellence: The Embark Edition*.

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://react.dev/)
[![Tests](https://img.shields.io/badge/Tests-18%20Passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)]()

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │          React + Vite Frontend          │
                      │  (Charts, Topology, Incidents, Logs)    │
                      └────────────────────▲────────────────────┘
                                           │ Polling (2.5s) / REST
                      ┌────────────────────▼────────────────────┐
                      │       Node.js / Express Backend         │
                      └───────┬─────────────────────────┬───────┘
                              │                         │
            ┌─────────────────▼────────┐       ┌────────▼────────────────┐
            │  Traffic Simulator       │       │  Monitoring Engine      │
            │  - Booking Service       │       │  - Rolling Time Windows │
            │  - Search Service        │       │  - Incident Deduplication│
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

## Key Features

1. **Simulated Microservices Ecosystem**: Realistic mock services (`Booking Service`, `Search Service`, `Payment Service`) running background synthetic traffic.
2. **Real-time Observability Dashboard**: Dark charcoal SaaS observability UI with throughput graphs, error rates, latencies (Avg & P95), and service health cards.
3. **Rolling-Window Anomaly Detection**: Configurable sliding windows (default 10s) tracking HTTP 500 spikes, latency breaches, and error rates.
4. **Autonomous Circuit Breaker State Machine**: `CLOSED` $\rightarrow$ `OPEN (ISOLATED)` $\rightarrow$ `HALF_OPEN (PROBE)` $\rightarrow$ `CLOSED`. Failing services are automatically isolated with fast-fail HTTP 503 responses.
5. **Incident Deduplication**: Ongoing breach conditions update existing active incidents and timeline records rather than spamming duplicate documents.
6. **AI-Powered Root-Cause Assistant**: Contextually analyzes telemetry facts, rules, and error log traces with structured LLM diagnosis, supported by a transparent rule-based heuristic fallback engine when no API key is provided.
7. **Controlled SRE Recovery Workflow**: Probe request testing, metric normalization verification, and automated incident resolution.

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)
- **MongoDB** *(Optional)*: If no MongoDB instance is provided, CodePulse-Lite automatically launches an embedded in-memory MongoDB server for zero-setup execution out of the box!

---

### Quick Installation

Clone or navigate into the repository and install dependencies:

```bash
# 1. Install server dependencies
cd server
npm install

# 2. Install client dependencies
cd ../client
npm install
```

---

### Running the Application

Open two terminal windows:

#### Terminal 1: Backend Server
```bash
cd server
npm start
```
*Backend runs on `http://localhost:5000` (API on `http://localhost:5000/api`).*

#### Terminal 2: Frontend Dashboard
```bash
cd client
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## Configuration (`.env`)

### Server Configuration (`server/.env`)
```ini
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

# Optional: MongoDB Connection String (leave empty for automatic in-memory DB)
MONGODB_URI=

# Optional: AI API Key for live LLM diagnosis (Gemini or OpenAI format)
# If omitted, CodePulse-Lite uses its transparent rule-based fallback engine!
AI_API_KEY=
AI_MODEL=gemini-2.5-flash
AI_PROVIDER=gemini
```

### Client Configuration (`client/.env`)
```ini
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Running Automated Tests

Run backend unit and integration test suites:

```bash
cd server
npm test
```

### Test Coverage Highlights:
- ✅ Circuit Breaker State Transitions (`CLOSED` $\rightarrow$ `OPEN` $\rightarrow$ `HALF_OPEN` $\rightarrow$ `CLOSED`)
- ✅ Circuit Breaker Re-open on Probe Failure (`HALF_OPEN` $\rightarrow$ `OPEN`)
- ✅ Rolling-window HTTP 500 error spike breach detection
- ✅ High average latency degradation detection
- ✅ Ongoing incident deduplication
- ✅ AI service fallback diagnostic persistence
- ✅ Full REST API integration tests across all endpoints

---

## Documentation Links

- [Architecture & Engineering Decisions](docs/ARCHITECTURE.md)
- [REST API Specification](docs/API.md)
- [Hackathon Presentation & Demo Walkthrough Guide](docs/DEMO_GUIDE.md)

---

## License

MIT © CodePulse-Lite Portfolio Project

# CivicQueue — Public Service Queue Management & Wait-Time Optimizer

A production-grade, self-contained public queue management and dispatch application with a dynamic **$M/M/c$ queuing engine** and **Exponentially Weighted Moving Average (EWMA)** throughput tracking. Built with React 19, Node.js Express, native WebSockets, and Tailwind CSS.

---

## Features

1. **Dynamic $M/M/c$ Waiting-Time Engine**:
   - **Rolling EWMA Service Rates**:
     $$\mu_t = \alpha \cdot \mu_{\text{recent}} + (1 - \alpha) \cdot \mu_{t-1} \quad (\alpha = 0.25)$$
   - **Dynamic Aggregate Wait Calculation**:
     $$\text{Estimated Wait} = \frac{p}{\sum_{i=1}^c \mu_i}$$
   - **Erlang-C Delay Probability** & steady-state queue performance metrics.
   - Reactive broadcasts via native WebSockets whenever tickets are added, counters change state, or staff call citizens.

2. **Citizen Live Tracker View**:
   - Self-service categorized ticket issuance (`GEN-101`, `DOC-204`, `CSH-301`, etc.).
   - Persisted in browser `localStorage` to survive refreshes.
   - Live "People Ahead" count and dynamic wait time.
   - Status transitions: `WAITING` &rarr; `APPROACHING` (when $\le 2$ in line) &rarr; `NOW SERVING` &rarr; `COMPLETED`.
   - Harmonic audio chime (synthesized Web Audio API) + Web Speech voice dispatch + screen flashing green alert.

3. **Front-Desk / Attendant Kiosk View**:
   - High-contrast, large-touch interface designed for elderly or walk-in assistance.
   - 1-click action buttons per service category with priority fast-track toggle.
   - Instant printable thermal ticket slip dialog (`window.print()` optimized).

4. **Staff Operator & Admin Counter Dashboard**:
   - Independent cards for Counter 1, Counter 2, Counter 3, Counter 4.
   - Open / Close counter toggles (mid-service closures return citizen to the front of queue).
   - "Call Next Customer" and "Complete" controls.
   - Live service duration timer and EWMA speed metrics.
   - Live scrollable queue monitor with FIFO and priority sequencing.

5. **Hall TV Display Board**:
   - Public waiting room split-screen view with "NOW SERVING" counters, upcoming numbers, and chime test.

6. **Operational Analytics & Formulas**:
   - Mathematical parameters, Erlang-C waiting probability, arrival rates ($\lambda$), combined service rates ($\sum \mu$), and category throughput.

---

## Quick Start & Local Execution

No external API keys or paid services are required.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application
```bash
npm start
# or for live development:
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Unit Tests

Unit test suites for the EWMA throughput calculations and $M/M/c$ queuing engine are included in both Node.js and Python:

### Node.js Unit Tests
```bash
npm test
# or:
node test_calculator.js
```

### Python Unit Tests
```bash
python3 test_calculator.py
```

---

## Relational Database Schema

For PostgreSQL production persistence and audit logs, review `schema.sql`:
- `service_categories`
- `service_counters`
- `queue_tokens`
- `counter_service_logs` (EWMA calculation audit history)
- `counter_state_events` (Staff open/close and preemption events)

---

## REST API & WebSocket Protocol

### REST Endpoints
- `POST /api/tokens` — Issue token (`{ serviceType, citizenName?, isPriority? }`)
- `GET /api/tokens/:tokenNumber` — Fetch live position and estimated wait
- `POST /api/counters/:id/call-next` — Complete current ticket and pull next
- `POST /api/counters/:id/complete` — Complete current customer only
- `PATCH /api/counters/:id/toggle` — Toggle counter OPEN / CLOSED
- `GET /api/queue` — Full queue state
- `GET /api/analytics` — Facility metrics and $M/M/c$ parameters
- `POST /api/tokens/:tokenNumber/cancel` — Cancel ticket
- `POST /api/reset-demo` — Reset demo state with active queue data

### WebSocket Events
- `QUEUE_INIT` & `QUEUE_UPDATE` — Real-time state payload broadcast to all clients
- `TOKEN_CALLED` — Notifies clients of called ticket and counter assignment
- `TOKEN_ISSUED` — Emits newly generated token
- `COUNTER_TOGGLED` — Emits counter open/close event

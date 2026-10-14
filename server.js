// CivicQueue - Standalone Node.js / Express / WebSocket Server
// Self-contained implementation supporting direct node execution or containerization.

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// --- EWMA & M/M/c MATHEMATICAL ENGINE ---
const DEFAULT_ALPHA = 0.25;
const DEFAULT_SERVICE_DURATION_SEC = 120;
const DEFAULT_MU = 1 / DEFAULT_SERVICE_DURATION_SEC;

function calculateEWMA(currentMu, recentDurationSec, alpha = DEFAULT_ALPHA) {
  if (recentDurationSec <= 0) return currentMu;
  const sanitizedDuration = Math.max(5, recentDurationSec);
  const muRecent = 1 / sanitizedDuration;
  return alpha * muRecent + (1 - alpha) * currentMu;
}

function calculateAggregateWaitSec(position, activeMus, defaultDurationSec = DEFAULT_SERVICE_DURATION_SEC) {
  if (position <= 0) {
    return { estWaitSec: 0, totalServiceRatePerSec: 0, activeCounters: activeMus.length, isCountersPaused: activeMus.length === 0 };
  }
  const validMus = activeMus.filter((mu) => mu > 0);
  const totalServiceRate = validMus.reduce((sum, rate) => sum + rate, 0);
  if (validMus.length === 0 || totalServiceRate <= 0) {
    return {
      estWaitSec: Math.round(position * defaultDurationSec),
      totalServiceRatePerSec: 0,
      activeCounters: 0,
      isCountersPaused: true,
    };
  }
  const estWaitSec = Math.round(position / totalServiceRate);
  return {
    estWaitSec: Math.max(10, estWaitSec),
    totalServiceRatePerSec: totalServiceRate,
    activeCounters: validMus.length,
    isCountersPaused: false,
  };
}

function factorial(n) {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function calculateErlangC(c, lambda, mu) {
  if (c <= 0 || mu <= 0 || lambda <= 0) return { erlangCProbability: 0, theoreticalWaitSec: 0, utilization: 0 };
  const r = lambda / mu;
  const rho = r / c;
  if (rho >= 1) return { erlangCProbability: 1.0, theoreticalWaitSec: 9999, utilization: rho };
  let sumK = 0;
  for (let k = 0; k < c; k++) sumK += Math.pow(r, k) / factorial(k);
  const termC = (Math.pow(r, c) / factorial(c)) * (1 / (1 - rho));
  const erlangCProbability = termC / (sumK + termC);
  const theoreticalWaitSec = erlangCProbability / (c * mu - lambda);
  return {
    erlangCProbability: Math.min(1, Math.max(0, erlangCProbability)),
    theoreticalWaitSec: Math.round(theoreticalWaitSec),
    utilization: Number(rho.toFixed(3)),
  };
}

// --- QUEUE STORE & STATE ---
const SERVICE_CATEGORIES = {
  GEN: { id: 'GEN', prefix: 'GEN', name: 'General Inquiries', baseDurationSec: 90 },
  DOC: { id: 'DOC', prefix: 'DOC', name: 'Document Attestation', baseDurationSec: 150 },
  CSH: { id: 'CSH', prefix: 'CSH', name: 'Cashier & Payments', baseDurationSec: 75 },
  LIC: { id: 'LIC', prefix: 'LIC', name: 'Permits & Licensing', baseDurationSec: 180 },
  PRI: { id: 'PRI', prefix: 'PRI', name: 'Priority & Accessibility', baseDurationSec: 100 },
};

let waitingQueue = [];
let counters = [
  { id: 1, name: 'Counter 1', status: 'OPEN', currentServingToken: null, serviceStartedAt: null, completedCount: 14, mu: 1 / 85, avgServiceDurationSec: 85, history: [] },
  { id: 2, name: 'Counter 2', status: 'OPEN', currentServingToken: null, serviceStartedAt: null, completedCount: 10, mu: 1 / 140, avgServiceDurationSec: 140, history: [] },
  { id: 3, name: 'Counter 3', status: 'OPEN', currentServingToken: null, serviceStartedAt: null, completedCount: 19, mu: 1 / 65, avgServiceDurationSec: 65, history: [] },
  { id: 4, name: 'Counter 4', status: 'OPEN', currentServingToken: null, serviceStartedAt: null, completedCount: 8, mu: 1 / 110, avgServiceDurationSec: 110, history: [] },
];
let completedTokens = [];
let recentlyCalled = [];
let sequenceCounters = { GEN: 102, DOC: 202, CSH: 302, LIC: 401, PRI: 501 };

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function getQueueSnapshot() {
  const now = Date.now();
  const activeMus = counters.filter((c) => c.status === 'OPEN').map((c) => c.mu);
  const recentQueue = waitingQueue.map((tok, i) => {
    const pos = i + 1;
    const est = calculateAggregateWaitSec(pos, activeMus, DEFAULT_SERVICE_DURATION_SEC);
    return {
      ...tok,
      waitDurationSec: Math.round((now - tok.createdAt) / 1000),
      estimatedRemainingSec: est.estWaitSec,
    };
  });
  return {
    waitingQueue,
    counters,
    completedTokens: completedTokens.slice(0, 50),
    recentlyCalled,
    lastUpdated: now,
    queueLength: waitingQueue.length,
    completedCount: completedTokens.length,
    activeCounterCount: counters.filter((c) => c.status === 'OPEN').length,
    recentQueue,
  };
}

// WebSocket setup
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'QUEUE_INIT', payload: getQueueSnapshot(), timestamp: Date.now() }));
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'PING') ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
    } catch (e) {}
  });
});

// REST routes
app.post('/api/tokens', (req, res) => {
  const { serviceType, citizenName, isPriority } = req.body;
  if (!serviceType) return res.status(400).json({ error: 'serviceType is required' });
  const cat = SERVICE_CATEGORIES[serviceType] || SERVICE_CATEGORIES.GEN;
  const seq = sequenceCounters[serviceType]++;
  const tokenNumber = `${cat.prefix}-${seq}`;
  const now = Date.now();
  const token = {
    id: `tok-${now}-${Math.random().toString(36).substring(2, 7)}`,
    tokenNumber,
    serviceType,
    citizenName: citizenName?.trim() || undefined,
    status: 'WAITING',
    createdAt: now,
    isPriority: isPriority || serviceType === 'PRI',
  };

  if (token.isPriority) {
    const nonPriIdx = waitingQueue.findIndex((t) => !t.isPriority);
    if (nonPriIdx === -1) waitingQueue.push(token);
    else waitingQueue.splice(nonPriIdx, 0, token);
  } else {
    waitingQueue.push(token);
  }

  // Update approaching
  for (let i = 0; i < waitingQueue.length; i++) {
    if (waitingQueue[i].status !== 'SERVING') waitingQueue[i].status = i < 2 ? 'APPROACHING' : 'WAITING';
  }

  const pos = waitingQueue.findIndex((t) => t.tokenNumber === tokenNumber) + 1;
  const activeMus = counters.filter((c) => c.status === 'OPEN').map((c) => c.mu);
  const estimate = calculateAggregateWaitSec(pos, activeMus);

  broadcast('QUEUE_UPDATE', getQueueSnapshot());
  broadcast('TOKEN_ISSUED', { token, estimate });

  return res.status(201).json({ token, estimate });
});

app.get('/api/tokens/:tokenNumber', (req, res) => {
  const { tokenNumber } = req.params;
  for (const counter of counters) {
    if (counter.currentServingToken?.tokenNumber === tokenNumber) {
      return res.json({ token: counter.currentServingToken, estimate: { position: 0, estWaitSec: 0 } });
    }
  }
  const idx = waitingQueue.findIndex((t) => t.tokenNumber === tokenNumber);
  if (idx >= 0) {
    const activeMus = counters.filter((c) => c.status === 'OPEN').map((c) => c.mu);
    const estimate = calculateAggregateWaitSec(idx + 1, activeMus);
    return res.json({ token: waitingQueue[idx], estimate });
  }
  const completed = completedTokens.find((t) => t.tokenNumber === tokenNumber);
  if (completed) {
    return res.json({ token: completed, estimate: { position: 0, estWaitSec: 0 } });
  }
  return res.status(404).json({ error: 'Token not found' });
});

app.post('/api/counters/:id/call-next', (req, res) => {
  const counterId = parseInt(req.params.id, 10);
  const counter = counters.find((c) => c.id === counterId);
  if (!counter) return res.status(404).json({ error: 'Counter not found' });
  if (counter.status !== 'OPEN') return res.status(400).json({ error: 'Counter is closed' });

  const now = Date.now();
  let completedToken = null;

  if (counter.currentServingToken) {
    completedToken = counter.currentServingToken;
    const duration = counter.serviceStartedAt ? Math.max(5, Math.round((now - counter.serviceStartedAt) / 1000)) : 60;
    completedToken.status = 'COMPLETED';
    completedToken.completedAt = now;
    completedTokens.unshift(completedToken);

    counter.mu = calculateEWMA(counter.mu, duration);
    counter.avgServiceDurationSec = Math.round(1 / counter.mu);
    counter.completedCount += 1;
    counter.history.unshift({ tokenNumber: completedToken.tokenNumber, durationSec: duration, completedAt: now });
    counter.currentServingToken = null;
    counter.serviceStartedAt = null;
  }

  let calledToken = null;
  if (waitingQueue.length > 0) {
    calledToken = waitingQueue.shift();
    calledToken.status = 'SERVING';
    calledToken.calledAt = now;
    calledToken.servingCounterId = counter.id;
    calledToken.servingCounterName = counter.name;

    counter.currentServingToken = calledToken;
    counter.serviceStartedAt = now;

    recentlyCalled.unshift({ token: calledToken, counterId: counter.id, counterName: counter.name, calledAt: now });
    if (recentlyCalled.length > 8) recentlyCalled.pop();
  }

  for (let i = 0; i < waitingQueue.length; i++) {
    waitingQueue[i].status = i < 2 ? 'APPROACHING' : 'WAITING';
  }

  broadcast('QUEUE_UPDATE', getQueueSnapshot());
  if (calledToken) broadcast('TOKEN_CALLED', { token: calledToken, counterId: counter.id, counterName: counter.name });

  return res.json({ counter, calledToken, completedToken });
});

app.patch('/api/counters/:id/toggle', (req, res) => {
  const counterId = parseInt(req.params.id, 10);
  const counter = counters.find((c) => c.id === counterId);
  if (!counter) return res.status(404).json({ error: 'Counter not found' });

  const newStatus = counter.status === 'OPEN' ? 'CLOSED' : 'OPEN';
  let returnedToken = null;

  if (newStatus === 'CLOSED' && counter.currentServingToken) {
    returnedToken = counter.currentServingToken;
    returnedToken.status = 'WAITING';
    returnedToken.servingCounterId = undefined;
    returnedToken.servingCounterName = undefined;
    waitingQueue.unshift(returnedToken);
    counter.currentServingToken = null;
    counter.serviceStartedAt = null;
  }

  counter.status = newStatus;
  for (let i = 0; i < waitingQueue.length; i++) {
    waitingQueue[i].status = i < 2 ? 'APPROACHING' : 'WAITING';
  }

  broadcast('QUEUE_UPDATE', getQueueSnapshot());
  broadcast('COUNTER_TOGGLED', { counter, returnedToken });
  return res.json({ counter, returnedToken });
});

app.get('/api/queue', (_req, res) => res.json(getQueueSnapshot()));
app.get('/api/analytics', (_req, res) => {
  const activeCounters = counters.filter((c) => c.status === 'OPEN');
  const totalMu = activeCounters.reduce((a, b) => a + b.mu, 0);
  const avgMu = activeCounters.length ? totalMu / activeCounters.length : DEFAULT_MU;
  const erlang = calculateErlangC(Math.max(1, activeCounters.length), 0.02, avgMu);
  return res.json({
    activeCounterCount: activeCounters.length,
    totalCounters: counters.length,
    queueDepth: waitingQueue.length,
    totalServedToday: completedTokens.length,
    avgWaitTimeSec: 180,
    avgServiceTimeSec: Math.round(1 / avgMu),
    totalThroughputPerHour: Math.round(totalMu * 3600),
    mmcStats: erlang,
  });
});

async function start() {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

// Only auto-start if run directly via node
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  start();
}

export { calculateEWMA, calculateAggregateWaitSec, calculateErlangC, getQueueSnapshot };

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { queueStore } from './src/services/queueStore.ts';
import { userStore } from './src/services/userStore.ts';
import { ServiceCategoryId } from './src/types/queue.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

app.use(express.json());

// Auth token extractor helper
function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return userStore.getUserByToken(token);
}

// Broadcast helper
function broadcast(type: string, payload: any) {
  const message = JSON.stringify({
    type,
    payload,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Error sending WS message:', err);
      }
    }
  });
}

// Queue store subscriber for automatic broadcasts
queueStore.subscribe(() => {
  const state = queueStore.getQueueState();
  broadcast('QUEUE_UPDATE', state);
});

// WebSocket Connection Handler
wss.on('connection', (ws: WebSocket) => {
  const state = queueStore.getQueueState();
  ws.send(
    JSON.stringify({
      type: 'QUEUE_INIT',
      payload: state,
      timestamp: Date.now(),
    })
  );

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      // Ignore
    }
  });
});

// --- AUTHENTICATION & USER MANAGEMENT ENDPOINTS ---

// Register Citizen
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, cnic, mobile, email, password, city, address } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    const result = await userStore.register({
      fullName,
      cnic,
      mobile,
      email,
      password,
      city,
      address,
      ipAddress,
      userAgent,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// User / Citizen Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    const result = await userStore.login(identifier, password, { ipAddress, userAgent });
    return res.json(result);
  } catch (error: any) {
    return res.status(401).json({ error: error.message || 'Invalid credentials' });
  }
});

// Administrator Login
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Admin Portal';

    const result = await userStore.login(identifier, password, {
      requireRole: 'admin',
      ipAddress,
      userAgent,
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(401).json({ error: error.message || 'Admin authentication failed' });
  }
});

// Get Current Logged In User Profile
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ user });
});

// User Dashboard Data (Profile + My Active & Past Tickets)
app.get('/api/user/dashboard', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const tickets = queueStore.getUserTickets(user.id);
  return res.json({
    user,
    activeTickets: tickets.activeTickets,
    completedTickets: tickets.completedTickets,
  });
});

// Admin: Get All Users
app.get('/api/admin/users', (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  const { search, role } = req.query;
  const users = userStore.getAllUsers(search as string, role as string);
  return res.json({ users, total: users.length });
});

// Admin: Update User Role or Status
app.patch('/api/admin/users/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  try {
    const updated = userStore.updateUser(req.params.id, req.body, admin.email);
    return res.json({ user: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Update failed' });
  }
});

// Admin: Delete User
app.delete('/api/admin/users/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  const success = userStore.deleteUser(req.params.id, admin.email);
  return res.json({ success });
});

// Admin: Audit Logs
app.get('/api/admin/audit-logs', (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  const limit = parseInt((req.query.limit as string) || '50', 10);
  const logs = userStore.getAuditLogs(limit);
  return res.json({ logs });
});

// --- QUEUE TICKETING ENDPOINTS ---

// 1. POST /api/tokens - Issue new token (supports verified citizen data)
app.post('/api/tokens', (req, res) => {
  try {
    const { serviceType, citizenName, isPriority, cnic, phone, email } = req.body;
    if (!serviceType) {
      return res.status(400).json({ error: 'serviceType is required' });
    }

    const authUser = getAuthUser(req);
    const finalName = authUser?.fullName || citizenName;
    const finalCnic = authUser?.cnic || cnic;
    const finalPhone = authUser?.mobile || phone;
    const finalEmail = authUser?.email || email;

    const result = queueStore.issueToken(
      serviceType as ServiceCategoryId,
      finalName,
      Boolean(isPriority),
      {
        userId: authUser?.id,
        cnic: finalCnic,
        phone: finalPhone,
        email: finalEmail,
      }
    );

    // Also broadcast token issued event
    broadcast('TOKEN_ISSUED', {
      token: result.token,
      estimate: result.estimate,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Error issuing token:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/kiosk/issue - Dedicated Assisted Check-In Kiosk Endpoint for Guards
app.post('/api/kiosk/issue', (req, res) => {
  try {
    const { category, flags = [], citizenName, cnic, phone } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'category is required (GEN, DOC, CSH, LIC, PRI)' });
    }

    const hasPriorityFlag = Array.isArray(flags) && flags.length > 0;
    const isPriority = category === 'PRI' || hasPriorityFlag;

    // Build assistance notes if flags provided
    const flagLabels = Array.isArray(flags) ? flags.join(', ') : '';
    const nameWithFlags = flagLabels
      ? (citizenName ? `${citizenName} [${flagLabels}]` : `[${flagLabels}]`)
      : (citizenName || undefined);

    const result = queueStore.issueToken(
      category as ServiceCategoryId,
      nameWithFlags,
      isPriority,
      {
        cnic: cnic ? String(cnic).trim() : undefined,
        phone: phone ? String(phone).trim() : undefined,
      }
    );

    // Broadcast token issued event for overhead screens and staff
    broadcast('TOKEN_ISSUED', {
      token: result.token,
      estimate: result.estimate,
    });

    const estWaitMinutes = Math.max(1, Math.round(result.estimate.estWaitSec / 60));

    return res.status(201).json({
      tokenNumber: result.token.tokenNumber,
      position: result.estimate.position,
      estWaitMinutes,
      token: result.token,
      estimate: result.estimate,
    });
  } catch (error: any) {
    console.error('Error in kiosk issue:', error);
    return res.status(500).json({ error: error.message || 'Internal kiosk error' });
  }
});

// 2. GET /api/tokens/:tokenNumber - Live position & wait estimate
app.get('/api/tokens/:tokenNumber', (req, res) => {
  try {
    const { tokenNumber } = req.params;
    const result = queueStore.getToken(tokenNumber);

    if (!result.token) {
      return res.status(404).json({ error: 'Token not found or cancelled', estimate: result.estimate });
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Error fetching token:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. POST /api/counters/:id/call-next - Call next customer
app.post('/api/counters/:id/call-next', (req, res) => {
  try {
    const counterId = parseInt(req.params.id, 10);
    if (isNaN(counterId)) {
      return res.status(400).json({ error: 'Invalid counter ID' });
    }

    const result = queueStore.callNext(counterId);

    if (result.calledToken) {
      // Broadcast special TOKEN_CALLED notification for sound & visual alert
      broadcast('TOKEN_CALLED', {
        token: result.calledToken,
        counterId: result.counter.id,
        counterName: result.counter.name,
      });
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Error in call-next:', error);
    return res.status(400).json({ error: error.message || 'Failed to call next customer' });
  }
});

// 4. POST /api/counters/:id/complete - Complete current customer without calling next
app.post('/api/counters/:id/complete', (req, res) => {
  try {
    const counterId = parseInt(req.params.id, 10);
    if (isNaN(counterId)) {
      return res.status(400).json({ error: 'Invalid counter ID' });
    }

    const result = queueStore.completeCurrent(counterId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error completing customer:', error);
    return res.status(400).json({ error: error.message || 'Failed to complete customer' });
  }
});

// 5. PATCH /api/counters/:id/toggle - Toggle counter status
app.patch('/api/counters/:id/toggle', (req, res) => {
  try {
    const counterId = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (isNaN(counterId)) {
      return res.status(400).json({ error: 'Invalid counter ID' });
    }

    const result = queueStore.toggleCounter(counterId, status);

    broadcast('COUNTER_TOGGLED', {
      counter: result.counter,
      returnedToken: result.returnedToken,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Error toggling counter:', error);
    return res.status(400).json({ error: error.message || 'Failed to toggle counter' });
  }
});

// Recall customer (re-chime & broadcast)
app.post('/api/counters/:id/recall', (req, res) => {
  try {
    const counterId = parseInt(req.params.id, 10);
    const result = queueStore.recallToken(counterId);
    if (result.token) {
      broadcast('TOKEN_CALLED', {
        token: result.token,
        counterId: result.counter.id,
        counterName: result.counter.name,
      });
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to recall customer' });
  }
});

// Call specific customer from queue
app.post('/api/counters/:id/call-specific', (req, res) => {
  try {
    const counterId = parseInt(req.params.id, 10);
    const { tokenNumber } = req.body;
    if (!tokenNumber) return res.status(400).json({ error: 'tokenNumber required' });
    const result = queueStore.callSpecific(counterId, tokenNumber);
    broadcast('TOKEN_CALLED', {
      token: result.calledToken,
      counterId: result.counter.id,
      counterName: result.counter.name,
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to call customer' });
  }
});

// Mark no-show
app.post('/api/counters/:id/no-show', (req, res) => {
  try {
    const counterId = parseInt(req.params.id, 10);
    const result = queueStore.markNoShow(counterId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to mark no-show' });
  }
});

// Prioritize token
app.post('/api/tokens/:tokenNumber/prioritize', (req, res) => {
  const { tokenNumber } = req.params;
  const success = queueStore.prioritizeToken(tokenNumber);
  return res.json({ success, tokenNumber });
});

// Seed batch
app.post('/api/seed-batch', (req, res) => {
  const count = parseInt(req.body.count || '3', 10);
  const added = queueStore.seedBatch(count);
  return res.json({ success: true, count: added.length, added });
});

// 6. GET /api/queue - Full queue state
app.get('/api/queue', (_req, res) => {
  return res.json(queueStore.getQueueState());
});

// 7. GET /api/analytics - Aggregate performance metrics
app.get('/api/analytics', (_req, res) => {
  return res.json(queueStore.getAnalytics());
});

// 8. POST /api/tokens/:tokenNumber/cancel - Cancel token
app.post('/api/tokens/:tokenNumber/cancel', (req, res) => {
  const { tokenNumber } = req.params;
  const success = queueStore.cancelToken(tokenNumber);
  return res.json({ success, tokenNumber });
});

// 9. POST /api/reset-demo - Reset / re-seed demo data
app.post('/api/reset-demo', (_req, res) => {
  queueStore.resetDemoData();
  return res.json({ success: true, message: 'Queue data re-seeded successfully' });
});

// Vite Middleware for development OR static files for production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`CivicQueue server running on http://localhost:${PORT}`);
    console.log(`WebSocket server active on ws://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

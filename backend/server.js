/* ═══════════════════════════════════════════════════════════
   MISFIT — server.js  (Production-Hardened + Socket.io)
   Security: Helmet, Rate Limiting, NoSQL Sanitization
   Real-time: Socket.io for admin notifications
═══════════════════════════════════════════════════════════ */
require('dotenv').config();
const http           = require('http');
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const mongoSanitize  = require('express-mongo-sanitize');
const { Server }     = require('socket.io');

const app    = express();
const server = http.createServer(app);   // ← wrap express in http server for socket.io

// ── ALLOWED ORIGINS ───────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5500',  'http://127.0.0.1:5500',
  'http://localhost:3000',  'http://127.0.0.1:3000',
  'http://localhost:5173',  'http://127.0.0.1:5173',
  'null',
];

// ── SOCKET.IO ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app so controllers can emit events
app.set('io', io);

// Admin room — only authenticated admin sockets join this
io.on('connection', (socket) => {
  socket.on('join-admin', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.role === 'admin') {
        socket.join('admin-room');
        socket.emit('admin-connected', { message: 'Connected to MisFit Control Room 🔥' });
        console.log(`🔌 Admin socket connected: ${payload.email}`);
      }
    } catch {
      socket.disconnect();
    }
  });

  socket.on('disconnect', () => {
    // no-op
  });
});

// Export helper so controllers can broadcast admin events
function emitAdmin(io, event, data) {
  io.to('admin-room').emit(event, { ...data, timestamp: new Date().toISOString() });
}
app.set('emitAdmin', emitAdmin);

// ── SECURITY HEADERS (Helmet) ─────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    console.warn(`⚠️  CORS blocked: ${origin}`);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// ── RATE LIMITING ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded. Slow down.' },
});

app.use('/api/', generalLimiter);

// ── BODY PARSING + NOSQL SANITISATION ─────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'MisFit API is running 🔥',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    socket: 'enabled',
  });
});

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter,  require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/reviews',  require('./routes/reviews'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/payment',  require('./routes/payment'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/reports',  require('./routes/reports'));

// ── 404 HANDLER ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

// ── START SERVER ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

function startServer() {
  server.listen(PORT, () => {
    console.log(`\n🔥 MisFit API  → http://localhost:${PORT}`);
    console.log(`   Socket.io   → ws://localhost:${PORT}`);
    console.log(`   Health      → http://localhost:${PORT}/api/health`);
    console.log(`   Mode        → ${process.env.NODE_ENV || 'development'}\n`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('   [DEV] admin@misfit.in / admin123  |  user@misfit.in / user123');
    }
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`\n⚠️  Port ${PORT} is already in use. Killing old process and retrying…\n`);
    const { execSync } = require('child_process');
    try {
      // Windows: find and kill the process using port 5000
      const result = execSync(
        `netstat -ano | findstr :${PORT}`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const lines = result.trim().split('\n');
      const pids = new Set();
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
      });
      pids.forEach(pid => {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`   ✅ Killed PID ${pid}`);
        } catch (_) {}
      });
    } catch (_) {}

    // Wait 1 second then retry
    setTimeout(() => {
      server.close();
      startServer();
    }, 1000);
  } else {
    console.error('❌ Server error:', err.message);
    process.exit(1);
  }
});

startServer();

module.exports = { app, io };

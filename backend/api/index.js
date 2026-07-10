/**
 * ═══════════════════════════════════════════════════════════
 * MisFit Backend - Vercel Serverless Function Entry Point
 * ═══════════════════════════════════════════════════════════
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ── ALLOWED ORIGINS ───────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://misfit-shop.vercel.app',
  'https://www.misfit-shop.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL || 'http://localhost:5173',
];

// ── SOCKET.IO ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

app.set('io', io);

// ── Socket Connection Handler ─────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-admin', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.role === 'admin') {
        socket.join('admin-room');
        socket.emit('admin-connected', { 
          message: 'Connected to MisFit Control Room 🔥',
          timestamp: new Date()
        });
        console.log(`✅ Admin connected: ${payload.email}`);
      }
    } catch (error) {
      console.error('❌ Admin auth failed:', error.message);
      socket.disconnect();
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ── MIDDLEWARE ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(mongoSanitize());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ── DATABASE CONNECTION ───────────────────────────────────────
const mongoose = require('mongoose');

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) {
    console.log('📦 Using cached database connection');
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 1, // Important for serverless
      retryWrites: true,
      w: 'majority',
    });

    cachedConnection = conn;
    console.log('✅ MongoDB connected');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// Ensure DB connection on startup
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});

// ── IMPORT ROUTES ──────────────────────────────────────────────
const authRoutes = require('../routes/auth');
const productsRoutes = require('../routes/products');
const cartRoutes = require('../routes/cart');
const ordersRoutes = require('../routes/orders');
const paymentRoutes = require('../routes/payment');
const wishlistRoutes = require('../routes/wishlist');
const reviewsRoutes = require('../routes/reviews');
const adminRoutes = require('../routes/admin');
const reportsRoutes = require('../routes/reports');

// ── APPLY ROUTES ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MisFit Backend Running ✅',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 HANDLER ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// ── ERROR HANDLER ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── EXPORT FOR VERCEL ─────────────────────────────────────────
module.exports = app;

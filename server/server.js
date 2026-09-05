/**
 * RoadSense AI — Express Server
 * Smart Road Intelligence & Pothole Detection System
 * Vadodara Municipal Corporation
 *
 * SECURITY: No credentials, secrets, or API keys in source code.
 * All secrets must be in .env — see .env.example
 */

require('dotenv').config();

const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const detectRoutes = require('./routes/detect');
const citizenRoutes = require('./routes/citizen');
const roadhealthRoutes = require('./routes/roadhealth');
const repairRoutes = require('./routes/repair');
const notificationRoutes = require('./routes/notifications');
const authRoutes = require('./routes/auth');
const contractorRoutes = require('./routes/contractor');
const zonesRouter = require('./routes/zones');
const dashboardRouter = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');
const usersRoutes = require('./routes/users');

const http = require('http');
const { Server } = require('socket.io');

// ══════════════════════════════════════════════
// CORS & ORIGINS CONFIGURATION
// ══════════════════════════════════════════════
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:4000',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:4000',
  'http://[::1]:4200',
  'http://[::1]:4000'
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(url => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

global.io = io;

io.use((socket, next) => {
  let token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token && socket.handshake.headers.cookie) {
    const pairs = socket.handshake.headers.cookie.split(';');
    const cookies = {};
    pairs.forEach(pair => {
      const parts = pair.split('=');
      cookies[parts[0].trim()] = (parts[1] || '').trim();
    });
    token = cookies.roadsense_token;
  }

  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET;
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.user.email} (${socket.user.role})`);
  socket.join(socket.user.email);
  socket.join(`role-${socket.user.role}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.user.email}`);
  });
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pothole-detection';

// ══════════════════════════════════════════════
// SECURITY MIDDLEWARE (applied first)
// ══════════════════════════════════════════════

// Helmet — security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "blob:", "tile.openstreetmap.org", "*.tile.openstreetmap.org", "*.basemaps.cartocdn.com", "raw.githubusercontent.com", "cdnjs.cloudflare.com", "upload.wikimedia.org"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
    fontSrc: ["'self'", "fonts.gstatic.com"],
    connectSrc: ["'self'", "nominatim.openstreetmap.org", "router.project-osrm.org", "localhost:5001", "http://localhost:5001", "https://*"]
  }
}));

// Cookie parser
app.use(cookieParser());

// CORS — credentials enabled for httpOnly cookies
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ══════════════════════════════════════════════
// RATE LIMITING
// ══════════════════════════════════════════════

// Login rate limiter — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API limiter — 1000 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiters BEFORE routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/', generalLimiter);

// ══════════════════════════════════════════════
// STATIC FILES
// ══════════════════════════════════════════════
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ══════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════
app.use('/api', detectRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/road-health', roadhealthRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/zones', zonesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', usersRoutes);

// ══════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pothole-detection-api',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ══════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ══════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Express server running on http://localhost:${PORT}`);
      console.log(`📡 Flask inference service expected at ${process.env.FLASK_URL || 'http://localhost:5001'}`);
      console.log(`🔒 Security: Helmet, rate limiting, CORS enabled`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('Starting server without MongoDB...');
    server.listen(PORT, () => {
      console.log(`🚀 Express server running on http://localhost:${PORT} (No DB)`);
    });
  });

module.exports = app;

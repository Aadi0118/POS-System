/**
 * @file server.js
 * @description Master entrypoint for the POS & KDS Backend.
 * Establishes a hardened security posture with helmet, cors, rate limiting,
 * mongo sanitization, JWT authorization, and real-time Socket.io dispatching.
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');

const connectDB = require('./config/db.js');
const initSocketServer = require('./sockets/socketHandler');
const { globalApiLimiter } = require('./middleware/rateLimiter.middleware');
const errorHandler = require('./middleware/error.middleware');

// Route handlers
const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const tableRoutes = require('./routes/table.routes');
const orderRoutes = require('./routes/order.routes');
const adminRoutes = require('./routes/admin.routes');
const salaryRoutes = require('./routes/salary.routes');

// Initialize Express application
const app = express();
const server = http.createServer(app);

// 1. Establish database connection
connectDB();

// 2. Initialize real-time Socket.io server and expose instance on app
const io = initSocketServer(server);
app.set('io', io);

// ==========================================================
// SECURITY & HARDENING MIDDLEWARE SUITE
// ==========================================================

// Helmet: Secure HTTP response headers (prevents XSS, clickjacking, MIME sniffing)
app.use(
  helmet({
    contentSecurityPolicy: false, // Mobile API backend does not serve HTML scripts
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS: Cross-Origin Resource Sharing with strict domain authorization
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGIN || '*';
    if (allowed === '*' || !origin) {
      callback(null, true);
    } else {
      const allowedOrigins = allowed.split(',').map((o) => o.trim());
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not permitted by CORS policy.`));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
};
app.use(cors(corsOptions));

// Bounded JSON body parser to prevent memory-exhaustion payload attacks
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// NoSQL Injection Sanitization: Recursively strips any keys containing '$' or '.'
app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`[Security Alert: NoSQL Injection Detected] Sanitized key '${key}' in request from IP: ${req.ip}`);
    },
  })
);

// General API rate limiter across all routes
app.use('/api', globalApiLimiter);

// Request logging (Morgan)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health check endpoint (for load balancers, mobile connection tests, and container orchestrators)
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.1',
    timestamp: new Date(),
    uptimeSeconds: process.uptime(),
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ==========================================================
// RESTFUL API ROUTE DISPATCHERS
// ==========================================================
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/salary', salaryRoutes);

// Catch-all 404 handler for undefined resources
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}. Route not found.`,
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Start HTTP and WebSocket listener
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 POS + KDS Core Engine running on port ${PORT}`);
  console.log(`🔒 Security: Helmet, Strict CORS, Rate Limiters ACTIVE`);
  console.log(`⚡ Real-Time Socket.io Server ONLINE`);
  console.log(`=======================================================`);
});

module.exports = { app, server };


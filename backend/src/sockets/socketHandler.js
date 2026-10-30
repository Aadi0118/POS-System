/**
 * @file socketHandler.js
 * @description Real-time WebSocket event dispatcher using Socket.io.
 * Implements JWT authentication during the handshake phase and segregates events by role rooms.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Initializes and configures the Socket.io real-time server with security authentication.
 *
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Security Middleware: Authenticate every incoming socket connection using JWT
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: Missing session token.'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name role isActive');

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User inactive or does not exist.'));
      }

      // Attach verified staff details to the socket instance
      socket.user = {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
      };

      next();
    } catch (err) {
      console.warn(`[Socket Auth Warning] Handshake rejected: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired session token.'));
    }
  });

  io.on('connection', (socket) => {
    const { name, role, id } = socket.user;
    console.log(`[Socket Connected] User ${name} (${role}) - Socket ID: ${socket.id}`);

    // Join role-specific broadcast rooms
    const roleRoom = `role:${role.toLowerCase()}`;
    socket.join(roleRoom);

    // Universal staff room
    socket.join('room:all_staff');

    // Admins join all functional channels for comprehensive real-time surveillance
    if (role === 'Admin') {
      socket.join('role:cook');
      socket.join('role:waiter');
      socket.join('role:cleaner');
    }

    // Ping check event
    socket.on('ping:client', () => {
      socket.emit('pong:server', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket Disconnected] User ${name} (${role}) - Reason: ${reason}`);
    });
  });

  return io;
};

module.exports = initSocketServer;


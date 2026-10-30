/**
 * @file auth.middleware.js
 * @description JWT Authentication verification middleware.
 * Validates bearer token signature and verifies active account status in the database.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET is not configured on the server.');
    }

    // Verify token signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Session expired. Please re-enter your 4-digit PIN.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid session token. Access denied.',
        code: 'TOKEN_INVALID',
      });
    }

    // Defensive check: verify user exists and is still active in the database
    // This prevents deactivated/terminated employees from retaining access with unexpired tokens
    const user = await User.findById(decoded.id).select('_id name role isActive');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account associated with this session no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated by administration. Access revoked.',
      });
    }

    // Attach verified user context to request
    req.user = {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error(`[Auth Middleware Exception] ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error.',
    });
  }
};

module.exports = authenticateToken;


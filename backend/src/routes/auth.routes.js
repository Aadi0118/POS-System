/**
 * @file auth.routes.js
 * @description Authentication and session management routes.
 * Integrates brute-force rate limiter and Zod schema validations.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const validate = require('../middleware/validate.middleware');
const { loginSchema } = require('../validators/auth.validator');
const authenticateToken = require('../middleware/auth.middleware');

// Public route: Staff list for PIN keypad selection
router.get('/staff-list', authController.getStaffList);

// Protected login route: Enforces 5 attempts per 15 minutes + strict 4-digit PIN validation
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

// Protected session validation route
router.get(
  '/me',
  authenticateToken,
  authController.getMe
);

module.exports = router;


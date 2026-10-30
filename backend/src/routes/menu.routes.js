/**
 * @file menu.routes.js
 * @description Routes for menu catalog with strict RBAC enforcement.
 */

const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu.controller');
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createMenuItemSchema,
  updateMenuItemSchema,
  updateAvailabilitySchema,
} = require('../validators/menu.validator');

// All menu routes require an active authenticated session
router.use(authenticateToken);

// View menu: All authenticated staff (Waiter, Cook, Cleaner, Admin)
router.get('/', menuController.getMenu);

// Create item: Admin only
router.post(
  '/',
  requireRole(['Admin']),
  validate(createMenuItemSchema),
  menuController.createMenuItem
);

// Update item: Admin only
router.put(
  '/:id',
  requireRole(['Admin']),
  validate(updateMenuItemSchema),
  menuController.updateMenuItem
);

// Toggle availability: Cook or Admin (Cooks can 86 items when supplies run low)
router.patch(
  '/:id/availability',
  requireRole(['Admin', 'Cook']),
  validate(updateAvailabilitySchema),
  menuController.updateAvailability
);

// Delete item: Admin only
router.delete(
  '/:id',
  requireRole(['Admin']),
  menuController.deleteMenuItem
);

module.exports = router;


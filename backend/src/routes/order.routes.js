/**
 * @file order.routes.js
 * @description Routes for dining orders with strict role-based authorization.
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderItemsSchema,
  appendOrderItemsSchema,
} = require('../validators/order.validator');

// All order endpoints require active session token
router.use(authenticateToken);

// View all orders: Accessible to all roles
router.get('/', orderController.getOrders);

// View active kitchen/pos orders: Accessible to all roles
router.get('/active', orderController.getActiveOrders);

// Create order: Waiter and Admin only
router.post(
  '/',
  requireRole(['Waiter', 'Admin']),
  validate(createOrderSchema),
  orderController.createOrder
);

// Update status (Cook & Admin only): Cook can set Accepted, Rejected, Ready
router.patch(
  '/:id/status',
  requireRole(['Cook', 'Admin']),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

// Modify items (Waiter & Admin only)
router.put(
  '/:id/items',
  requireRole(['Waiter', 'Admin']),
  validate(updateOrderItemsSchema),
  orderController.updateOrderItems
);

// Append new items/courses to active order (Waiter & Admin only): Works even if kitchen has already Accepted or Readied previous courses!
router.post(
  '/:id/items',
  requireRole(['Waiter', 'Admin']),
  validate(appendOrderItemsSchema),
  orderController.appendOrderItems
);

// Payment Received / Checkout: Waiter & Admin only (Turns table Dirty)
router.patch(
  '/:id/pay',
  requireRole(['Waiter', 'Admin']),
  orderController.processPayment
);

// Admin Master Void Override: Admin only
router.delete(
  '/:id/void',
  requireRole(['Admin']),
  orderController.voidOrder
);

module.exports = router;


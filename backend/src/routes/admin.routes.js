/**
 * @file admin.routes.js
 * @description Master administrative routes guarded by Admin role requirement.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { createStaffSchema, updateStaffSchema } = require('../validators/auth.validator');

// Strict RBAC: All administrative endpoints require an authenticated Admin token
router.use(authenticateToken);
router.use(requireRole(['Admin']));

// Real-time sales, order, and table metrics
router.get('/metrics', adminController.getMetrics);

// Staff management CRUD
router.get('/staff', adminController.getStaff);
router.post('/staff', validate(createStaffSchema), adminController.createStaff);
router.put('/staff/:id', validate(updateStaffSchema), adminController.updateStaff);
router.patch('/staff/:id/toggle-status', adminController.toggleStaffStatus);

module.exports = router;


/**
 * @file table.routes.js
 * @description Routes for table floor management with RBAC rules.
 */

const express = require('express');
const router = express.Router();
const tableController = require('../controllers/table.controller');
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { createTableSchema } = require('../validators/table.validator');

// All table routes require authentication
router.use(authenticateToken);

// View floor map: All roles
router.get('/', tableController.getTables);

// Clean table action: Cleaner and Admin ONLY
router.patch(
  '/:id/clean',
  requireRole(['Cleaner', 'Admin']),
  tableController.cleanTable
);

// Add table: Admin only
router.post(
  '/',
  requireRole(['Admin']),
  validate(createTableSchema),
  tableController.createTable
);

// Delete table: Admin only
router.delete(
  '/:id',
  requireRole(['Admin']),
  tableController.deleteTable
);

module.exports = router;


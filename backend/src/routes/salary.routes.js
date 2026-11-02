/**
 * @file salary.routes.js
 * @description API routes for staff salary, advances, PF deductions, and day-wise earnings.
 * Exposes staff endpoints for personal salary tracking and admin endpoints for payroll management.
 */

const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salary.controller');
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const {
  updateSalaryConfigSchema,
  recordAdvanceSchema,
  recordPayoutSchema,
} = require('../validators/salary.validator');

// All salary endpoints are strictly restricted to Admin only
router.use(authenticateToken, requireRole(['Admin']));

// ==========================================================
// ADMIN ENDPOINTS (Restricted strictly to Admin role)
// ==========================================================
router.get(
  '/overview',
  requireRole(['Admin']),
  salaryController.getMonthlyPayrollOverview
);

router.get(
  '/staff/:userId',
  requireRole(['Admin']),
  salaryController.getStaffSalaryDetails
);

router.post(
  '/config',
  requireRole(['Admin']),
  validate(updateSalaryConfigSchema),
  salaryController.updateSalaryConfig
);

router.post(
  '/advance',
  requireRole(['Admin']),
  validate(recordAdvanceSchema),
  salaryController.recordAdvance
);

router.delete(
  '/advance/:id',
  requireRole(['Admin']),
  salaryController.deleteAdvance
);

router.post(
  '/payout',
  requireRole(['Admin']),
  validate(recordPayoutSchema),
  salaryController.recordSalaryPayout
);

module.exports = router;


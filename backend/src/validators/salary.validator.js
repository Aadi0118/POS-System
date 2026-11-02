/**
 * @file salary.validator.js
 * @description Input validation schemas for salary management, advances, and payouts using Zod.
 */

const { z } = require('zod');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const updateSalaryConfigSchema = z.object({
  body: z.object({
    userId: z.string({
      required_error: 'Employee ID is required',
    }).regex(OBJECT_ID_REGEX, 'Invalid employee ID format'),
    baseSalary: z.number({
      required_error: 'Base monthly salary is required',
    }).min(0, 'Base salary cannot be negative').max(10000000, 'Base salary exceeds maximum threshold'),
    pfEnabled: z.boolean().default(false),
    pfPercentage: z.number().min(0).max(100).default(12),
    employerPfPercentage: z.number().min(0).max(100).default(12),
  }),
});

const recordAdvanceSchema = z.object({
  body: z.object({
    userId: z.string().regex(OBJECT_ID_REGEX, 'Invalid employee ID format'),
    month: z.string().regex(MONTH_REGEX, 'Month must be in YYYY-MM format'),
    date: z.string().regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format'),
    amount: z.number().min(1, 'Advance amount must be at least ₹1').max(1000000),
    paymentMode: z.enum(['Cash', 'UPI', 'Bank Transfer']).default('Cash'),
    reason: z.string().max(200).optional().default('Salary Advance'),
  }),
});

const recordPayoutSchema = z.object({
  body: z.object({
    userId: z.string().regex(OBJECT_ID_REGEX, 'Invalid employee ID format'),
    month: z.string().regex(MONTH_REGEX, 'Month must be in YYYY-MM format'),
    amountPaid: z.number().min(0).max(10000000),
    paymentMode: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Pending']).default('Cash'),
    paymentStatus: z.enum(['Unpaid', 'Partially Paid', 'Paid']),
    notes: z.string().max(300).optional().default(''),
  }),
});

module.exports = {
  updateSalaryConfigSchema,
  recordAdvanceSchema,
  recordPayoutSchema,
};

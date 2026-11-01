/**
 * @file salary.validator.js
 * @description Input validation schemas for salary management, advances, and payouts.
 */

const Joi = require('joi');

const updateSalaryConfigSchema = Joi.object({
  userId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid employee ID format',
    'string.length': 'Employee ID must be 24 hex characters',
    'any.required': 'Employee ID is required',
  }),
  baseSalary: Joi.number().min(0).max(1000000).required().messages({
    'number.base': 'Base salary must be a number',
    'number.min': 'Base salary cannot be negative',
    'any.required': 'Base monthly salary is required',
  }),
  pfEnabled: Joi.boolean().required(),
  pfPercentage: Joi.number().min(0).max(100).default(12),
  employerPfPercentage: Joi.number().min(0).max(100).default(12),
});

const recordAdvanceSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  month: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .required()
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format',
    }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    }),
  amount: Joi.number().min(1).max(500000).required().messages({
    'number.min': 'Advance amount must be at least ₹1',
  }),
  paymentMode: Joi.string()
    .valid('Cash', 'UPI', 'Bank Transfer')
    .default('Cash'),
  reason: Joi.string().max(200).allow('', null).default('Salary Advance'),
});

const recordPayoutSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  month: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .required(),
  amountPaid: Joi.number().min(0).max(1000000).required(),
  paymentMode: Joi.string()
    .valid('Cash', 'UPI', 'Bank Transfer', 'Pending')
    .default('Cash'),
  paymentStatus: Joi.string()
    .valid('Unpaid', 'Partially Paid', 'Paid')
    .required(),
  notes: Joi.string().max(300).allow('', null).default(''),
});

module.exports = {
  updateSalaryConfigSchema,
  recordAdvanceSchema,
  recordPayoutSchema,
};


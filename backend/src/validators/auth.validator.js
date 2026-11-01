/**
 * @file auth.validator.js
 * @description Zod validation schemas for authentication and staff credentials.
 * Enforces 4-digit numeric PIN format and role constraints.
 */

const { z } = require('zod');

// Regex to strictly match a 4-digit numeric PIN
const PIN_REGEX = /^\d{4}$/;
// Standard 24-character hexadecimal MongoDB ObjectId
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const loginSchema = z.object({
  body: z.object({
    staffId: z.string({
      required_error: 'Staff ID is required',
    }).regex(OBJECT_ID_REGEX, 'Invalid staff identifier format'),
    pin: z.string({
      required_error: '4-digit PIN is required',
    }).regex(PIN_REGEX, 'PIN must consist of exactly 4 numeric digits (0000-9999)'),
  }).strict(),
});

const createStaffSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Staff name is required',
    }).trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must not exceed 50 characters'),
    pin: z.string({
      required_error: 'Initial 4-digit PIN is required',
    }).regex(PIN_REGEX, 'PIN must consist of exactly 4 numeric digits'),
    role: z.enum(['Admin', 'Waiter', 'Cook', 'Cleaner'], {
      required_error: 'Role must be Admin, Waiter, Cook, or Cleaner',
    }),
    baseSalary: z.number().min(0).optional(),
    pfEnabled: z.boolean().optional(),
    pfPercentage: z.number().min(0).max(100).optional(),
    employerPfPercentage: z.number().min(0).max(100).optional(),
  }).strict(),
});

const updateStaffSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid user ID'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(50).optional(),
    pin: z.string().regex(PIN_REGEX, 'PIN must consist of exactly 4 numeric digits').optional(),
    role: z.enum(['Admin', 'Waiter', 'Cook', 'Cleaner']).optional(),
    isActive: z.boolean().optional(),
    baseSalary: z.number().min(0).optional(),
    pfEnabled: z.boolean().optional(),
    pfPercentage: z.number().min(0).max(100).optional(),
    employerPfPercentage: z.number().min(0).max(100).optional(),
  }).strict(),
});

module.exports = {
  loginSchema,
  createStaffSchema,
  updateStaffSchema,
};


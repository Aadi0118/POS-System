/**
 * @file attendance.validator.js
 * @description Zod validation schemas for staff attendance actions.
 */

const { z } = require('zod');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_STRING_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_STRING_REGEX = /^\d{4}-\d{2}$/;

const markAttendanceSchema = z.object({
  body: z.object({
    userId: z.string({
      required_error: 'Staff User ID is required',
    }).regex(OBJECT_ID_REGEX, 'Invalid staff User ID format'),
    date: z.string({
      required_error: 'Date (YYYY-MM-DD) is required',
    }).regex(DATE_STRING_REGEX, 'Date must be formatted as YYYY-MM-DD'),
    status: z.enum(['Present', 'Half-Day', 'Absent', 'On Leave'], {
      required_error: 'Status is required',
    }),
    notes: z.string().trim().max(300).optional().default(''),
  }),
});

const markAllAttendanceSchema = z.object({
  body: z.object({
    date: z.string({
      required_error: 'Date (YYYY-MM-DD) is required',
    }).regex(DATE_STRING_REGEX, 'Date must be formatted as YYYY-MM-DD'),
    status: z.enum(['Present', 'Half-Day', 'Absent', 'On Leave']).optional().default('Present'),
    notes: z.string().trim().max(300).optional().default(''),
  }),
});

module.exports = {
  markAttendanceSchema,
  markAllAttendanceSchema,
  OBJECT_ID_REGEX,
  DATE_STRING_REGEX,
  MONTH_STRING_REGEX,
};


/**
 * @file table.validator.js
 * @description Zod validation schemas for table management.
 */

const { z } = require('zod');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const createTableSchema = z.object({
  body: z.object({
    tableNumber: z.number({
      required_error: 'Table number is required',
    }).int().positive('Table number must be a positive integer'),
    capacity: z.number().int().min(1).max(20).optional().default(4),
  }).strict(),
});

const updateTableStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid table ID'),
  }),
  body: z.object({
    status: z.enum(['Available', 'Occupied', 'Dirty'], {
      required_error: 'Table status is required',
    }),
  }).strict(),
});

module.exports = {
  createTableSchema,
  updateTableStatusSchema,
};


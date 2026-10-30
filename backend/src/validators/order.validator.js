/**
 * @file order.validator.js
 * @description Zod validation schemas for order creation, status transitions, and item updates.
 */

const { z } = require('zod');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const orderItemInputSchema = z.object({
  menuItemId: z.string({
    required_error: 'Menu item ID is required',
  }).regex(OBJECT_ID_REGEX, 'Invalid menu item ID format'),
  quantity: z.number({
    required_error: 'Quantity is required',
  }).int().min(1, 'Quantity must be at least 1'),
  notes: z.string().trim().max(200).optional().default(''),
}).strict();

const createOrderSchema = z.object({
  body: z.object({
    tableId: z.string({
      required_error: 'Table ID is required',
    }).regex(OBJECT_ID_REGEX, 'Invalid table ID format'),
    items: z.array(orderItemInputSchema, {
      required_error: 'Items array is required',
    }).min(1, 'Order must contain at least 1 item'),
  }).strict(),
});

const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid order ID'),
  }),
  body: z.object({
    status: z.enum(['Accepted', 'Rejected', 'Ready', 'Completed'], {
      required_error: 'Status is required',
    }),
    rejectionReason: z.string().trim().max(250).optional(),
  }).strict(),
});

const updateOrderItemsSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid order ID'),
  }),
  body: z.object({
    items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 item'),
  }).strict(),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderItemsSchema,
};


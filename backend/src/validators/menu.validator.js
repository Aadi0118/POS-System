/**
 * @file menu.validator.js
 * @description Zod validation schemas for restaurant menu management.
 * Explicitly rejects tandoor items in accordance with project constraints.
 */

const { z } = require('zod');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const ALLOWED_CATEGORIES = [
  'North Indian',
  'Indo-Chinese',
  'South Indian',
  'Street Food',
  'Grills',
  'Biryani',
  'Momos',
  'Beverages',
  'Desserts',
];

const createMenuItemSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Item name is required',
    }).trim().min(2, 'Name must be at least 2 characters').max(100),
    category: z.enum(ALLOWED_CATEGORIES, {
      required_error: 'Category must be one of the permitted multi-cuisine categories',
    }).refine((cat) => !/tandoor|tandoori/i.test(cat), {
      message: 'Tandoor categories are strictly prohibited in this kitchen configuration.',
    }),
    price: z.number({
      required_error: 'Price is required',
    }).positive('Price must be greater than zero'),
    description: z.string().trim().max(300).optional().default(''),
    isAvailable: z.boolean().optional().default(true),
  }).strict(),
});

const updateMenuItemSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid menu item ID'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    category: z.enum(ALLOWED_CATEGORIES).refine((cat) => !/tandoor|tandoori/i.test(cat), {
      message: 'Tandoor categories are strictly prohibited.',
    }).optional(),
    price: z.number().positive().optional(),
    description: z.string().trim().max(300).optional(),
    isAvailable: z.boolean().optional(),
  }).strict(),
});

const updateAvailabilitySchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid menu item ID'),
  }),
  body: z.object({
    isAvailable: z.boolean({
      required_error: 'isAvailable status boolean is required',
    }),
  }).strict(),
});

module.exports = {
  createMenuItemSchema,
  updateMenuItemSchema,
  updateAvailabilitySchema,
};


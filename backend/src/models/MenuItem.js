/**
 * @file MenuItem.js
 * @description Mongoose model for restaurant menu catalog.
 * Covers multi-cuisine offerings (North Indian, Indo-Chinese, South Indian, Street Food, Grills, Biryani, Momos).
 * NOTE: Strictly excludes any tandoor categories as requested.
 */

const mongoose = require('mongoose');

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

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Menu item name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Item category is required'],
      enum: {
        values: ALLOWED_CATEGORIES,
        message: '{VALUE} is not a supported category',
      },
      validate: {
        validator: function (v) {
          // Explicit requirement: Exclude any tandoor categories
          return !/tandoor|tandoori/i.test(v);
        },
        message: 'Tandoor categories are strictly prohibited in this kitchen configuration.',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

menuItemSchema.statics.ALLOWED_CATEGORIES = ALLOWED_CATEGORIES;

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
module.exports = MenuItem;


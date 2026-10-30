/**
 * @file Table.js
 * @description Mongoose model for dining tables.
 * Tracks physical table state: Available, Occupied, or Dirty.
 */

const mongoose = require('mongoose');

const TABLE_STATUSES = ['Available', 'Occupied', 'Dirty'];

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: [true, 'Table number is required'],
      unique: true,
      min: [1, 'Table number must be at least 1'],
    },
    capacity: {
      type: Number,
      default: 4,
      min: [1, 'Capacity must be at least 1 person'],
      max: [20, 'Capacity cannot exceed 20'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: TABLE_STATUSES,
        message: '{VALUE} is not a valid table status',
      },
      default: 'Available',
      index: true,
    },
    currentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

tableSchema.statics.TABLE_STATUSES = TABLE_STATUSES;

const Table = mongoose.model('Table', tableSchema);
module.exports = Table;


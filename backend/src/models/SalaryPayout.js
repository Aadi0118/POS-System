/**
 * @file SalaryPayout.js
 * @description Mongoose model for monthly salary payouts & payment settlement status.
 * Stores payment confirmation, mode, timestamps, and admin audit metadata.
 */

const mongoose = require('mongoose');

const salaryPayoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff member is required'],
      index: true,
    },
    month: {
      type: String, // 'YYYY-MM'
      required: [true, 'Payout month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
      index: true,
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid cannot be negative'],
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Pending'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid'],
      default: 'Unpaid',
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Notes cannot exceed 300 characters'],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Exactly one payout record per staff member per month
salaryPayoutSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('SalaryPayout', salaryPayoutSchema);


/**
 * @file SalaryAdvance.js
 * @description Mongoose model for staff salary advances.
 * Tracks advances disbursed to employees during the month with automatic deduction
 * from final monthly salary settlements.
 */

const mongoose = require('mongoose');

const salaryAdvanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff member is required for advance disbursement'],
      index: true,
    },
    month: {
      type: String, // 'YYYY-MM', e.g., '2026-11'
      required: [true, 'Salary settlement month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Advance disbursement date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    amount: {
      type: Number,
      required: [true, 'Advance amount is required'],
      min: [1, 'Advance amount must be at least 1'],
    },
    paymentMode: {
      type: String,
      enum: {
        values: ['Cash', 'UPI', 'Bank Transfer'],
        message: '{VALUE} is not a valid payment mode',
      },
      default: 'Cash',
    },
    reason: {
      type: String,
      trim: true,
      default: 'Salary Advance',
      maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
    status: {
      type: String,
      enum: ['Pending Deduction', 'Deducted'],
      default: 'Pending Deduction',
      index: true,
    },
    disbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

salaryAdvanceSchema.index({ userId: 1, month: 1 });

module.exports = mongoose.model('SalaryAdvance', salaryAdvanceSchema);


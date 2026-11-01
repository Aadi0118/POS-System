/**
 * @file Attendance.js
 * @description Mongoose model for staff daily attendance.
 * Managed exclusively by Admin.
 * Tracks daily status: Present, Half-Day, Absent, On Leave.
 * No shift timing required.
 */

const mongoose = require('mongoose');

const ATTENDANCE_STATUSES = ['Present', 'Half-Day', 'Absent', 'On Leave'];

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff member reference is required'],
      index: true,
    },
    dateString: {
      type: String,
      required: [true, 'Date string (YYYY-MM-DD) is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Attendance status is required'],
      enum: {
        values: ATTENDANCE_STATUSES,
        message: '{VALUE} is not a valid attendance status',
      },
      default: 'Present',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin user reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Enforce strictly one attendance record per staff member per day
attendanceSchema.index({ userId: 1, dateString: 1 }, { unique: true });

attendanceSchema.statics.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;


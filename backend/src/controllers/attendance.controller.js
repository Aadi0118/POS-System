/**
 * @file attendance.controller.js
 * @description Administrative attendance controller.
 * Restricted exclusively to Admin.
 * Handles daily roster marking, bulk daily marking, and monthly analytics.
 * Strictly no shift timings.
 */

const Attendance = require('../models/Attendance');
const User = require('../models/User');

/**
 * Helper to get current date string in YYYY-MM-DD format
 */
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Retrieves daily attendance sheet for all active staff personnel.
 * Defaults to current date if not specified.
 */
const getDailyAttendance = async (req, res, next) => {
  try {
    const date = req.query.date || getTodayDateString();

    // Fetch all active staff personnel (excluding Admins)
    const staffMembers = await User.find({
      role: { $in: ['Waiter', 'Cook', 'Cleaner'] },
      isActive: true,
    })
      .select('name role isActive')
      .sort({ role: 1, name: 1 })
      .lean();

    // Fetch existing attendance records for the specified date
    const attendanceRecords = await Attendance.find({ dateString: date })
      .populate('markedBy', 'name')
      .lean();

    const attendanceMap = new Map(
      attendanceRecords.map((record) => [record.userId.toString(), record])
    );

    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let unmarkedCount = 0;

    const roster = staffMembers.map((staff) => {
      const record = attendanceMap.get(staff._id.toString());
      if (record) {
        if (record.status === 'Present') presentCount++;
        else if (record.status === 'Half-Day') halfDayCount++;
        else if (record.status === 'Absent') absentCount++;
        else if (record.status === 'On Leave') leaveCount++;

        return {
          staffId: staff._id,
          name: staff.name,
          role: staff.role,
          attendanceId: record._id,
          status: record.status,
          notes: record.notes || '',
          markedBy: record.markedBy?.name || 'Admin',
          updatedAt: record.updatedAt,
        };
      } else {
        unmarkedCount++;
        return {
          staffId: staff._id,
          name: staff.name,
          role: staff.role,
          attendanceId: null,
          status: 'Not Marked',
          notes: '',
          markedBy: null,
          updatedAt: null,
        };
      }
    });

    const totalStaff = staffMembers.length;
    const effectivePresent = presentCount + halfDayCount * 0.5;
    const attendanceRate =
      totalStaff > 0 ? Math.round((effectivePresent / totalStaff) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        date,
        stats: {
          totalStaff,
          presentCount,
          halfDayCount,
          absentCount,
          leaveCount,
          unmarkedCount,
          attendanceRate,
        },
        roster,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks or updates attendance for an individual staff member.
 */
const markAttendance = async (req, res, next) => {
  try {
    const { userId, date, status, notes } = req.body;
    const adminId = req.user.id;

    // Verify staff exists and is valid
    const staff = await User.findById(userId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found',
      });
    }

    const normalizedDate = new Date(`${date}T00:00:00.000Z`);

    const record = await Attendance.findOneAndUpdate(
      { userId, dateString: date },
      {
        userId,
        dateString: date,
        date: normalizedDate,
        status,
        notes: notes || '',
        markedBy: adminId,
      },
      { upsert: true, new: true, runValidators: true }
    )
      .populate('userId', 'name role')
      .populate('markedBy', 'name');

    // Real-time broadcast to Admin sockets
    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:updated', {
        date,
        record,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Marked '${staff.name}' as ${status} for ${date}`,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk action: Marks all active staff members with a status for the date.
 * (e.g., Quick "Mark All Present" button)
 */
const markAllAttendance = async (req, res, next) => {
  try {
    const { date, status = 'Present', notes = '' } = req.body;
    const adminId = req.user.id;

    const staffMembers = await User.find({
      role: { $in: ['Waiter', 'Cook', 'Cleaner'] },
      isActive: true,
    });

    if (staffMembers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active staff members found to mark.',
      });
    }

    const normalizedDate = new Date(`${date}T00:00:00.000Z`);

    const bulkOps = staffMembers.map((staff) => ({
      updateOne: {
        filter: { userId: staff._id, dateString: date },
        update: {
          $set: {
            userId: staff._id,
            dateString: date,
            date: normalizedDate,
            status,
            notes: notes || '',
            markedBy: adminId,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(bulkOps);

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:updated', { date, bulk: true });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully marked all ${staffMembers.length} staff as ${status} for ${date}`,
      count: staffMembers.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves monthly attendance summary and statistics per staff member.
 */
const getMonthlySummary = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = req.query.month || currentMonth; // Format: YYYY-MM

    const staffMembers = await User.find({
      role: { $in: ['Waiter', 'Cook', 'Cleaner'] },
      isActive: true,
    })
      .select('name role')
      .sort({ role: 1, name: 1 })
      .lean();

    // Query all records for this month using regex on dateString
    const records = await Attendance.find({
      dateString: { $regex: `^${month}` },
    }).lean();

    // Aggregate records per staff
    const staffSummaryMap = new Map();
    staffMembers.forEach((s) => {
      staffSummaryMap.set(s._id.toString(), {
        staffId: s._id,
        name: s.name,
        role: s.role,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        leaveDays: 0,
        totalMarkedDays: 0,
        attendanceRate: 0,
      });
    });

    records.forEach((rec) => {
      const summary = staffSummaryMap.get(rec.userId.toString());
      if (summary) {
        summary.totalMarkedDays++;
        if (rec.status === 'Present') summary.presentDays++;
        else if (rec.status === 'Half-Day') summary.halfDays++;
        else if (rec.status === 'Absent') summary.absentDays++;
        else if (rec.status === 'On Leave') summary.leaveDays++;
      }
    });

    const summaryList = Array.from(staffSummaryMap.values()).map((item) => {
      const effectiveDays = item.presentDays + item.halfDays * 0.5;
      const rate =
        item.totalMarkedDays > 0
          ? Math.round((effectiveDays / item.totalMarkedDays) * 100)
          : 0;
      return {
        ...item,
        attendanceRate: rate,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        month,
        summaries: summaryList,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves detailed chronological logs for a specific staff member.
 */
const getStaffHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = req.query.month || currentMonth;

    const staff = await User.findById(userId).select('name role isActive');
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found',
      });
    }

    const history = await Attendance.find({
      userId,
      dateString: { $regex: `^${month}` },
    })
      .sort({ dateString: -1 })
      .populate('markedBy', 'name')
      .lean();

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    history.forEach((h) => {
      if (h.status === 'Present') presentDays++;
      else if (h.status === 'Half-Day') halfDays++;
      else if (h.status === 'Absent') absentDays++;
      else if (h.status === 'On Leave') leaveDays++;
    });

    const totalDays = history.length;
    const effectiveDays = presentDays + halfDays * 0.5;
    const rate = totalDays > 0 ? Math.round((effectiveDays / totalDays) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        staff: {
          id: staff._id,
          name: staff.name,
          role: staff.role,
        },
        month,
        stats: {
          totalDays,
          presentDays,
          halfDays,
          absentDays,
          leaveDays,
          attendanceRate: rate,
        },
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyAttendance,
  markAttendance,
  markAllAttendance,
  getMonthlySummary,
  getStaffHistory,
};


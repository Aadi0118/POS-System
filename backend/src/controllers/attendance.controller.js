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

    // Fetch all active staff personnel (excluding Admins) with salary & PF details
    const staffMembers = await User.find({
      role: { $in: ['Waiter', 'Cook', 'Cleaner'] },
      isActive: true,
    })
      .select('name role isActive baseSalary pfEnabled pfPercentage employerPfPercentage')
      .sort({ role: 1, name: 1 })
      .lean();

    // Fetch existing attendance records for the specified date
    const attendanceRecords = await Attendance.find({ dateString: date })
      .populate('markedBy', 'name')
      .lean();

    const attendanceMap = new Map(
      attendanceRecords.map((record) => [record.userId.toString(), record])
    );

    // Calculate total days in the month of the specified date for accurate daily rate
    const [yearStr, monthStr] = date.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let unmarkedCount = 0;
    let totalSalaryIncurredToday = 0;

    const roster = staffMembers.map((staff) => {
      const record = attendanceMap.get(staff._id.toString());
      const status = record ? record.status : 'Not Marked';

      if (status === 'Present') presentCount++;
      else if (status === 'Half-Day') halfDayCount++;
      else if (status === 'Absent') absentCount++;
      else if (status === 'On Leave') leaveCount++;
      else unmarkedCount++;

      const baseSalary = staff.baseSalary || 0;
      const pfEnabled = typeof staff.pfEnabled === 'boolean' ? staff.pfEnabled : false;
      const pfEmpPct = staff.pfPercentage || 12;
      const pfEmprPct = staff.employerPfPercentage || 12;

      // PF is calculated on 40% of total salary
      const monthlyPfWage = baseSalary * 0.40;
      const monthlyEmpPf = pfEnabled ? Math.round(monthlyPfWage * (pfEmpPct / 100)) : 0;
      const monthlyEmprPf = pfEnabled ? Math.round(monthlyPfWage * (pfEmprPct / 100)) : 0;
      const monthlyNetSalary = Math.max(0, baseSalary - monthlyEmpPf);

      const dailyRate = totalDaysInMonth > 0 ? Math.round((baseSalary / totalDaysInMonth) * 100) / 100 : 0;
      const dailyTotalSalary = dailyRate;
      const dailyNetSalary = totalDaysInMonth > 0 ? Math.round((monthlyNetSalary / totalDaysInMonth) * 100) / 100 : 0;
      const dailyEmpPf = totalDaysInMonth > 0 ? Math.round((monthlyEmpPf / totalDaysInMonth) * 100) / 100 : 0;
      const dailyEmprPf = totalDaysInMonth > 0 ? Math.round((monthlyEmprPf / totalDaysInMonth) * 100) / 100 : 0;

      let earnedToday = 0;
      if (status === 'Present') {
        earnedToday = dailyRate;
      } else if (status === 'Half-Day') {
        earnedToday = Math.round(dailyRate * 0.5 * 100) / 100;
      } else {
        earnedToday = 0;
      }

      totalSalaryIncurredToday += earnedToday;

      return {
        staffId: staff._id,
        _id: staff._id,
        name: staff.name,
        role: staff.role,
        isActive: staff.isActive,
        baseSalary,
        pfEnabled,
        pfPercentage: pfEmpPct,
        employerPfPercentage: pfEmprPct,
        monthlyNetSalary,
        monthlyEmpPf,
        monthlyEmprPf,
        dailyRate,
        dailyTotalSalary,
        dailyNetSalary,
        dailyEmpPf,
        dailyEmprPf,
        earnedToday: Math.round(earnedToday * 100) / 100,
        attendanceId: record ? record._id : null,
        status,
        attendance: {
          status,
          notes: record?.notes || '',
          markedBy: record?.markedBy?.name || 'Admin',
          updatedAt: record?.updatedAt || null,
        },
        notes: record ? (record.notes || '') : '',
        markedBy: record ? (record.markedBy?.name || 'Admin') : null,
        updatedAt: record ? record.updatedAt : null,
      };
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
          totalSalaryIncurredToday: Math.round(totalSalaryIncurredToday * 100) / 100,
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

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    const staffMembers = await User.find({
      role: { $in: ['Waiter', 'Cook', 'Cleaner'] },
      isActive: true,
    })
      .select('name role baseSalary pfEnabled pfPercentage employerPfPercentage')
      .sort({ role: 1, name: 1 })
      .lean();

    // Query all records for this month using regex on dateString
    const records = await Attendance.find({
      dateString: { $regex: `^${month}` },
    }).lean();

    // Aggregate records per staff
    const staffSummaryMap = new Map();
    staffMembers.forEach((s) => {
      const bSalary = s.baseSalary || 0;
      const dRate = totalDaysInMonth > 0 ? Math.round((bSalary / totalDaysInMonth) * 100) / 100 : 0;
      staffSummaryMap.set(s._id.toString(), {
        staffId: s._id,
        name: s.name,
        role: s.role,
        baseSalary: bSalary,
        dailyRate: dRate,
        pfEnabled: typeof s.pfEnabled === 'boolean' ? s.pfEnabled : false,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        leaveDays: 0,
        totalMarkedDays: 0,
        attendanceRate: 0,
        grossEarned: 0,
      });
    });

    records.forEach((rec) => {
      const summary = staffSummaryMap.get(rec.userId.toString());
      if (summary) {
        summary.totalMarkedDays++;
        if (rec.status === 'Present') {
          summary.presentDays++;
          summary.grossEarned += summary.dailyRate;
        } else if (rec.status === 'Half-Day') {
          summary.halfDays++;
          summary.grossEarned += Math.round(summary.dailyRate * 0.5 * 100) / 100;
        } else if (rec.status === 'Absent') {
          summary.absentDays++;
        } else if (rec.status === 'On Leave') {
          summary.leaveDays++;
        }
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
        grossEarned: Math.round(item.grossEarned * 100) / 100,
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

    const staff = await User.findById(userId).select('name role isActive baseSalary pfEnabled pfPercentage employerPfPercentage');
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

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    const baseSalary = staff.baseSalary || 0;
    const pfEnabled = typeof staff.pfEnabled === 'boolean' ? staff.pfEnabled : false;
    const pfEmpPct = staff.pfPercentage || 12;
    const pfEmprPct = staff.employerPfPercentage || 12;

    // PF is calculated on 40% of total salary
    const monthlyPfWage = baseSalary * 0.40;
    const monthlyEmpPf = pfEnabled ? Math.round(monthlyPfWage * (pfEmpPct / 100)) : 0;
    const monthlyEmprPf = pfEnabled ? Math.round(monthlyPfWage * (pfEmprPct / 100)) : 0;
    const monthlyNetSalary = Math.max(0, baseSalary - monthlyEmpPf);

    const dailyRate = totalDaysInMonth > 0 ? Math.round((baseSalary / totalDaysInMonth) * 100) / 100 : 0;
    const dailyTotalSalary = dailyRate;
    const dailyNetSalary = totalDaysInMonth > 0 ? Math.round((monthlyNetSalary / totalDaysInMonth) * 100) / 100 : 0;
    const dailyEmpPf = totalDaysInMonth > 0 ? Math.round((monthlyEmpPf / totalDaysInMonth) * 100) / 100 : 0;
    const dailyEmprPf = totalDaysInMonth > 0 ? Math.round((monthlyEmprPf / totalDaysInMonth) * 100) / 100 : 0;

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let totalEarned = 0;

    const enrichedHistory = history.map((h) => {
      let earned = 0;
      if (h.status === 'Present') {
        presentDays++;
        earned = dailyRate;
      } else if (h.status === 'Half-Day') {
        halfDays++;
        earned = Math.round(dailyRate * 0.5 * 100) / 100;
      } else if (h.status === 'Absent') {
        absentDays++;
        earned = 0;
      } else if (h.status === 'On Leave') {
        leaveDays++;
        earned = 0;
      }

      totalEarned += earned;

      return {
        ...h,
        dailyRate,
        dailyTotalSalary,
        dailyNetSalary,
        dailyEmpPf,
        dailyEmprPf,
        earnedAmount: Math.round(earned * 100) / 100,
      };
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
          baseSalary,
          pfEnabled,
          dailyRate,
          dailyNetSalary,
          dailyEmpPf,
          dailyEmprPf,
        },
        month,
        stats: {
          totalDays,
          presentDays,
          halfDays,
          absentDays,
          leaveDays,
          attendanceRate: rate,
          totalEarned: Math.round(totalEarned * 100) / 100,
        },
        history: enrichedHistory,
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


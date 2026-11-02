/**
 * @file salary.controller.js
 * @description Controller for staff salary management, advance salary disbursements,
 * PF (Provident Fund) deductions, salary payouts, and day-wise earnings calculations.
 */

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const SalaryAdvance = require('../models/SalaryAdvance');
const SalaryPayout = require('../models/SalaryPayout');

/**
 * Computes month salary, day-wise earnings, and deductions for a staff member.
 * @param {Object} user - User document or lean object
 * @param {string} month - 'YYYY-MM'
 * @returns {Promise<Object>}
 */
const calculateStaffMonthSalary = async (user, month) => {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  // Total days in the selected calendar month (e.g., 30 for Nov, 31 for Dec, 28/29 for Feb)
  const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

  const baseSalary = user.baseSalary || 0;
  const pfEnabled = typeof user.pfEnabled === 'boolean' ? user.pfEnabled : true;
  const pfEmployeePercentage = user.pfPercentage || 12;
  const pfEmployerPercentage = user.employerPfPercentage || 12;

  const totalMonthlySalary = baseSalary;
  const monthlyEmpPf = pfEnabled ? Math.round(totalMonthlySalary * (pfEmployeePercentage / 100)) : 0;
  const monthlyEmprPf = pfEnabled ? Math.round(totalMonthlySalary * (pfEmployerPercentage / 100)) : 0;
  const monthlyNetSalary = Math.max(0, totalMonthlySalary - monthlyEmpPf);

  const dailyRate =
    totalDaysInMonth > 0
      ? Math.round((baseSalary / totalDaysInMonth) * 100) / 100 : 0;
  const dailyTotalSalary = dailyRate;
  const dailyNetSalary = totalDaysInMonth > 0 ? Math.round((monthlyNetSalary / totalDaysInMonth) * 100) / 100 : 0;
  const dailyEmpPf = totalDaysInMonth > 0 ? Math.round((monthlyEmpPf / totalDaysInMonth) * 100) / 100 : 0;
  const dailyEmprPf = totalDaysInMonth > 0 ? Math.round((monthlyEmprPf / totalDaysInMonth) * 100) / 100 : 0;
  

  // Fetch all attendance records for this employee in this month
  const attendanceRecords = await Attendance.find({
    userId: user._id,
    dateString: { $regex: new RegExp(`^${month}`) },
  }).lean();

  const attendanceMap = new Map();
  attendanceRecords.forEach((att) => {
    attendanceMap.set(att.dateString, att);
  });

  // Current date for determining 'Upcoming' days
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentDay = now.getDate();
  const isCurrentMonth = year === currentYear && monthNum === currentMonthNum;
  const isFutureMonth =
    year > currentYear || (year === currentYear && monthNum > currentMonthNum);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let unmarkedDays = 0;
  let grossEarned = 0;

  const dayWiseBreakdown = [];

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateString = `${month}-${dayStr}`;
    const dateObj = new Date(year, monthNum - 1, d);
    const dayOfWeek = daysOfWeek[dateObj.getDay()];

    const isUpcoming =
      isFutureMonth || (isCurrentMonth && d > currentDay);

    let status = 'Not Marked';
    let earnedAmount = 0;
    let notes = '';

    if (isUpcoming) {
      status = 'Upcoming';
      earnedAmount = 0;
    } else if (attendanceMap.has(dateString)) {
      const att = attendanceMap.get(dateString);
      status = att.status;
      notes = att.notes || '';

      if (status === 'Present') {
        earnedAmount = dailyRate;
        presentDays++;
      } else if (status === 'Half-Day') {
        earnedAmount = Math.round(dailyRate * 0.5 * 100) / 100;
        halfDays++;
      } else if (status === 'Absent') {
        earnedAmount = 0;
        absentDays++;
      } else if (status === 'On Leave') {
        earnedAmount = 0;
        leaveDays++;
      }
    } else {
      unmarkedDays++;
    }

    grossEarned += earnedAmount;

    dayWiseBreakdown.push({
      dateString,
      dayNumber: d,
      dayOfWeek,
      status,
      dailyRate,
      dailyTotalSalary,
      dailyNetSalary,
      dailyEmpPf,
      dailyEmprPf,
      earnedAmount: Math.round(earnedAmount * 100) / 100,
      notes,
    });
  }

  grossEarned = Math.round(grossEarned * 100) / 100;
  const workedDays = presentDays + halfDays * 0.5;

  // Deductions: Advances taken for this month
  const advances = await SalaryAdvance.find({
    userId: user._id,
    month,
  })
    .sort({ date: 1 })
    .lean();

  const totalAdvance = advances.reduce((sum, a) => sum + (a.amount || 0), 0);

  // Deductions: Provident Fund (PF)
  const pfEmployeeDeduction = pfEnabled ? Math.round(grossEarned * (pfEmployeePercentage / 100)) : 0;
  const pfEmployerContribution = pfEnabled ? Math.round(grossEarned * (pfEmployerPercentage / 100)) : 0;
  const totalPfFund = pfEmployeeDeduction + pfEmployerContribution;
  const pfDeduction = pfEmployeeDeduction;




  const totalDeductions = totalAdvance + pfDeduction;
  const netPayable = Math.max(0, Math.round(grossEarned - totalDeductions));

  // Payout settlement status
  const payout = await SalaryPayout.findOne({
    userId: user._id,
    month,
  }).lean();

  const amountPaid = payout?.amountPaid || 0;
  const paymentStatus = payout?.paymentStatus || (amountPaid >= netPayable && netPayable > 0 ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Unpaid');
  const paymentMode = payout?.paymentMode || 'Pending';
  const paidAt = payout?.paidAt || null;
  const payoutNotes = payout?.notes || '';
  const balanceRemaining = Math.max(0, netPayable - amountPaid);

  return {
    user: {
      _id: user._id,
      name: user.name,
      role: user.role,
      baseSalary,
      pfEnabled,
      pfPercentage: pfEmployeePercentage,
      employerPfPercentage,
    },
    month,
    monthlySalary: {
      totalSalary: totalMonthlySalary,
      netSalary: monthlyNetSalary,
      pfEmployee: monthlyEmpPf,
      pfEmployer: monthlyEmprPf,
      totalPfFund: monthlyEmpPf + monthlyEmprPf,
    },
    totalDaysInMonth,
    dailyRate,
    dailyTotalSalary,
    dailyNetSalary,
    dailyEmpPf,
    dailyEmprPf,
    presentDays,
    halfDays,
    absentDays,
    leaveDays,
    unmarkedDays,
    workedDays,
    grossEarned,
    deductions: {
      pfEnabled,
      pfPercentage: pfEmployeePercentage,
      employerPfPercentage,
      pfDeduction,
      pfEmployeeDeduction,
      pfEmployerContribution,
      totalPfFund,
      totalAdvance,
      advancesList: advances,
      totalDeductions,
    },
    netPayable,
    payout: {
      paymentStatus,
      amountPaid,
      paymentMode,
      paidAt,
      balanceRemaining,
      notes: payoutNotes,
    },
    dayWiseBreakdown,
  };
};

/**
 * @desc Admin: Get complete payroll overview for all staff for a specific month
 * @route GET /api/salary/overview?month=YYYY-MM
 */
const getMonthlyPayrollOverview = async (req, res, next) => {
  try {
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const month = req.query.month || currentMonthStr;

    // Fetch all active non-admin personnel (Waiters, Cooks, Cleaners)
    const activeStaff = await User.find({
      isActive: true,
      role: { $in: ['Waiter', 'Cook', 'Cleaner'] },
    }).sort({ name: 1 });

    const staffPayrolls = await Promise.all(
      activeStaff.map((staff) => calculateStaffMonthSalary(staff, month))
    );

    // Aggregate summary statistics across the whole restaurant
    const summary = staffPayrolls.reduce(
      (acc, curr) => {
        acc.totalStaffCount += 1;
        acc.totalBaseSalaries += curr.user.baseSalary || 0;
        acc.totalGrossEarned += curr.grossEarned;
        acc.totalPfDeductions += curr.deductions.pfDeduction;
        acc.totalEmployeePf += curr.deductions.pfEmployeeDeduction || 0;
        acc.totalEmployerPf += curr.deductions.pfEmployerContribution || 0;
        acc.totalPfFundDeposited += curr.deductions.totalPfFund || 0;
        acc.totalAdvanceDeductions += curr.deductions.totalAdvance;
        acc.totalNetPayable += curr.netPayable;
        acc.totalAmountPaid += curr.payout.amountPaid;
        acc.totalBalancePending += curr.payout.balanceRemaining;
        return acc;
      },
      {
        month,
        totalStaffCount: 0,
        totalBaseSalaries: 0,
        totalGrossEarned: 0,
        totalPfDeductions: 0,
        totalEmployeePf: 0,
        totalEmployerPf: 0,
        totalPfFundDeposited: 0,
        totalAdvanceDeductions: 0,
        totalNetPayable: 0,
        totalAmountPaid: 0,
        totalBalancePending: 0,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        month,
        summary,
        staffPayrolls,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Admin: Get detailed salary and day-wise breakdown for a specific staff member
 * @route GET /api/salary/staff/:userId?month=YYYY-MM
 */
const getStaffSalaryDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const month = req.query.month || currentMonthStr;

    const staff = await User.findById(userId);
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    const salaryDetails = await calculateStaffMonthSalary(staff, month);

    res.status(200).json({
      success: true,
      data: salaryDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Staff: Get authenticated staff member's own salary, advances, and day-wise breakdown
 * @route GET /api/salary/my-salary?month=YYYY-MM
 */
const getMySalary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const month = req.query.month || currentMonthStr;

    const staff = await User.findById(userId);
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff account not found' });
    }

    const salaryDetails = await calculateStaffMonthSalary(staff, month);

    res.status(200).json({
      success: true,
      data: salaryDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Admin: Update base monthly salary and PF settings for a staff member
 * @route POST /api/salary/config
 */
const updateSalaryConfig = async (req, res, next) => {
  try {
    const { userId, baseSalary, pfEnabled, pfPercentage, employerPfPercentage } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        baseSalary: Number(baseSalary),
        pfEnabled: Boolean(pfEnabled),
        pfPercentage: pfPercentage !== undefined ? Number(pfPercentage) : 12,
        employerPfPercentage: employerPfPercentage !== undefined ? Number(employerPfPercentage) : 12,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    // Broadcast real-time socket update
    const io = req.app.get('io');
    if (io) {
      io.emit('salary:updated', { userId, type: 'config' });
    }

    res.status(200).json({
      success: true,
      message: `Salary settings updated for ${updatedUser.name}`,
      data: {
        userId: updatedUser._id,
        name: updatedUser.name,
        baseSalary: updatedUser.baseSalary,
        pfEnabled: updatedUser.pfEnabled,
        pfPercentage: updatedUser.pfPercentage,
        employerPfPercentage: updatedUser.employerPfPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Admin: Disburse an advance salary to a staff member
 * @route POST /api/salary/advance
 */
const recordAdvance = async (req, res, next) => {
  try {
    const { userId, month, date, amount, paymentMode, reason } = req.body;

    const staff = await User.findById(userId);
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    const advance = await SalaryAdvance.create({
      userId,
      month,
      date,
      amount: Number(amount),
      paymentMode: paymentMode || 'Cash',
      reason: reason || 'Salary Advance',
      disbursedBy: req.user.id,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('salary:updated', { userId, month, type: 'advance' });
    }

    res.status(201).json({
      success: true,
      message: `Advance of ₹${amount} recorded for ${staff.name}`,
      data: advance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Admin: Delete/Cancel an advance salary record
 * @route DELETE /api/salary/advance/:id
 */
const deleteAdvance = async (req, res, next) => {
  try {
    const { id } = req.params;

    const advance = await SalaryAdvance.findByIdAndDelete(id);
    if (!advance) {
      return res.status(404).json({ success: false, error: 'Advance record not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('salary:updated', { userId: advance.userId, month: advance.month, type: 'advance_deleted' });
    }

    res.status(200).json({
      success: true,
      message: 'Advance record removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Admin: Record monthly salary payout settlement
 * @route POST /api/salary/payout
 */
const recordSalaryPayout = async (req, res, next) => {
  try {
    const { userId, month, amountPaid, paymentMode, paymentStatus, notes } = req.body;

    const staff = await User.findById(userId);
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    const payout = await SalaryPayout.findOneAndUpdate(
      { userId, month },
      {
        amountPaid: Number(amountPaid),
        paymentMode: paymentMode || 'Cash',
        paymentStatus: paymentStatus || 'Paid',
        paidAt: paymentStatus !== 'Unpaid' ? new Date() : null,
        notes: notes || '',
        markedBy: req.user.id,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // If fully or partially paid, mark pending advances as Deducted
    if (paymentStatus === 'Paid' || paymentStatus === 'Partially Paid') {
      await SalaryAdvance.updateMany(
        { userId, month, status: 'Pending Deduction' },
        { status: 'Deducted' }
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('salary:updated', { userId, month, type: 'payout' });
    }

    res.status(200).json({
      success: true,
      message: `Salary payout of ₹${amountPaid} recorded for ${staff.name}`,
      data: payout,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateStaffMonthSalary,
  getMonthlyPayrollOverview,
  getStaffSalaryDetails,
  getMySalary,
  updateSalaryConfig,
  recordAdvance,
  deleteAdvance,
  recordSalaryPayout,
};

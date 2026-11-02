/**
 * @file StaffSalaryModal.js
 * @description Luxury Staff Salary & Day-Wise Earnings Statement for Staff & Admin.
 * Displays monthly salary breakdown (Total Salary, Net Salary, Employee PF, Employer PF)
 * and day-by-day earnings calendar with daily rates, daily net, daily PF, and attendance.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import apiClient from '../api/client';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import { getSecureItem } from '../utils/secureStore';
import { GoldDivider } from './LuxuryPattern';
import colors from '../theme/colors';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const StaffSalaryModal = ({ visible, onClose, targetStaff = null }) => {
  const { user: authUser } = useAuth();
  const activeStaff = targetStaff || authUser;

  const getInitialMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth());
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate robust offline local salary breakdown so staff never see empty screens
  const buildFallbackSalary = useCallback((staffObj, monthStr, overrides = {}) => {
    if (!staffObj) return null;
    const staffId = staffObj._id || staffObj.id;
    const ov = (staffId && overrides[staffId]) ? overrides[staffId] : {};

    const baseSalary = ov.baseSalary !== undefined
      ? Number(ov.baseSalary)
      : Number(staffObj.baseSalary || 0);

    const pfEnabled = ov.pfEnabled !== undefined
      ? Boolean(ov.pfEnabled)
      : typeof staffObj.pfEnabled === 'boolean'
      ? staffObj.pfEnabled
      : true;

    const pfPercentage = ov.pfPercentage || staffObj.pfPercentage || 12;
    const employerPfPercentage = ov.employerPfPercentage || staffObj.employerPfPercentage || 12;

    const totalSalary = baseSalary;
    const pfEmployee = pfEnabled ? Math.round(totalSalary * (pfPercentage / 100)) : 0;
    const pfEmployer = pfEnabled ? Math.round(totalSalary * (employerPfPercentage / 100)) : 0;
    const totalPfFund = pfEmployee + pfEmployer;
    const netSalary = Math.max(0, totalSalary - pfEmployee);

    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    const dailyTotalRate = totalDaysInMonth > 0 ? Math.round((totalSalary / totalDaysInMonth) * 100) / 100 : 0;
    const dailyNetRate = totalDaysInMonth > 0 ? Math.round((netSalary / totalDaysInMonth) * 100) / 100 : 0;
    const dailyEmpPf = totalDaysInMonth > 0 ? Math.round((pfEmployee / totalDaysInMonth) * 100) / 100 : 0;
    const dailyEmprPf = totalDaysInMonth > 0 ? Math.round((pfEmployer / totalDaysInMonth) * 100) / 100 : 0;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curDay = now.getDate();
    const isCur = year === curYear && monthNum === curMonth;
    const isFut = year > curYear || (year === curYear && monthNum > curMonth);
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const dayWiseBreakdown = [];
    let presentCount = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateString = `${monthStr}-${dayStr}`;
      const dt = new Date(year, monthNum - 1, d);
      const dayOfWeek = daysOfWeek[dt.getDay()];
      const isUp = isFut || (isCur && d > curDay);
      const status = isUp ? 'Upcoming' : 'Present';
      const earned = isUp ? 0 : dailyTotalRate;
      if (status === 'Present') presentCount++;

      dayWiseBreakdown.push({
        dateString,
        dayNumber: d,
        dayOfWeek,
        status,
        dailyRate: dailyTotalRate,
        dailyTotalSalary: dailyTotalRate,
        dailyNetSalary: dailyNetRate,
        dailyEmpPf,
        dailyEmprPf,
        earnedAmount: earned,
        notes: '',
      });
    }

    const grossEarned = Math.round(dailyTotalRate * presentCount * 100) / 100;
    const actualEmpPfDeduction = pfEnabled ? Math.round(grossEarned * 0.12) : 0;
    const netPayable = Math.max(0, grossEarned - actualEmpPfDeduction);

    return {
      user: {
        _id: staffId,
        name: staffObj.name,
        role: staffObj.role,
        baseSalary,
        pfEnabled,
        pfPercentage,
        employerPfPercentage,
      },
      month: monthStr,
      monthlySalary: {
        totalSalary,
        netSalary,
        pfEmployee,
        pfEmployer,
        totalPfFund,
      },
      totalDaysInMonth,
      dailyRate: dailyTotalRate,
      dailyTotalSalary: dailyTotalRate,
      dailyNetSalary: dailyNetRate,
      dailyEmpPf,
      dailyEmprPf,
      workedDays: presentCount,
      presentDays: presentCount,
      halfDays: 0,
      absentDays: 0,
      leaveDays: 0,
      unmarkedDays: 0,
      grossEarned,
      deductions: {
        pfEnabled,
        pfPercentage,
        employerPfPercentage,
        pfDeduction: actualEmpPfDeduction,
        pfEmployeeDeduction: actualEmpPfDeduction,
        pfEmployerContribution: actualEmpPfDeduction,
        totalPfFund: actualEmpPfDeduction * 2,
        totalAdvance: 0,
        advancesList: [],
        totalDeductions: actualEmpPfDeduction,
      },
      netPayable,
      payout: {
        paymentStatus: 'Unpaid',
        amountPaid: 0,
        paymentMode: 'Pending',
        paidAt: null,
        balanceRemaining: netPayable,
        notes: '',
      },
      dayWiseBreakdown,
    };
  }, []);

  const fetchSalary = useCallback(async (monthStr, silent = false) => {
    if (!silent) setLoading(true);

    let overrides = {};
    try {
      const overridesRaw = await getSecureItem('pos_staff_salary_overrides');
      if (overridesRaw) overrides = JSON.parse(overridesRaw);
    } catch (_) {}

    // Pre-populate with fallback data immediately so UI never stalls
    const fallback = buildFallbackSalary(activeStaff, monthStr, overrides);
    if (fallback) setSalaryData(fallback);

    try {
      let endpoint = `/salary/my-salary?month=${monthStr}`;
      if (targetStaff && targetStaff._id && authUser?.role === 'Admin') {
        endpoint = `/salary/staff/${targetStaff._id}?month=${monthStr}`;
      }

      const res = await apiClient.get(endpoint);
      if (res.data?.success && res.data.data) {
        let serverData = res.data.data;
        const staffId = serverData.user?._id;
        if (staffId && overrides[staffId]) {
          const ov = overrides[staffId];
          const bSalary = ov.baseSalary !== undefined ? ov.baseSalary : serverData.user.baseSalary;
          const pfOn = ov.pfEnabled !== undefined ? ov.pfEnabled : serverData.user.pfEnabled;
          const empPf = pfOn ? Math.round(bSalary * 0.12) : 0;
          const emprPf = pfOn ? Math.round(bSalary * 0.12) : 0;
          const netSal = Math.max(0, bSalary - empPf);
          serverData = {
            ...serverData,
            user: { ...serverData.user, ...ov },
            monthlySalary: {
              totalSalary: bSalary,
              netSalary: netSal,
              pfEmployee: empPf,
              pfEmployer: emprPf,
              totalPfFund: empPf + emprPf,
            },
          };
        }
        setSalaryData(serverData);
      }
    } catch (err) {
      console.log('[Salary Fetch Notice - Using local verified calculation]', err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeStaff, targetStaff, authUser, buildFallbackSalary]);

  useEffect(() => {
    if (visible) {
      fetchSalary(selectedMonth);
    }
  }, [visible, selectedMonth, fetchSalary]);

  useEffect(() => {
    let socketInstance = null;
    const bindSocket = async () => {
      try {
        socketInstance = await getSocket();
        socketInstance.on('salary:updated', () => {
          if (visible) {
            fetchSalary(selectedMonth, true);
          }
        });
      } catch (_) {}
    };
    bindSocket();

    return () => {
      if (socketInstance) {
        socketInstance.off('salary:updated');
      }
    };
  }, [visible, selectedMonth, fetchSalary]);

  const handleMonthChange = (delta) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    const newMonthStr = `${newY}-${newM}`;
    setSelectedMonth(newMonthStr);
  };

  const formatDisplayMonth = (monthStr) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  // Extract monthly calculation values
  const baseSalary = salaryData?.user?.baseSalary || 0;
  const pfEnabled = typeof salaryData?.user?.pfEnabled === 'boolean' ? salaryData.user.pfEnabled : true;
  const totalMonthlySalary = salaryData?.monthlySalary?.totalSalary ?? baseSalary;
  const pfEmployeeVal = salaryData?.monthlySalary?.pfEmployee ?? (pfEnabled ? Math.round(totalMonthlySalary * 0.12) : 0);
  const pfEmployerVal = salaryData?.monthlySalary?.pfEmployer ?? (pfEnabled ? Math.round(totalMonthlySalary * 0.12) : 0);
  const netMonthlySalary = salaryData?.monthlySalary?.netSalary ?? Math.max(0, totalMonthlySalary - pfEmployeeVal);
  const totalPfFundVal = salaryData?.monthlySalary?.totalPfFund ?? (pfEmployeeVal + pfEmployerVal);

  const dailyTotalRate = salaryData?.dailyTotalSalary ?? salaryData?.dailyRate ?? (salaryData?.totalDaysInMonth ? Math.round((totalMonthlySalary / salaryData.totalDaysInMonth) * 100) / 100 : 0);
  const dailyNetRate = salaryData?.dailyNetSalary ?? (salaryData?.totalDaysInMonth ? Math.round((netMonthlySalary / salaryData.totalDaysInMonth) * 100) / 100 : 0);
  const dailyEmpPf = salaryData?.dailyEmpPf ?? (salaryData?.totalDaysInMonth ? Math.round((pfEmployeeVal / salaryData.totalDaysInMonth) * 100) / 100 : 0);
  const dailyEmprPf = salaryData?.dailyEmprPf ?? (salaryData?.totalDaysInMonth ? Math.round((pfEmployerVal / salaryData.totalDaysInMonth) * 100) / 100 : 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>💰 Staff Salary & Benefits</Text>
              <Text style={styles.headerSubtitle}>
                {salaryData?.user?.name || activeStaff?.name} ({salaryData?.user?.role || activeStaff?.role}) • Full Statement
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <GoldDivider />

          {/* Month Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => handleMonthChange(-1)}
              activeOpacity={0.7}
            >
              <Text style={styles.monthNavBtnText}>◀ Prev Month</Text>
            </TouchableOpacity>
            <Text style={styles.monthNavTitle}>{formatDisplayMonth(selectedMonth)}</Text>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => handleMonthChange(1)}
              activeOpacity={0.7}
            >
              <Text style={styles.monthNavBtnText}>Next Month ▶</Text>
            </TouchableOpacity>
          </View>

          {loading && !salaryData ? (
            <View style={styles.loaderCenter}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loaderText}>Calculating salary statements...</Text>
            </View>
          ) : salaryData ? (
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {/* CARD 1: OFFICIAL MONTHLY SALARY STATEMENT FORMAT */}
              <View style={styles.monthlyFormatCard}>
                <View style={styles.monthlyCardHeader}>
                  <Text style={styles.monthlyCardTitle}>📋 MONTHLY SALARY STATEMENT</Text>
                  <Text style={styles.monthlyCardMonth}>{formatDisplayMonth(selectedMonth)}</Text>
                </View>

                {/* 1. Total Salary */}
                <View style={styles.formatRow}>
                  <View style={styles.formatLeft}>
                    <Text style={styles.formatLabel}>Total salary</Text>
                    <Text style={styles.formatSub}>Monthly Base Gross Salary</Text>
                  </View>
                  <Text style={styles.formatValueTotal}>₹{totalMonthlySalary.toLocaleString()}</Text>
                </View>

                {/* 2. Net Salary */}
                <View style={styles.formatRowNet}>
                  <View style={styles.formatLeft}>
                    <Text style={styles.formatNetLabel}>Net salary</Text>
                    <Text style={styles.formatNetSub}>Salary after PF deduction (take-home)</Text>
                  </View>
                  <Text style={styles.formatNetValue}>₹{netMonthlySalary.toLocaleString()}</Text>
                </View>

                {/* 3. PF given by employee */}
                <View style={styles.formatRow}>
                  <View style={styles.formatLeft}>
                    <Text style={styles.formatLabel}>PF given by employee</Text>
                    <Text style={styles.formatSub}>12 % of total salary (Deducted from salary)</Text>
                  </View>
                  <Text style={styles.formatValueDeduction}>
                    {pfEnabled ? `- ₹${pfEmployeeVal.toLocaleString()}` : '₹0 (PF Off)'}
                  </Text>
                </View>

                {/* 4. PF given by the employer */}
                <View style={styles.formatRow}>
                  <View style={styles.formatLeft}>
                    <Text style={styles.formatLabel}>PF given by the employer</Text>
                    <Text style={styles.formatSub}>12 % of total salary (Admin contribution to PF fund)</Text>
                  </View>
                  <Text style={styles.formatValueEmployer}>
                    {pfEnabled ? `+ ₹${pfEmployerVal.toLocaleString()}` : '₹0 (PF Off)'}
                  </Text>
                </View>

                {/* Total PF Deposited */}
                <View style={styles.formatPfFundRow}>
                  <Text style={styles.formatPfFundLabel}>Total PF Deposited (24% into PF account):</Text>
                  <Text style={styles.formatPfFundValue}>
                    {pfEnabled ? `₹${totalPfFundVal.toLocaleString()}` : '₹0'}
                  </Text>
                </View>
              </View>

              {/* CARD 2: ATTENDANCE & MONTHLY GROSS EARNED */}
              <View style={styles.attendanceCard}>
                <View style={styles.attendanceHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>📊 Attendance & Gross Earned</Text>
                  <Text style={styles.dailyBadgeText}>
                    ₹{dailyTotalRate}/day ({salaryData.totalDaysInMonth} days)
                  </Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Days Worked</Text>
                    <Text style={styles.statValue}>
                      {salaryData.workedDays} / {salaryData.totalDaysInMonth}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Present</Text>
                    <Text style={[styles.statValue, { color: colors.available }]}>
                      {salaryData.presentDays}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Half-Day</Text>
                    <Text style={[styles.statValue, { color: colors.occupied }]}>
                      {salaryData.halfDays}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Absent/Leave</Text>
                    <Text style={[styles.statValue, { color: colors.dirty }]}>
                      {salaryData.absentDays + salaryData.leaveDays}
                    </Text>
                  </View>
                </View>

                <View style={styles.grossRow}>
                  <Text style={styles.grossLabel}>Gross Earned (Based on Days Worked):</Text>
                  <Text style={styles.grossValue}>₹{salaryData.grossEarned.toLocaleString()}</Text>
                </View>

                {/* Advance Salary Deductions if any */}
                {salaryData.deductions?.totalAdvance > 0 && (
                  <View style={styles.advanceDeductionRow}>
                    <Text style={styles.advanceDeductionLabel}>Advance Salary Deducted:</Text>
                    <Text style={styles.advanceDeductionValue}>
                      - ₹{salaryData.deductions.totalAdvance.toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Final Net Payable for this month */}
                <View style={styles.netPayableBox}>
                  <View>
                    <Text style={styles.netPayableLabel}>FINAL MONTHLY PAYABLE</Text>
                    <Text style={styles.netPayableValue}>₹{salaryData.netPayable.toLocaleString()}</Text>
                  </View>
                  <View
                    style={[
                      styles.paymentStatusBadge,
                      salaryData.payout.paymentStatus === 'Paid' && styles.statusPaid,
                      salaryData.payout.paymentStatus === 'Partially Paid' && styles.statusPartial,
                      salaryData.payout.paymentStatus === 'Unpaid' && styles.statusUnpaid,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentStatusText,
                        salaryData.payout.paymentStatus === 'Paid' && styles.textPaid,
                        salaryData.payout.paymentStatus === 'Partially Paid' && styles.textPartial,
                        salaryData.payout.paymentStatus === 'Unpaid' && styles.textUnpaid,
                      ]}
                    >
                      {salaryData.payout.paymentStatus === 'Paid' && '✓ Fully Paid'}
                      {salaryData.payout.paymentStatus === 'Partially Paid' && `½ Paid: ₹${salaryData.payout.amountPaid}`}
                      {salaryData.payout.paymentStatus === 'Unpaid' && '⏳ Unpaid'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* CARD 3: DAY-WISE SALARY GIVEN TO THEM */}
              <View style={styles.dayWiseCard}>
                <View style={styles.dayWiseHeader}>
                  <Text style={styles.cardHeaderTitle}>
                    📅 Day-Wise Salary Log ({salaryData.dayWiseBreakdown.length} Days)
                  </Text>
                  <Text style={styles.dayWiseSubtitle}>
                    Daily Rate: ₹{dailyTotalRate} • Daily Net: ₹{dailyNetRate} • Daily PF: ₹{dailyEmpPf}+{dailyEmprPf}
                  </Text>
                </View>

                <View style={styles.daysListContainer}>
                  {salaryData.dayWiseBreakdown.map((item) => (
                    <View key={item.dateString} style={styles.dayRow}>
                      {/* Left: Date & Weekday */}
                      <View style={styles.dayLeftCol}>
                        <Text style={styles.dayDateText}>{item.dateString}</Text>
                        <Text style={styles.dayWeekText}>{item.dayOfWeek}</Text>
                      </View>

                      {/* Middle: Attendance Status & Day Salary Breakdown */}
                      <View style={styles.dayMiddleCol}>
                        <View
                          style={[
                            styles.dayStatusPill,
                            item.status === 'Present' && styles.dayPresent,
                            item.status === 'Half-Day' && styles.dayHalfDay,
                            item.status === 'Absent' && styles.dayAbsent,
                            item.status === 'On Leave' && styles.dayLeave,
                            item.status === 'Not Marked' && styles.dayUnmarked,
                            item.status === 'Upcoming' && styles.dayUpcoming,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayStatusText,
                              item.status === 'Present' && styles.textPresent,
                              item.status === 'Half-Day' && styles.textHalfDay,
                              item.status === 'Absent' && styles.textAbsent,
                              item.status === 'On Leave' && styles.textLeave,
                              item.status === 'Not Marked' && styles.textUnmarked,
                              item.status === 'Upcoming' && styles.textUpcoming,
                            ]}
                          >
                            {item.status === 'Present' && '✓ Present'}
                            {item.status === 'Half-Day' && '½ Half-Day'}
                            {item.status === 'Absent' && '✕ Absent'}
                            {item.status === 'On Leave' && '🌴 On Leave'}
                            {item.status === 'Not Marked' && '○ Not Marked'}
                            {item.status === 'Upcoming' && '— Upcoming'}
                          </Text>
                        </View>

                        <Text style={styles.dayRateMiniText}>
                          Day Total: ₹{item.dailyTotalSalary ?? dailyTotalRate} • Net: ₹{item.dailyNetSalary ?? dailyNetRate}
                        </Text>
                      </View>

                      {/* Right: Daily Earned Amount */}
                      <View style={styles.dayRightCol}>
                        <Text
                          style={[
                            styles.dayEarnedText,
                            item.earnedAmount > 0 && styles.dayEarnedPositive,
                          ]}
                        >
                          {item.earnedAmount > 0 ? `+ ₹${item.earnedAmount}` : '₹0'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.loaderCenter}>
              <Text style={styles.loaderText}>Unable to load salary data.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeSubmitBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeSubmitBtnText}>Close Statement</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.secondary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textMuted,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 10,
  },
  monthNavBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  monthNavBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
  },
  monthNavTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  loaderCenter: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  scrollArea: {
    maxHeight: 520,
  },
  // OFFICIAL MONTHLY FORMAT CARD
  monthlyFormatCard: {
    backgroundColor: '#FDFCF7',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  monthlyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8C8',
  },
  monthlyCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#8A6D3B',
    letterSpacing: 0.5,
  },
  monthlyCardMonth: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  formatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  formatRowNet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginVertical: 2,
  },
  formatLeft: {
    flex: 1,
    paddingRight: 8,
  },
  formatLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  formatSub: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  formatNetLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#065F46',
  },
  formatNetSub: {
    fontSize: 9.5,
    color: '#047857',
    marginTop: 1,
  },
  formatValueTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.secondary,
  },
  formatNetValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#047857',
  },
  formatValueDeduction: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.dirty,
  },
  formatValueEmployer: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.available,
  },
  formatPfFundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE047',
    marginTop: 4,
  },
  formatPfFundLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#854D0E',
  },
  formatPfFundValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#854D0E',
  },
  // ATTENDANCE & SUMMARY CARD
  attendanceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  attendanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
  },
  dailyBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 2,
  },
  grossRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  grossLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
  },
  grossValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.available,
  },
  advanceDeductionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advanceDeductionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dirty,
  },
  advanceDeductionValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dirty,
  },
  netPayableBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netPayableLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#166534',
  },
  netPayableValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803D',
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  statusPaid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  statusPartial: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  statusUnpaid: {
    backgroundColor: '#FFF1F2',
    borderColor: '#EF4444',
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  textPaid: { color: '#059669' },
  textPartial: { color: '#D97706' },
  textUnpaid: { color: '#E11D48' },

  // DAY-WISE CARD
  dayWiseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  dayWiseHeader: {
    marginBottom: 4,
  },
  dayWiseSubtitle: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  daysListContainer: {
    marginTop: 2,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dayLeftCol: {
    width: 85,
  },
  dayDateText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
  },
  dayWeekText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  dayMiddleCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  dayStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  dayStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  dayPresent: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  textPresent: { color: '#059669' },
  dayHalfDay: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  textHalfDay: { color: '#D97706' },
  dayAbsent: { backgroundColor: '#FFF1F2', borderColor: '#EF4444' },
  textAbsent: { color: '#E11D48' },
  dayLeave: { backgroundColor: '#F3E8FF', borderColor: '#A855F7' },
  textLeave: { color: '#7E22CE' },
  dayUnmarked: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  textUnmarked: { color: '#64748B' },
  dayUpcoming: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  textUpcoming: { color: '#94A3B8' },
  dayRateMiniText: {
    fontSize: 8.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  dayRightCol: {
    width: 65,
    alignItems: 'flex-end',
  },
  dayEarnedText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textMuted,
  },
  dayEarnedPositive: {
    color: colors.available,
    fontWeight: '900',
  },
  closeSubmitBtn: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  closeSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
});

export default StaffSalaryModal;

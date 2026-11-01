/**
 * @file StaffSalaryModal.js
 * @description Luxury Staff Salary & Day-Wise Earnings Modal for Waiters, Cooks, and Cleaners.
 * Shows personal monthly base salary, daily rate, itemized deductions (PF, advances),
 * payout settlement status, and a full day-by-day earnings breakdown.
 */

import React, { useState, useEffect } from 'react';
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
import { GoldDivider, LuxuryProgressBar } from './LuxuryPattern';
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

const StaffSalaryModal = ({ visible, onClose }) => {
  const getInitialMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth());
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchMySalary(selectedMonth);
    }
  }, [visible, selectedMonth]);

  useEffect(() => {
    let socketInstance = null;
    const bindSocket = async () => {
      socketInstance = await getSocket();
      socketInstance.on('salary:updated', () => {
        if (visible) {
          fetchMySalary(selectedMonth, true);
        }
      });
    };
    bindSocket();

    return () => {
      if (socketInstance) {
        socketInstance.off('salary:updated');
      }
    };
  }, [visible, selectedMonth]);

  const fetchMySalary = async (monthStr, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get(`/salary/my-salary?month=${monthStr}`);
      if (res.data.success) {
        setSalaryData(res.data.data);
      }
    } catch (err) {
      console.error('[Fetch My Salary Error]', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleMonthChange = (delta) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const formatDisplayMonth = (monthStr) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>💰 My Salary & Earnings</Text>
              <Text style={styles.headerSubtitle}>
                Transparent breakdown of earnings, PF, advances & daily logs
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

          {loading ? (
            <View style={styles.loaderCenter}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loaderText}>Calculating salary statements...</Text>
            </View>
          ) : salaryData ? (
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {/* Card 1: Salary Overview */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryLabel}>MONTHLY BASE SALARY</Text>
                    <Text style={styles.summaryAmount}>₹{salaryData.user.baseSalary.toLocaleString()}</Text>
                  </View>
                  <View style={styles.badgeBox}>
                    <Text style={styles.badgeText}>
                      ₹{salaryData.dailyRate} / day ({salaryData.totalDaysInMonth} days)
                    </Text>
                  </View>
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
                    <Text style={styles.statLabel}>Absent / Leave</Text>
                    <Text style={[styles.statValue, { color: colors.dirty }]}>
                      {salaryData.absentDays + salaryData.leaveDays}
                    </Text>
                  </View>
                </View>

                <View style={styles.grossRow}>
                  <Text style={styles.grossLabel}>Gross Earned This Month:</Text>
                  <Text style={styles.grossValue}>₹{salaryData.grossEarned.toLocaleString()}</Text>
                </View>
              </View>

              {/* Card 2: Itemized Deductions & Net Payout */}
              <View style={styles.deductionCard}>
                <Text style={styles.cardHeaderTitle}>✂️ Deductions Breakdown</Text>
                <View style={styles.deductionLine}>
                  <Text style={styles.deductionLabel}>
                    PF Employee (12% Deducted from salary):
                  </Text>
                  <Text style={[styles.deductionValue, { color: colors.dirty }]}>
                    {salaryData.deductions.pfEnabled
                      ? `- ₹${(salaryData.deductions.pfEmployeeDeduction || salaryData.deductions.pfDeduction || Math.round((salaryData.grossEarned || salaryData.baseSalary || 0) * 0.12)).toLocaleString()}`
                      : '₹0 (Inactive)'}
                  </Text>
                </View>

                <View style={styles.deductionLine}>
                  <Text style={styles.deductionLabel}>
                    PF Employer (12% Admin contribution to your PF):
                  </Text>
                  <Text style={[styles.deductionValue, { color: colors.available }]}>
                    {salaryData.deductions.pfEnabled
                      ? `+ ₹${(salaryData.deductions.pfEmployerContribution || Math.round((salaryData.grossEarned || salaryData.baseSalary || 0) * 0.12)).toLocaleString()}`
                      : '₹0 (Inactive)'}
                  </Text>
                </View>

                <View style={styles.deductionLine}>
                  <Text style={styles.deductionLabel}>
                    Total Monthly PF Deposited (24% into fund):
                  </Text>
                  <Text style={[styles.deductionValue, { color: '#B8860B', fontWeight: '800' }]}>
                    {salaryData.deductions.pfEnabled
                      ? `₹${(salaryData.deductions.totalPfFund || Math.round((salaryData.grossEarned || salaryData.baseSalary || 0) * 0.24)).toLocaleString()}`
                      : '₹0'}
                  </Text>
                </View>

                <View style={styles.deductionLine}>
                  <Text style={styles.deductionLabel}>Advance Salary Deductions:</Text>
                  <Text style={styles.deductionValue}>
                    - ₹{salaryData.deductions.totalAdvance.toLocaleString()}
                  </Text>
                </View>

                {/* List individual advances if taken */}
                {salaryData.deductions.advancesList && salaryData.deductions.advancesList.length > 0 && (
                  <View style={styles.advancesListContainer}>
                    {salaryData.deductions.advancesList.map((adv) => (
                      <View key={adv._id} style={styles.advanceItemRow}>
                        <Text style={styles.advanceItemText}>
                          • {adv.date}: ₹{adv.amount} ({adv.reason || 'Advance'} via {adv.paymentMode})
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.dividerThin} />

                <View style={styles.deductionLineTotal}>
                  <Text style={styles.totalDeductionLabel}>Total Deductions:</Text>
                  <Text style={styles.totalDeductionValue}>
                    - ₹{salaryData.deductions.totalDeductions.toLocaleString()}
                  </Text>
                </View>

                {/* Net Take-Home Salary */}
                <View style={styles.netPayableBox}>
                  <View>
                    <Text style={styles.netPayableLabel}>NET TAKE-HOME SALARY</Text>
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

              {/* Card 3: Day-Wise Salary Breakdown */}
              <View style={styles.dayWiseCard}>
                <Text style={styles.cardHeaderTitle}>
                  📅 Day-Wise Salary Log ({salaryData.dayWiseBreakdown.length} Days)
                </Text>
                <Text style={styles.cardHeaderSubtitle}>
                  Daily rate: ₹{salaryData.dailyRate} (Present = 100%, Half-Day = 50%)
                </Text>

                <View style={styles.daysListContainer}>
                  {salaryData.dayWiseBreakdown.map((item) => (
                    <View key={item.dateString} style={styles.dayRow}>
                      <View style={styles.dayLeftCol}>
                        <Text style={styles.dayDateText}>{item.dateString}</Text>
                        <Text style={styles.dayWeekText}>{item.dayOfWeek}</Text>
                      </View>

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
                        {item.notes ? (
                          <Text style={styles.dayNotesText} numberOfLines={1}>
                            "{item.notes}"
                          </Text>
                        ) : null}
                      </View>

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
              <Text style={styles.loaderText}>No salary data available.</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
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
    fontSize: 14,
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
    maxHeight: 460,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  badgeBox: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
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
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  grossLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  grossValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.available,
  },
  deductionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
  },
  cardHeaderSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: -4,
  },
  deductionLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  deductionValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dirty,
  },
  advancesListContainer: {
    backgroundColor: '#FFF1F2',
    borderRadius: 6,
    padding: 6,
    gap: 3,
  },
  advanceItemRow: {
    flexDirection: 'row',
  },
  advanceItemText: {
    fontSize: 10,
    color: '#BE123C',
    fontWeight: '700',
  },
  dividerThin: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 2,
  },
  deductionLineTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalDeductionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  totalDeductionValue: {
    fontSize: 13,
    fontWeight: '900',
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#166534',
  },
  netPayableValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15803D',
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
    fontSize: 11,
    fontWeight: '900',
  },
  textPaid: {
    color: '#059669',
  },
  textPartial: {
    color: '#D97706',
  },
  textUnpaid: {
    color: '#E11D48',
  },
  dayWiseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  daysListContainer: {
    marginTop: 4,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dayLeftCol: {
    width: 90,
  },
  dayDateText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  dayWeekText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  dayMiddleCol: {
    flex: 1,
    alignItems: 'center',
  },
  dayStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  dayStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dayPresent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  textPresent: {
    color: '#059669',
  },
  dayHalfDay: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  textHalfDay: {
    color: '#D97706',
  },
  dayAbsent: {
    backgroundColor: '#FFF1F2',
    borderColor: '#EF4444',
  },
  textAbsent: {
    color: '#E11D48',
  },
  dayLeave: {
    backgroundColor: '#F3E8FF',
    borderColor: '#A855F7',
  },
  textLeave: {
    color: '#7E22CE',
  },
  dayUnmarked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  textUnmarked: {
    color: '#64748B',
  },
  dayUpcoming: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  textUpcoming: {
    color: '#94A3B8',
  },
  dayNotesText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: colors.textMuted,
    marginTop: 2,
    maxWidth: 120,
  },
  dayRightCol: {
    width: 70,
    alignItems: 'flex-end',
  },
  dayEarnedText: {
    fontSize: 12,
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
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
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


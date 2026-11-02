/**
 * @file AdminDashboard.js
 * @description White & Luxury Executive Dashboard for Restaurant Administration.
 * Features:
 * - Luxury pattern background with ambient champagne halos.
 * - Real-time incoming kitchen order alert banner with quick inspection.
 * - Revenue intelligence metrics with gold watermarks & category progress bars.
 * - Full CRUD over menu, staff, and tables with fine-dining modals.
 * - Master Void Override with audit trail.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import apiClient from '../api/client';
import { getSocket } from '../api/socket';
import { getSecureItem, saveSecureItem } from '../utils/secureStore';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import {
  LuxuryPatternBackground,
  LuxuryTicketClip,
  LuxuryProgressBar,
  LuxuryEmblem,
  MichelinStars,
  GoldDivider,
} from '../components/LuxuryPattern';
import colors from '../theme/colors';

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

const CATEGORY_ICONS = {
  'North Indian': '🍛',
  'Indo-Chinese': '🥢',
  'South Indian': '🥞',
  'Street Food': '🥘',
  Grills: '🍢',
  Biryani: '🍚',
  Momos: '🥟',
  Beverages: '🥂',
  Desserts: '🍨',
};

const ROLES = ['Admin', 'Waiter', 'Cook', 'Cleaner'];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time live incoming kitchen order alert for Admin
  const [latestLiveOrder, setLatestLiveOrder] = useState(null);

  // Modals for CRUD operations
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [tableModalVisible, setTableModalVisible] = useState(false);

  // Form states
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    category: 'North Indian',
    price: '',
    description: '',
  });

  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Waiter',
    pin: '',
  });

  const [newTable, setNewTable] = useState({
    tableNumber: '',
    capacity: '4',
  });

  // Date Helpers for Staff Attendance
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${parts[2]} ${months[d.getMonth()]} ${parts[0]}`;
  };

  const formatDisplayMonth = (monthStr) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${months[m - 1]} ${y}`;
  };

  // Staff Attendance States (Strictly Admin Managed, No Shift Timings)
  const [attendanceDate, setAttendanceDate] = useState(getLocalDateString());
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const attendanceDateRef = useRef(attendanceDate);
  attendanceDateRef.current = attendanceDate;

  // Monthly Attendance History Modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState(null);
  const [historyMonth, setHistoryMonth] = useState(getLocalDateString().substring(0, 7));
  const [staffHistoryData, setStaffHistoryData] = useState(null);
  const [staffHistoryLoading, setStaffHistoryLoading] = useState(false);

  // Note/Remark Modal
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingStaffNote, setEditingStaffNote] = useState(null);
  const [noteInputText, setNoteInputText] = useState('');

  // Payroll & Salary States (Admin Managed, PF & Advances)
  const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [payrollMonth, setPayrollMonth] = useState(getCurrentMonthStr());
  const [payrollData, setPayrollData] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const payrollMonthRef = useRef(payrollMonth);
  payrollMonthRef.current = payrollMonth;

  // Day-Wise Salary Breakdown Modal for Admin
  const [dayWiseModalVisible, setDayWiseModalVisible] = useState(false);
  const [selectedStaffForDayWise, setSelectedStaffForDayWise] = useState(null);

  // Salary & PF Config Modal
  const [salaryConfigModalVisible, setSalaryConfigModalVisible] = useState(false);
  const [editingStaffConfig, setEditingStaffConfig] = useState(null);
  const [configBaseSalary, setConfigBaseSalary] = useState('');
  const [configPfEnabled, setConfigPfEnabled] = useState(false);
  const [configPfPercentage, setConfigPfPercentage] = useState('12');

  // Advance Salary Modal
  const [advanceModalVisible, setAdvanceModalVisible] = useState(false);
  const [selectedStaffForAdvance, setSelectedStaffForAdvance] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(getLocalDateString());
  const [advancePaymentMode, setAdvancePaymentMode] = useState('Cash');
  const [advanceReason, setAdvanceReason] = useState('');

  // Salary Payout Settlement Modal
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [selectedStaffForPayout, setSelectedStaffForPayout] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutPaymentMode, setPayoutPaymentMode] = useState('Cash');
  const [payoutPaymentStatus, setPayoutPaymentStatus] = useState('Paid');
  const [payoutNotes, setPayoutNotes] = useState('');

  useEffect(() => {
    fetchDashboardData(false);
    setupSocket();
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [metricsRes, ordersRes, menuRes, staffRes, tablesRes, attendanceRes, payrollRes] =
        await Promise.allSettled([
          apiClient.get('/admin/metrics'),
          apiClient.get('/orders'),
          apiClient.get('/menu'),
          apiClient.get('/admin/staff'),
          apiClient.get('/tables'),
          apiClient.get(`/admin/attendance/daily?date=${attendanceDateRef.current}`),
          apiClient.get(`/salary/overview?month=${payrollMonthRef.current}`),
        ]);

      let fetchedStaff = staffRes.status === 'fulfilled' && staffRes.value?.data?.success ? staffRes.value.data.data : [];
      let fetchedPayroll = payrollRes?.status === 'fulfilled' && payrollRes.value?.data?.success ? payrollRes.value.data.data : null;

      try {
        const overridesRaw = await getSecureItem('pos_staff_salary_overrides');
        if (overridesRaw) {
          const overrides = JSON.parse(overridesRaw);
          if (fetchedStaff.length > 0) {
            fetchedStaff = fetchedStaff.map((s) => {
              if (overrides[s._id]) {
                return { ...s, ...overrides[s._id] };
              }
              return s;
            });
          }
          if (fetchedPayroll?.staffPayrolls) {
            fetchedPayroll = {
              ...fetchedPayroll,
              staffPayrolls: fetchedPayroll.staffPayrolls.map((sp) => {
                const ov = overrides[sp.user._id];
                if (ov) {
                  const bSalary = ov.baseSalary || 0;
                  const pfOn = typeof ov.pfEnabled === 'boolean' ? ov.pfEnabled : true;
                  const worked = sp.workedDays || 0;
                  const totalDays = sp.totalDaysInMonth || 30;
                  const dailyRate = Math.round((bSalary / totalDays) * 100) / 100;
                  const grossEarned = Math.round(dailyRate * worked * 100) / 100;
                  const pfEmpDeduction = pfOn ? Math.round(grossEarned * 0.12) : 0;
                  const pfEmprContribution = pfOn ? Math.round(grossEarned * 0.12) : 0;
                  const totalAdvance = sp.deductions?.totalAdvance || 0;
                  const netPayable = Math.max(0, grossEarned - pfEmpDeduction - totalAdvance);
                  return {
                    ...sp,
                    dailyRate,
                    grossEarned,
                    user: { ...sp.user, ...ov },
                    deductions: {
                      ...sp.deductions,
                      pfEnabled: pfOn,
                      pfPercentage: 12,
                      pfDeduction: pfEmpDeduction,
                      pfEmployeeDeduction: pfEmpDeduction,
                      pfEmployerContribution: pfEmprContribution,
                      totalPfFund: pfEmpDeduction + pfEmprContribution,
                      totalDeductions: totalAdvance + pfEmpDeduction,
                    },
                    netPayable,
                  };
                }
                return sp;
              }),
            };
          }
        }
      } catch (overrideErr) {
        console.warn('[Salary Overrides Load Notice]', overrideErr);
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.data?.success) setMetrics(metricsRes.value.data.data);
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data?.success) setOrders(ordersRes.value.data.data);
      if (menuRes.status === 'fulfilled' && menuRes.value?.data?.success) setMenuItems(menuRes.value.data.data);
      if (fetchedStaff.length > 0) setStaffList(fetchedStaff);
      if (tablesRes.status === 'fulfilled' && tablesRes.value?.data?.success) setTables(tablesRes.value.data.data);
      if (attendanceRes?.status === 'fulfilled' && attendanceRes.value?.data?.success) setAttendanceData(attendanceRes.value.data.data);
      if (fetchedPayroll) setPayrollData(fetchedPayroll);






    } catch (err) {
      console.error('[Admin Fetch Error]', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const setupSocket = async () => {
    const socket = await getSocket();

    socket.on('order:created', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev.filter((o) => o._id !== newOrder._id)]);
      setLatestLiveOrder(newOrder);
      fetchDashboardData(true);
    });

    socket.on('order:updated', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
      fetchDashboardData(true);
    });

    socket.on('order:status_updated', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
      fetchDashboardData(true);
    });

    socket.on('order:completed', (completedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === completedOrder._id ? completedOrder : o))
      );
      fetchDashboardData(true);
    });

    socket.on('table:status_updated', () => {
      fetchDashboardData(true);
    });

    socket.on('attendance:updated', () => {
      fetchAttendanceData(attendanceDateRef.current, true);
    });

    socket.on('salary:updated', () => {
      fetchPayrollData(payrollMonthRef.current, true);
    });

    return () => {
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('order:status_updated');
      socket.off('order:completed');
      socket.off('table:status_updated');
      socket.off('attendance:updated');
      socket.off('salary:updated');
    };
  };

  const handleVoidOrder = (order) => {
    Alert.alert(
      'Master Override: Void Order',
      `Are you sure you want to VOID order ${order.orderNumber} for Table ${order.tableId?.tableNumber}? This will cancel the ticket and release the table.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Void',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiClient.delete(`/orders/${order._id}/void`);
              if (res.data.success) {
                Alert.alert('Success', 'Order has been voided by admin override.');
                fetchDashboardData(true);
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to void order');
            }
          },
        },
      ]
    );
  };

  const handleCreateMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      Alert.alert('Validation Error', 'Dish name and price are required.');
      return;
    }

    try {
      const res = await apiClient.post('/menu', {
        name: newMenuItem.name,
        category: newMenuItem.category,
        price: parseFloat(newMenuItem.price),
        description: newMenuItem.description,
      });

      if (res.data.success) {
        Alert.alert('Created', `Item '${newMenuItem.name}' added to menu.`);
        setMenuModalVisible(false);
        setNewMenuItem({ name: '', category: 'North Indian', price: '', description: '' });
        fetchDashboardData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create menu item');
    }
  };

  const handleToggleItemAvailability = async (item) => {
    try {
      await apiClient.patch(`/menu/${item._id}/availability`, {
        isAvailable: !item.isAvailable,
      });
      fetchDashboardData(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle availability.');
    }
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name || !newStaff.pin || newStaff.pin.length !== 4) {
      Alert.alert('Validation Error', 'Staff name and exactly 4-digit PIN are required.');
      return;
    }

    try {
      const res = await apiClient.post('/admin/staff', {
        name: newStaff.name,
        role: newStaff.role,
        pin: newStaff.pin,
      });

      if (res.data.success) {
        Alert.alert('Staff Account Created', `Staff '${newStaff.name}' configured with PIN ${newStaff.pin}.`);
        setStaffModalVisible(false);
        setNewStaff({ name: '', role: 'Waiter', pin: '' });
        fetchDashboardData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create staff');
    }
  };

  const handleToggleStaffStatus = async (staff) => {
    try {
      const res = await apiClient.patch(`/admin/staff/${staff._id}/toggle-status`);
      if (res.data.success) {
        fetchDashboardData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to toggle staff status');
    }
  };

  const handleCreateTable = async () => {
    if (!newTable.tableNumber) {
      Alert.alert('Validation Error', 'Table number is required.');
      return;
    }

    try {
      const res = await apiClient.post('/tables', {
        tableNumber: parseInt(newTable.tableNumber, 10),
        capacity: parseInt(newTable.capacity, 10) || 4,
      });

      if (res.data.success) {
        Alert.alert('Success', `Table ${newTable.tableNumber} added.`);
        setTableModalVisible(false);
        setNewTable({ tableNumber: '', capacity: '4' });
        fetchDashboardData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create table');
    }
  };

  /* Attendance Management Handlers (Admin Only, No Shift Timings) */
  const fetchAttendanceData = async (dateStr = attendanceDateRef.current, silent = false) => {
    if (!silent) setAttendanceLoading(true);
    try {
      const res = await apiClient.get(`/admin/attendance/daily?date=${dateStr}`);
      if (res.data.success) {
        let attData = res.data.data;
        try {
          const overridesRaw = await getSecureItem('pos_staff_salary_overrides');
          const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};

          if (attData?.roster) {
            const [yStr, mStr] = dateStr.split('-');
            const totalDaysInMonth = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();

            let totalIncurred = 0;
            attData.roster = attData.roster.map((s) => {
              const staffId = s.staffId || s._id;
              const ov = overrides[staffId];
              const stMember = staffList.find((item) => item._id === staffId);

              const baseSalary = ov?.baseSalary ?? stMember?.baseSalary ?? s.baseSalary ?? 0;
              const pfEnabled = ov
                ? ov.pfEnabled
                : (typeof stMember?.pfEnabled === 'boolean'
                    ? stMember.pfEnabled
                    : (typeof s.pfEnabled === 'boolean' ? s.pfEnabled : true));

              const dailyRate = totalDaysInMonth > 0 ? Math.round((baseSalary / totalDaysInMonth) * 100) / 100 : 0;
              const empPf = pfEnabled ? Math.round(baseSalary * 0.12) : 0;
              const emprPf = pfEnabled ? Math.round(baseSalary * 0.12) : 0;
              const dailyEmpPf = totalDaysInMonth > 0 ? Math.round((empPf / totalDaysInMonth) * 100) / 100 : 0;
              const dailyEmprPf = totalDaysInMonth > 0 ? Math.round((emprPf / totalDaysInMonth) * 100) / 100 : 0;
              const dailyNetSalary = Math.max(0, Math.round((dailyRate - dailyEmpPf) * 100) / 100);

              const status = s.attendance?.status || s.status || 'Not Marked';
              let earnedToday = 0;
              if (status === 'Present') earnedToday = dailyRate;
              else if (status === 'Half-Day') earnedToday = Math.round(dailyRate * 0.5 * 100) / 100;

              totalIncurred += earnedToday;

              return {
                ...s,
                staffId,
                _id: staffId,
                baseSalary,
                pfEnabled,
                dailyRate,
                dailyTotalSalary: dailyRate,
                dailyNetSalary,
                dailyEmpPf,
                dailyEmprPf,
                earnedToday,
                status,
                attendance: {
                  status,
                  notes: s.attendance?.notes || s.notes || '',
                  markedBy: s.attendance?.markedBy || s.markedBy || 'Admin',
                  updatedAt: s.attendance?.updatedAt || s.updatedAt || null,
                },
              };
            });

            if (attData.stats) {
              attData.stats.totalSalaryIncurredToday = Math.round(totalIncurred * 100) / 100;
            }
          }
        } catch (_) {}
        setAttendanceData(attData);
      }
    } catch (err) {
      console.error('[Attendance Fetch Error]', err);
    } finally {
      if (!silent) setAttendanceLoading(false);
    }
  };

  const handleDateChange = (delta) => {
    const parts = attendanceDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + delta);
    const newDateStr = getLocalDateString(d);
    setAttendanceDate(newDateStr);
    fetchAttendanceData(newDateStr);
  };

  const handleSetTodayDate = () => {
    const todayStr = getLocalDateString();
    if (attendanceDate !== todayStr) {
      setAttendanceDate(todayStr);
      fetchAttendanceData(todayStr);
    }
  };

  const handleMarkStaff = async (staffId, status, currentNotes = '') => {
    // Optimistic UI update
    if (attendanceData && attendanceData.roster) {
      const parts = attendanceDate.split('-').map(Number);
      const totalDays = new Date(parts[0], parts[1], 0).getDate();
      let totalSalaryIncurred = 0;

      const updatedRoster = attendanceData.roster.map((s) => {
        const sid = s.staffId || s._id;
        if (sid === staffId) {
          const bSalary = s.baseSalary || 0;
          const dRate = totalDays > 0 ? Math.round((bSalary / totalDays) * 100) / 100 : 0;
          let earned = 0;
          if (status === 'Present') earned = dRate;
          else if (status === 'Half-Day') earned = Math.round(dRate * 0.5 * 100) / 100;

          totalSalaryIncurred += earned;
          return {
            ...s,
            status,
            earnedToday: earned,
            attendance: {
              ...(s.attendance || {}),
              status,
              notes: currentNotes,
              markedAt: new Date().toISOString(),
            },
          };
        } else {
          totalSalaryIncurred += (s.earnedToday || 0);
        }
        return s;
      });

      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let unmarkedCount = 0;
      updatedRoster.forEach((r) => {
        const st = r.attendance?.status || r.status;
        if (st === 'Present') presentCount++;
        else if (st === 'Half-Day') halfDayCount++;
        else if (st === 'Absent') absentCount++;
        else if (st === 'On Leave') leaveCount++;
        else unmarkedCount++;
      });
      const markedCount = presentCount + halfDayCount + absentCount + leaveCount;
      const attendanceRate =
        markedCount > 0
          ? Math.round(((presentCount + halfDayCount * 0.5) / markedCount) * 100)
          : 0;

      setAttendanceData({
        ...attendanceData,
        roster: updatedRoster,
        stats: {
          totalStaff: updatedRoster.length,
          presentCount,
          halfDayCount,
          absentCount,
          leaveCount,
          unmarkedCount,
          attendanceRate,
          totalSalaryIncurredToday: Math.round(totalSalaryIncurred * 100) / 100,
        },
      });
    }

    try {
      const res = await apiClient.post('/admin/attendance/mark', {
        userId: staffId,
        date: attendanceDate,
        status,
        notes: currentNotes,
      });
      if (res.data.success) {
        fetchAttendanceData(attendanceDate, true);
      }
    } catch (err) {
      Alert.alert('Attendance Error', err.response?.data?.error || 'Failed to update attendance');
      fetchAttendanceData(attendanceDate, true);
    }
  };

  const handleMarkAllPresent = () => {
    Alert.alert(
      '⚡ Mark All Present',
      `Mark all active staff as PRESENT for ${attendanceDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm All Present',
          onPress: async () => {
            try {
              setAttendanceLoading(true);
              const res = await apiClient.post('/admin/attendance/mark-all', {
                date: attendanceDate,
                status: 'Present',
              });
              if (res.data.success) {
                fetchAttendanceData(attendanceDate, false);
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to mark all staff');
              setAttendanceLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenStaffHistory = (staff) => {
    setSelectedStaffForHistory(staff);
    const initialMonth = attendanceDate.substring(0, 7);
    setHistoryMonth(initialMonth);
    setHistoryModalVisible(true);
    fetchStaffHistory(staff.staffId || staff._id, initialMonth);
  };

  const fetchStaffHistory = async (userId, month) => {
    setStaffHistoryLoading(true);
    try {
      const res = await apiClient.get(`/admin/attendance/history/${userId}?month=${month}`);
      if (res.data.success) {
        setStaffHistoryData(res.data.data);
      }
    } catch (err) {
      Alert.alert('History Error', err.response?.data?.error || 'Failed to load staff history');
    } finally {
      setStaffHistoryLoading(false);
    }
  };

  const handleHistoryMonthChange = (delta) => {
    if (!historyMonth) return;
    const [y, m] = historyMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setHistoryMonth(newMonthStr);
    if (selectedStaffForHistory) {
      fetchStaffHistory(selectedStaffForHistory.staffId || selectedStaffForHistory._id, newMonthStr);
    }
  };

  const handleOpenNoteModal = (staffItem) => {
    setEditingStaffNote(staffItem);
    setNoteInputText(staffItem.attendance?.notes || '');
    setNoteModalVisible(true);
  };

  const handleSaveStaffNote = async () => {
    if (!editingStaffNote) return;
    try {
      const currentStatus = editingStaffNote.attendance?.status || 'Present';
      const res = await apiClient.post('/admin/attendance/mark', {
        userId: editingStaffNote.staffId,
        date: attendanceDate,
        status: currentStatus,
        notes: noteInputText.trim(),
      });
      if (res.data.success) {
        setNoteModalVisible(false);
        fetchAttendanceData(attendanceDate, true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save note');
    }
  };

  /* Payroll & Salary Handlers (Admin Only, PF & Advances) */
  const fetchPayrollData = async (monthStr = payrollMonthRef.current, silent = false) => {
    if (!silent) setPayrollLoading(true);
    try {
      const res = await apiClient.get(`/salary/overview?month=${monthStr}`);
      if (res.data?.success) {
        let pData = res.data.data;
        try {
          const overridesRaw = await getSecureItem('pos_staff_salary_overrides');
          if (overridesRaw && pData?.staffPayrolls) {
            const overrides = JSON.parse(overridesRaw);
            pData = {
              ...pData,
              staffPayrolls: pData.staffPayrolls.map((sp) => {
                const ov = overrides[sp.user._id];
                if (ov) {
                  const bSalary = ov.baseSalary || 0;
                  const pfOn = typeof ov.pfEnabled === 'boolean' ? ov.pfEnabled : true;
                  const worked = sp.workedDays || 0;
                  const totalDays = sp.totalDaysInMonth || 30;
                  const dailyRate = Math.round((bSalary / totalDays) * 100) / 100;
                  const grossEarned = Math.round(dailyRate * worked * 100) / 100;
                  const pfEmpDeduction = pfOn ? Math.round(grossEarned * 0.12) : 0;
                  const pfEmprContribution = pfOn ? Math.round(grossEarned * 0.12) : 0;
                  const totalAdvance = sp.deductions?.totalAdvance || 0;
                  const netPayable = Math.max(0, grossEarned - pfEmpDeduction - totalAdvance);
                  return {
                    ...sp,
                    dailyRate,
                    grossEarned,
                    user: { ...sp.user, ...ov },
                    deductions: {
                      ...sp.deductions,
                      pfEnabled: pfOn,
                      pfPercentage: 12,
                      pfDeduction: pfEmpDeduction,
                      pfEmployeeDeduction: pfEmpDeduction,
                      pfEmployerContribution: pfEmprContribution,
                      totalPfFund: pfEmpDeduction + pfEmprContribution,
                      totalDeductions: totalAdvance + pfEmpDeduction,
                    },
                    netPayable,
                  };
                }
                return sp;
              }),
            };
          }
        } catch (_) { }
        setPayrollData(pData);
      }
    } catch (err) {
      console.log('[Payroll Fetch Notice - Backend route pending deploy]', err.message);
    } finally {
      if (!silent) setPayrollLoading(false);
    }
  };

  const handlePayrollMonthChange = (delta) => {
    const [y, m] = payrollMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    const newMonthStr = `${newY}-${newM}`;
    setPayrollMonth(newMonthStr);
    fetchPayrollData(newMonthStr);
  };

  const handleOpenDayWiseModal = async (target) => {
    const staffId = target?.user?._id || target?._id || target?.staffId || target?.id;
    if (!staffId && !target) return;

    // Find full user details
    const staffUser = staffList.find((s) => s._id === staffId) || target?.user || target;

    // Check if payrollData has existing dayWiseBreakdown for this staff
    let found = target?.dayWiseBreakdown
      ? target
      : payrollData?.staffPayrolls?.find(
          (sp) => sp.user?._id === staffId || sp.user?.staffId === staffId
        );

    // Resolve salary overrides
    let overrides = {};
    try {
      const raw = await getSecureItem('pos_staff_salary_overrides');
      if (raw) overrides = JSON.parse(raw);
    } catch (_) {}
    const ov = overrides[staffId];

    const bSalary = ov?.baseSalary ?? staffUser.baseSalary ?? 0;
    const pfOn = ov
      ? ov.pfEnabled
      : typeof staffUser.pfEnabled === 'boolean'
      ? staffUser.pfEnabled
      : true;
    const [yearStr, monthNumStr] = payrollMonth.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthNumStr, 10);
    const totalDays = new Date(y, m, 0).getDate();

    const dailyRate = totalDays > 0 ? Math.round((bSalary / totalDays) * 100) / 100 : 0;
    const empPfMonthly = pfOn ? Math.round(bSalary * 0.12) : 0;
    const emprPfMonthly = pfOn ? Math.round(bSalary * 0.12) : 0;
    const totalPfMonthly = empPfMonthly + emprPfMonthly;

    const dailyEmpPf = totalDays > 0 ? Math.round((empPfMonthly / totalDays) * 100) / 100 : 0;
    const dailyEmprPf = totalDays > 0 ? Math.round((emprPfMonthly / totalDays) * 100) / 100 : 0;
    const dailyNet = Math.max(0, Math.round((dailyRate - dailyEmpPf) * 100) / 100);

    // Fetch actual attendance records for this user for this month
    let attRecordsMap = new Map();
    try {
      const attRes = await apiClient.get(`/admin/attendance/history/${staffId}?month=${payrollMonth}`);
      if (attRes.data?.success && attRes.data.data?.history) {
        attRes.data.data.history.forEach((rec) => {
          attRecordsMap.set(rec.dateString, rec);
        });
      }
    } catch (_) {}

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curD = now.getDate();
    const isCur = y === curY && m === curM;
    const isFut = y > curY || (y === curY && m > curM);
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const dayWiseBreakdown = [];
    let workedDays = 0;
    let grossEarned = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${payrollMonth}-${String(d).padStart(2, '0')}`;
      const dt = new Date(y, m - 1, d);
      const dayOfWeek = daysOfWeek[dt.getDay()];
      const isUp = isFut || (isCur && d > curD);

      let st = 'Not Marked';
      let earned = 0;
      let notes = '';

      if (isUp) {
        st = 'Upcoming';
        earned = 0;
      } else if (attRecordsMap.has(dateStr)) {
        const att = attRecordsMap.get(dateStr);
        st = att.status;
        notes = att.notes || '';
        if (st === 'Present') {
          earned = dailyRate;
          workedDays += 1;
        } else if (st === 'Half-Day') {
          earned = Math.round(dailyRate * 0.5 * 100) / 100;
          workedDays += 0.5;
        } else if (st === 'Absent' || st === 'On Leave') {
          earned = 0;
        }
      } else if (found?.dayWiseBreakdown) {
        const existingDay = found.dayWiseBreakdown.find(
          (item) => item.dateString === dateStr || item.dayNumber === d
        );
        if (existingDay) {
          st = existingDay.status;
          notes = existingDay.notes || '';
          earned = existingDay.earnedAmount || 0;
          if (st === 'Present') workedDays += 1;
          else if (st === 'Half-Day') workedDays += 0.5;
        }
      }

      grossEarned += earned;

      dayWiseBreakdown.push({
        dateString: dateStr,
        dayNumber: d,
        dayOfWeek,
        status: st,
        dailyRate,
        dailyTotalSalary: dailyRate,
        dailyNetSalary: dailyNet,
        dailyEmpPf,
        dailyEmprPf,
        earnedAmount: Math.round(earned * 100) / 100,
        notes,
      });
    }

    grossEarned = Math.round(grossEarned * 100) / 100;
    const empPfDeduction = pfOn ? Math.round(grossEarned * 0.12) : 0;
    const emprPfContrib = pfOn ? Math.round(grossEarned * 0.12) : 0;
    const totalPfFund = empPfDeduction + emprPfContrib;
    const totalAdvance = found?.deductions?.totalAdvance || 0;
    const advancesList = found?.deductions?.advancesList || [];
    const totalDeductions = empPfDeduction + totalAdvance;
    const netPayable = Math.max(0, Math.round(grossEarned - totalDeductions));

    const finalStatement = {
      user: {
        _id: staffId,
        name: staffUser.name,
        role: staffUser.role,
        baseSalary: bSalary,
        pfEnabled: pfOn,
      },
      month: payrollMonth,
      totalDaysInMonth: totalDays,
      dailyRate,
      dailyTotalSalary: dailyRate,
      dailyNetSalary: dailyNet,
      dailyEmpPf,
      dailyEmprPf,
      workedDays,
      grossEarned,
      netPayable,
      monthlySalary: {
        totalSalary: bSalary,
        netSalary: Math.max(0, bSalary - empPfMonthly),
        pfEmployee: empPfMonthly,
        pfEmployer: emprPfMonthly,
        totalPfFund: totalPfMonthly,
      },
      deductions: {
        pfEnabled: pfOn,
        pfPercentage: 12,
        employerPfPercentage: 12,
        pfDeduction: empPfDeduction,
        pfEmployeeDeduction: empPfDeduction,
        pfEmployerContribution: emprPfContrib,
        totalPfFund,
        totalAdvance,
        advancesList,
        totalDeductions,
      },
      payout: found?.payout || {
        paymentStatus: 'Unpaid',
        amountPaid: 0,
        paymentMode: 'Pending',
        paidAt: null,
        balanceRemaining: netPayable,
        notes: '',
      },
      dayWiseBreakdown,
    };

    setSelectedStaffForDayWise(finalStatement);
    setDayWiseModalVisible(true);

    try {
      const res = await apiClient.get(`/salary/staff/${staffId}?month=${payrollMonth}`);
      if (res.data?.success && res.data.data) {
        const srv = res.data.data;
        if (bSalary > 0 && srv.user) {
          srv.user.baseSalary = bSalary;
          srv.user.pfEnabled = pfOn;
        }
        setSelectedStaffForDayWise(srv);
      }
    } catch (_) {}
  };

  const handleOpenSalaryConfigModal = (target) => {
    const staffUser = target?.user || target;
    if (!staffUser) return;
    setEditingStaffConfig(staffUser);
    setConfigBaseSalary(String(staffUser.baseSalary || ''));
    setConfigPfEnabled(typeof staffUser.pfEnabled === 'boolean' ? staffUser.pfEnabled : true);
    setConfigPfPercentage(String(staffUser.pfPercentage || '12'));
    setSalaryConfigModalVisible(true);
  };

  const handleSaveSalaryConfig = async () => {
    if (!editingStaffConfig) return;
    const salaryVal = parseFloat(configBaseSalary) || 0;
    const empPf = configPfEnabled ? Math.round(salaryVal * 0.12) : 0;
    const emprPf = configPfEnabled ? Math.round(salaryVal * 0.12) : 0;
    const totalPf = empPf + emprPf;
    const netTakeHome = Math.max(0, salaryVal - empPf);

    const salaryOverride = {
      baseSalary: salaryVal,
      pfEnabled: configPfEnabled,
      pfPercentage: 12,
      employerPfPercentage: 12,
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately persist to hardware-backed secure storage on device
    try {
      const existingRaw = await getSecureItem('pos_staff_salary_overrides');
      let overrides = {};
      if (existingRaw) {
        try {
          overrides = JSON.parse(existingRaw);
        } catch (_) { }
      }
      overrides[editingStaffConfig._id] = salaryOverride;
      await saveSecureItem('pos_staff_salary_overrides', JSON.stringify(overrides));
    } catch (storeErr) {
      console.warn('[SecureStore Save Notice]', storeErr);
    }

    // 2. Optimistically update staffList
    setStaffList((prev) =>
      prev.map((s) =>
        s._id === editingStaffConfig._id
          ? { ...s, ...salaryOverride }
          : s
      )
    );

    // 3. Optimistically update payrollData if present
    setPayrollData((prev) => {
      if (!prev?.staffPayrolls) return prev;
      return {
        ...prev,
        staffPayrolls: prev.staffPayrolls.map((sp) => {
          if (sp.user._id === editingStaffConfig._id) {
            const worked = sp.workedDays || 0;
            const totalDays = sp.totalDaysInMonth || 30;
            const dailyRate = Math.round((salaryVal / totalDays) * 100) / 100;
            const grossEarned = Math.round(dailyRate * worked * 100) / 100;
            const pfEmpDeduction = configPfEnabled ? Math.round(grossEarned * 0.12) : 0;
            const pfEmprContribution = configPfEnabled ? Math.round(grossEarned * 0.12) : 0;
            const totalAdvance = sp.deductions?.totalAdvance || 0;
            const netPayable = Math.max(0, grossEarned - pfEmpDeduction - totalAdvance);
            return {
              ...sp,
              dailyRate,
              grossEarned,
              user: {
                ...sp.user,
                ...salaryOverride,
              },
              deductions: {
                ...sp.deductions,
                pfEnabled: configPfEnabled,
                pfPercentage: 12,
                pfDeduction: pfEmpDeduction,
                pfEmployeeDeduction: pfEmpDeduction,
                pfEmployerContribution: pfEmprContribution,
                totalPfFund: pfEmpDeduction + pfEmprContribution,
                totalDeductions: totalAdvance + pfEmpDeduction,
              },
              netPayable,
            };
          }
          return sp;
        }),
      };
    });

    // 4. Close modal and show success alert immediately
    setSalaryConfigModalVisible(false);
    Alert.alert(
      'Salary Settings Saved',
      `Staff: ${editingStaffConfig.name}\n\n• Total Salary: ₹${salaryVal.toLocaleString()}\n• PF Employee (12%): -₹${empPf.toLocaleString()} (Deducted from salary)\n• PF Employer (12%): +₹${emprPf.toLocaleString()} (Admin Contribution to PF Fund)\n• Total PF Fund (24%): ₹${totalPf.toLocaleString()}\n• Net Salary (After PF): ₹${netTakeHome.toLocaleString()}`
    );

    // 5. Sync to server in the background (succeeds if backend is ready, or logs notice if redeploy is pending)
    try {
      const res = await apiClient.post('/salary/config', {
        userId: editingStaffConfig._id,
        baseSalary: salaryVal,
        pfEnabled: configPfEnabled,
        pfPercentage: 12,
        employerPfPercentage: 12,
      });
      if (res.data?.success) {
        fetchPayrollData(payrollMonthRef.current, true);
      }
    } catch (syncErr) {
      try {
        await apiClient.put(`/admin/staff/${editingStaffConfig._id}`, {
          baseSalary: salaryVal,
          pfEnabled: configPfEnabled,
          pfPercentage: 12,
          employerPfPercentage: 12,
        });
      } catch (fallbackErr) {
        console.log('[Salary Cloud Sync Pending Server Redeploy]', fallbackErr?.response?.data || fallbackErr.message);
      }
    }
  };

  const handleOpenAdvanceModal = (staffPayroll) => {
    setSelectedStaffForAdvance(staffPayroll);
    setAdvanceAmount('');
    setAdvanceDate(getLocalDateString());
    setAdvancePaymentMode('Cash');
    setAdvanceReason('');
    setAdvanceModalVisible(true);
  };

  const handleSaveAdvance = async () => {
    if (!selectedStaffForAdvance || !advanceAmount) {
      Alert.alert('Validation Error', 'Advance amount is required.');
      return;
    }

    try {
      const res = await apiClient.post('/salary/advance', {
        userId: selectedStaffForAdvance.user._id,
        month: payrollMonth,
        date: advanceDate,
        amount: parseFloat(advanceAmount),
        paymentMode: advancePaymentMode,
        reason: advanceReason || 'Salary Advance',
      });
      if (res.data.success) {
        Alert.alert('Advance Disbursed', `Advance of ₹${advanceAmount} recorded.`);
        setAdvanceModalVisible(false);
        fetchPayrollData(payrollMonthRef.current, true);
      }
    } catch (err) {
      Alert.alert('Advance Error', err.response?.data?.error || 'Failed to record advance');
    }
  };

  const handleDeleteAdvance = (advanceId) => {
    Alert.alert(
      'Cancel Advance',
      'Are you sure you want to remove this advance record? It will no longer be deducted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiClient.delete(`/salary/advance/${advanceId}`);
              if (res.data.success) {
                fetchPayrollData(payrollMonthRef.current, true);
                if (selectedStaffForDayWise) {
                  const staffRes = await apiClient.get(
                    `/salary/staff/${selectedStaffForDayWise.user._id}?month=${payrollMonth}`
                  );
                  if (staffRes.data.success) {
                    setSelectedStaffForDayWise(staffRes.data.data);
                  }
                }
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to remove advance');
            }
          },
        },
      ]
    );
  };

  const handleOpenPayoutModal = (staffPayroll) => {
    setSelectedStaffForPayout(staffPayroll);
    const balance =
      staffPayroll.payout.balanceRemaining > 0
        ? staffPayroll.payout.balanceRemaining
        : staffPayroll.netPayable;
    setPayoutAmount(String(balance));
    setPayoutPaymentMode('Cash');
    setPayoutPaymentStatus('Paid');
    setPayoutNotes('');
    setPayoutModalVisible(true);
  };

  const handleSavePayout = async () => {
    if (!selectedStaffForPayout || payoutAmount === '') {
      Alert.alert('Validation Error', 'Payment amount is required.');
      return;
    }

    try {
      const res = await apiClient.post('/salary/payout', {
        userId: selectedStaffForPayout.user._id,
        month: payrollMonth,
        amountPaid: parseFloat(payoutAmount) || 0,
        paymentMode: payoutPaymentMode,
        paymentStatus: payoutPaymentStatus,
        notes: payoutNotes,
      });
      if (res.data.success) {
        Alert.alert('Payment Recorded', `Salary payout of ₹${payoutAmount} confirmed.`);
        setPayoutModalVisible(false);
        fetchPayrollData(payrollMonthRef.current, true);
      }
    } catch (err) {
      Alert.alert('Payout Error', err.response?.data?.error || 'Failed to record payout');
    }
  };

  const activeKitchenOrders = orders.filter((o) =>
    ['Pending', 'Accepted', 'Ready'].includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    ['Completed', 'Rejected'].includes(o.status)
  );

  // Highest revenue category for relative progress calculation
  const maxCategoryRevenue = metrics?.categoryBreakdown
    ? Math.max(...Object.values(metrics.categoryBreakdown), 1)
    : 1;

  return (
    <View style={styles.container}>
      <Header title="Executive Suite" subtitle="Operations & Revenue Intelligence" />

      {/* Real-time Incoming Kitchen Order Alert Banner */}
      {latestLiveOrder && (
        <View style={styles.liveOrderBanner}>
          <View style={styles.liveBannerHeader}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBannerTitle}>
              🔔 LIVE DISPATCH: TABLE {latestLiveOrder.tableId?.tableNumber}
            </Text>
            <TouchableOpacity
              onPress={() => setLatestLiveOrder(null)}
              style={styles.liveBannerClose}
              activeOpacity={0.7}
            >
              <Text style={styles.liveBannerCloseText}>✕ Dismiss</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.liveBannerMeta}>
            Ticket #{latestLiveOrder.orderNumber} • Server: {latestLiveOrder.waiterId?.name || 'Staff'} • Total: ₹{latestLiveOrder.totalAmount}
          </Text>

          <View style={styles.liveBannerItems}>
            {latestLiveOrder.items.map((it, idx) => (
              <Text key={idx} style={styles.liveBannerItemText}>
                🔥 {it.quantity}× {it.name} {it.notes ? `(Note: "${it.notes}")` : ''}
              </Text>
            ))}
          </View>

          <View style={styles.liveBannerFooter}>
            <TouchableOpacity
              style={styles.liveBannerViewBtn}
              onPress={() => {
                setActiveTab('orders');
                setLatestLiveOrder(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.liveBannerViewText}>Inspect in Live Tickets Tab →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Luxury Navigation Tab Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          {[
            { key: 'analytics', label: '📊 Intelligence' },
            { key: 'orders', label: `🧾 Tickets (${activeKitchenOrders.length})` },
            { key: 'menu', label: '🍲 Catalog' },
            { key: 'staff', label: '👥 Personnel' },
            { key: 'attendance', label: '📋 Attendance' },
            { key: 'payroll', label: '💰 Payroll' },
            { key: 'tables', label: '🪑 Floor' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key === 'attendance') {
                  fetchAttendanceData(attendanceDateRef.current);
                } else if (tab.key === 'payroll') {
                  fetchPayrollData(payrollMonthRef.current);
                }
              }}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <LuxuryPatternBackground>
        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loaderText}>Compiling operational intelligence...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* TAB 1: METRICS & REVENUE ANALYTICS */}
            {activeTab === 'analytics' && metrics && (
              <View style={styles.tabContent}>
                {/* Executive Insignia Ribbon */}
                <View style={styles.executiveHeaderBanner}>
                  <View>
                    <Text style={styles.executiveInsignia}>✦ CONSOLE D'ADMINISTRATION ✦</Text>
                    <Text style={styles.executiveTitle}>Live Salon Performance</Text>
                  </View>
                  <MichelinStars count={3} />
                </View>

                {/* 4 Revenue & Occupancy Metric Cards */}
                <View style={styles.metricsGrid}>
                  {/* Card 1: Revenue */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Today's Gross Sales</Text>
                      <View style={styles.metricWatermarkBadge}>
                        <Text style={styles.metricWatermarkIcon}>₹</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.available }]}>
                      ₹{metrics.todayRevenue}
                    </Text>
                    <Text style={styles.metricSub}>Settled & Paid dining orders</Text>
                  </View>

                  {/* Card 2: Tickets */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Total Dining Tickets</Text>
                      <View style={styles.metricWatermarkBadge}>
                        <Text style={styles.metricWatermarkIcon}>🧾</Text>
                      </View>
                    </View>
                    <Text style={styles.metricValue}>{metrics.orders?.total || 0}</Text>
                    <Text style={styles.metricSub}>
                      {metrics.orders?.completed || 0} completed • {metrics.orders?.pending || 0} in cookline
                    </Text>
                  </View>

                  {/* Card 3: Occupancy */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Salon Occupancy</Text>
                      <View style={styles.metricWatermarkBadge}>
                        <Text style={styles.metricWatermarkIcon}>🪑</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.occupied }]}>
                      {metrics.tables?.occupancyRate || 0}%
                    </Text>
                    <Text style={styles.metricSub}>
                      {metrics.tables?.occupied} / {metrics.tables?.total} tables seated
                    </Text>
                  </View>

                  {/* Card 4: Sanitation */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Hygiene Turnover</Text>
                      <View style={styles.metricWatermarkBadge}>
                        <Text style={styles.metricWatermarkIcon}>✨</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.dirty }]}>
                      {metrics.tables?.dirty || 0}
                    </Text>
                    <Text style={styles.metricSub}>Tables awaiting housekeeping</Text>
                  </View>
                </View>

                {/* Real-Time Kitchen Dispatch Feed */}
                <View style={styles.sectionBox}>
                  <View style={styles.feedHeaderRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.sectionTitle}>
                      Live Kitchen Dispatch Stream ({activeKitchenOrders.length})
                    </Text>
                  </View>
                  {activeKitchenOrders.length === 0 ? (
                    <Text style={styles.emptyText}>No tickets currently in kitchen preparation.</Text>
                  ) : (
                    activeKitchenOrders.map((order) => (
                      <View key={order._id} style={styles.liveFeedItem}>
                        <View style={styles.liveFeedItemTop}>
                          <Text style={styles.liveFeedTable}>Table {order.tableId?.tableNumber}</Text>
                          <StatusBadge status={order.status} type="order" size="small" />
                        </View>
                        <Text style={styles.liveFeedWaiter}>
                          Server: {order.waiterId?.name} • ₹{order.totalAmount}
                        </Text>
                        <View style={styles.liveFeedItemsList}>
                          {order.items.map((it, idx) => (
                            <Text key={idx} style={styles.liveFeedItemText}>
                              • {it.quantity}× {it.name} {it.notes ? `("${it.notes}")` : ''}
                            </Text>
                          ))}
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Category Breakdown with Progress Bars */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>Category Revenue Breakdown</Text>
                  <Text style={styles.sectionSubtitle}>Itemized revenue performance by cuisine division</Text>
                  <GoldDivider />

                  {Object.entries(metrics.categoryBreakdown || {}).length === 0 ? (
                    <Text style={styles.emptyText}>No settled orders recorded today yet.</Text>
                  ) : (
                    Object.entries(metrics.categoryBreakdown).map(([category, amount]) => {
                      const ratio = maxCategoryRevenue > 0 ? amount / maxCategoryRevenue : 0;
                      const icon = CATEGORY_ICONS[category] || '🍽️';
                      return (
                        <View key={category} style={styles.categoryItemWrap}>
                          <View style={styles.categoryRow}>
                            <Text style={styles.categoryName}>
                              {icon} {category}
                            </Text>
                            <Text style={styles.categoryAmount}>₹{amount}</Text>
                          </View>
                          <LuxuryProgressBar progress={ratio} />
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* TAB 2: LIVE ORDERS & MASTER OVERRIDE */}
            {activeTab === 'orders' && (
              <View style={styles.tabContent}>
                <View style={styles.ordersHeaderRow}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.sectionHeader}>
                    Active Kitchen Queue ({activeKitchenOrders.length} tickets in preparation)
                  </Text>
                </View>

                {activeKitchenOrders.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <LuxuryEmblem icon="👨‍🍳" size={56} />
                    <Text style={styles.emptyTitle}>Kitchen Queue Clear</Text>
                    <Text style={styles.emptyText}>
                      No active tickets. New orders sent by waiters will appear here instantly.
                    </Text>
                  </View>
                ) : (
                  activeKitchenOrders.map((order) => (
                    <View key={order._id} style={[styles.orderCard, styles.orderCardActive]}>
                      {/* Brass Rail Order Clip */}
                      <LuxuryTicketClip
                        label={`KITCHEN TICKET #${order.orderNumber?.slice(-4) || 'LIVE'}`}
                        color={colors.primary}
                      />

                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderNumberTitle}>
                            Table {order.tableId?.tableNumber} • {order.orderNumber}
                          </Text>
                          <Text style={styles.orderMeta}>
                            Server: {order.waiterId?.name} • {new Date(order.createdAt).toLocaleTimeString()}
                          </Text>
                        </View>
                        <StatusBadge status={order.status} type="order" />
                      </View>

                      <View style={styles.orderItemsSnippet}>
                        {order.items.map((i, idx) => (
                          <View key={idx} style={styles.orderItemRow}>
                            <Text style={styles.orderItemText}>
                              • {i.quantity}× {i.name} (₹{i.price * i.quantity})
                            </Text>
                            {i.notes ? (
                              <Text style={styles.orderItemNote}>⚠️ Chef Instruction: "{i.notes}"</Text>
                            ) : null}
                          </View>
                        ))}
                      </View>

                      <View style={styles.orderCardFooter}>
                        <Text style={styles.orderTotalText}>Total: ₹{order.totalAmount}</Text>

                        <TouchableOpacity
                          style={styles.voidBtn}
                          onPress={() => handleVoidOrder(order)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.voidBtnText}>⚡ Master Void Override</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

                <Text style={[styles.sectionHeader, { marginTop: 24 }]}>
                  Completed & Settled Receipts ({pastOrders.length})
                </Text>

                {pastOrders.map((order) => (
                  <View key={order._id} style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <View>
                        <Text style={styles.orderNumberTitle}>{order.orderNumber}</Text>
                        <Text style={styles.orderMeta}>
                          Table {order.tableId?.tableNumber} • Server: {order.waiterId?.name}
                        </Text>
                      </View>
                      <StatusBadge status={order.status} type="order" />
                    </View>

                    <View style={styles.orderItemsSnippet}>
                      {order.items.map((i, idx) => (
                        <Text key={idx} style={styles.orderItemText}>
                          • {i.quantity}× {i.name} (₹{i.price * i.quantity})
                        </Text>
                      ))}
                    </View>

                    <View style={styles.orderCardFooter}>
                      <Text style={styles.orderTotalText}>Total: ₹{order.totalAmount}</Text>
                      {order.rejectionReason && (
                        <Text style={styles.rejectedReasonText}>
                          Note: {order.rejectionReason}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* TAB 3: MENU MANAGEMENT */}
            {activeTab === 'menu' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTopBar}>
                  <View>
                    <Text style={styles.sectionHeader}>Menu Offerings</Text>
                    <Text style={styles.sectionSubtitle}>{menuItems.length} courses cataloged</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryAddBtn}
                    onPress={() => setMenuModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryAddBtnText}>+ Add Course</Text>
                  </TouchableOpacity>
                </View>

                {menuItems.map((item) => {
                  const catIcon = CATEGORY_ICONS[item.category] || '🍽️';
                  return (
                    <View key={item._id} style={styles.menuManageCard}>
                      <View style={styles.menuManageLeft}>
                        <View style={styles.dishHeaderRow}>
                          <Text style={styles.dishCategoryIcon}>{catIcon}</Text>
                          <Text style={styles.dishName}>{item.name}</Text>
                        </View>
                        <Text style={styles.dishCategory}>{item.category}</Text>
                        <Text style={styles.dishPrice}>₹{item.price}</Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.availToggleBtn,
                          item.isAvailable ? styles.availOn : styles.availOff,
                        ]}
                        onPress={() => handleToggleItemAvailability(item)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.availToggleText,
                            item.isAvailable ? styles.availOnText : styles.availOffText,
                          ]}
                        >
                          {item.isAvailable ? 'In Stock' : '86 / Sold Out'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 4: STAFF MANAGEMENT */}
            {activeTab === 'staff' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTopBar}>
                  <View>
                    <Text style={styles.sectionHeader}>Staff Accounts</Text>
                    <Text style={styles.sectionSubtitle}>{staffList.length} authenticated personnel</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryAddBtn}
                    onPress={() => setStaffModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryAddBtnText}>+ Add Staff Member</Text>
                  </TouchableOpacity>
                </View>

                {staffList.map((staff) => {
                  const baseSalary = staff.baseSalary || 0;
                  const pfEnabled = typeof staff.pfEnabled === 'boolean' ? staff.pfEnabled : true;
                  const empPf = pfEnabled ? Math.round(baseSalary * 0.12) : 0;
                  const emprPf = pfEnabled ? Math.round(baseSalary * 0.12) : 0;
                  const totalPf = empPf + emprPf;
                  const netSalary = pfEnabled ? Math.max(0, baseSalary - empPf) : baseSalary;

                  return (
                    <View key={staff._id} style={styles.staffManageCard}>
                      {/* Top Header: Identity & Status */}
                      <View style={styles.staffProfileHeaderRow}>
                        <View style={styles.staffManageLeft}>
                          <View style={styles.staffAvatarBadge}>
                            <Text style={styles.staffAvatarInitial}>
                              {staff.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.staffNameText}>{staff.name}</Text>
                            <View style={styles.roleBadgeRow}>
                              <View style={[styles.staffRolePill, staff.role === 'Admin' && styles.roleAdmin]}>
                                <Text style={styles.staffRolePillText}>{staff.role}</Text>
                              </View>
                              <Text style={[styles.staffStatusText, { color: staff.isActive ? colors.available : colors.dirty, marginLeft: 8 }]}>
                                {staff.isActive ? '● Active In Service' : '○ Suspended'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.statusToggleBtn, staff.isActive && styles.statusDeactivate]}
                          onPress={() => handleToggleStaffStatus(staff)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.statusToggleText, staff.isActive && styles.statusDeactivateText]}>
                            {staff.isActive ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Official Monthly Salary Box (Requested Format) */}
                      <View style={styles.staffProfileSalaryBox}>
                        <View style={styles.profileSalaryTitleRow}>
                          <Text style={styles.profileSalaryTitle}>📜 MONTHLY SALARY STATEMENT</Text>
                          <Text style={styles.profilePfBadge}>
                            {pfEnabled ? '✓ PF Active: 12% + 12%' : '○ PF Disabled'}
                          </Text>
                        </View>

                        {/* 1. Total salary */}
                        <View style={styles.profileSalaryRow}>
                          <Text style={styles.profileSalaryLabel}>Total salary:</Text>
                          <Text style={styles.profileSalaryTotalVal}>₹{baseSalary.toLocaleString()}</Text>
                        </View>

                        {/* 2. Net salary */}
                        <View style={styles.profileSalaryRowNet}>
                          <View>
                            <Text style={styles.profileSalaryNetLabel}>Net salary (after PF deduction):</Text>
                            <Text style={styles.profileSalaryNetSub}>Take-home pay after employee PF</Text>
                          </View>
                          <Text style={styles.profileSalaryNetVal}>₹{netSalary.toLocaleString()}</Text>
                        </View>

                        {/* 3. PF given by employee */}
                        <View style={styles.profileSalaryRow}>
                          <Text style={styles.profileSalaryLabel}>PF given by employee (12% of total salary):</Text>
                          <Text style={styles.profileSalaryEmpPf}>
                            {pfEnabled ? `- ₹${empPf.toLocaleString()}` : '₹0'}
                          </Text>
                        </View>

                        {/* 4. PF given by the employer */}
                        <View style={styles.profileSalaryRow}>
                          <Text style={styles.profileSalaryLabel}>PF given by the employer (12% of total salary):</Text>
                          <Text style={styles.profileSalaryEmprPf}>
                            {pfEnabled ? `+ ₹${emprPf.toLocaleString()}` : '₹0'}
                          </Text>
                        </View>

                        {/* Total PF Fund Deposited */}
                        <View style={styles.profileTotalPfRow}>
                          <Text style={styles.profileTotalPfLabel}>Total PF Deposited (24% into fund):</Text>
                          <Text style={styles.profileTotalPfVal}>₹{totalPf.toLocaleString()}</Text>
                        </View>
                      </View>

                      {/* Action Controls: Configure Salary & Day-Wise Log */}
                      <View style={styles.staffActionBtnRow}>
                        <TouchableOpacity
                          style={styles.staffConfigureBtn}
                          onPress={() => handleOpenSalaryConfigModal(staff)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.staffConfigureBtnText}>⚙️ Configure Salary & PF</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.staffDayWiseBtn}
                          onPress={() => handleOpenDayWiseModal(staff)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.staffDayWiseBtnText}>📅 Day-Wise Salary Log →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 5: TABLE MANAGEMENT */}
            {activeTab === 'tables' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTopBar}>
                  <View>
                    <Text style={styles.sectionHeader}>Dining Floor Tables</Text>
                    <Text style={styles.sectionSubtitle}>{tables.length} tables in salon</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryAddBtn}
                    onPress={() => setTableModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryAddBtnText}>+ Add Table</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tablesListGrid}>
                  {tables.map((table) => (
                    <View key={table._id} style={styles.tableMiniCard}>
                      <Text style={styles.tableMiniIcon}>🪑</Text>
                      <Text style={styles.tableMiniNumber}>Table {table.tableNumber}</Text>
                      <Text style={styles.tableMiniCapacity}>Capacity: {table.capacity} Guests</Text>
                      <StatusBadge status={table.status} type="table" size="small" />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* TAB 6: STAFF ATTENDANCE MANAGEMENT */}
            {activeTab === 'attendance' && (
              <View style={styles.tabContent}>
                {/* Top Section Bar */}
                <View style={styles.sectionTopBar}>
                  <View>
                    <Text style={styles.sectionHeader}>Staff Attendance</Text>
                    <Text style={styles.sectionSubtitle}>
                      Exclusively managed by Admin • Daily Roster
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.markAllPresentBtn}
                    onPress={handleMarkAllPresent}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.markAllPresentBtnText}>⚡ Mark All Present</Text>
                  </TouchableOpacity>
                </View>

                {/* Date Navigator Bar */}
                <View style={styles.dateNavCard}>
                  <TouchableOpacity
                    style={styles.dateNavArrowBtn}
                    onPress={() => handleDateChange(-1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateNavArrowText}>◀</Text>
                  </TouchableOpacity>

                  <View style={styles.dateNavCenter}>
                    <Text style={styles.dateNavMainText}>
                      {formatDisplayDate(attendanceDate)}
                    </Text>
                    <View style={styles.dateNavTagRow}>
                      {attendanceDate === getLocalDateString() ? (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>⭐ Today</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.jumpTodayBtn}
                          onPress={handleSetTodayDate}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.jumpTodayText}>Jump to Today</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.dateNavRawText}>{attendanceDate}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dateNavArrowBtn}
                    onPress={() => handleDateChange(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateNavArrowText}>▶</Text>
                  </TouchableOpacity>
                </View>

                {/* Daily Attendance KPI Summary Card */}
                {attendanceData?.stats && (
                  <View style={styles.attendanceKpiCard}>
                    <View style={styles.attendanceKpiTop}>
                      <View>
                        <Text style={styles.attendanceKpiLabel}>DAY ATTENDANCE RATE</Text>
                        <Text style={styles.attendanceKpiValue}>
                          {attendanceData.stats.attendanceRate}%
                        </Text>
                      </View>
                      <View style={styles.attendanceKpiStaffCount}>
                        <Text style={styles.attendanceKpiStaffText}>
                          {attendanceData.stats.presentCount +
                            attendanceData.stats.halfDayCount * 0.5}{' '}
                          / {attendanceData.stats.totalStaff} On Duty
                        </Text>
                      </View>
                    </View>

                    <LuxuryProgressBar
                      progress={attendanceData.stats.attendanceRate / 100}
                      height={6}
                    />

                    {/* Breakdown Counter Pills */}
                    <View style={styles.kpiCountersRow}>
                      <View style={[styles.kpiCounterPill, styles.kpiPresent]}>
                        <Text style={styles.kpiCounterNumber}>
                          {attendanceData.stats.presentCount}
                        </Text>
                        <Text style={styles.kpiCounterLabel}>Present</Text>
                      </View>

                      <View style={[styles.kpiCounterPill, styles.kpiHalfDay]}>
                        <Text style={styles.kpiCounterNumber}>
                          {attendanceData.stats.halfDayCount}
                        </Text>
                        <Text style={styles.kpiCounterLabel}>Half-Day</Text>
                      </View>

                      <View style={[styles.kpiCounterPill, styles.kpiAbsent]}>
                        <Text style={styles.kpiCounterNumber}>
                          {attendanceData.stats.absentCount}
                        </Text>
                        <Text style={styles.kpiCounterLabel}>Absent</Text>
                      </View>

                      <View style={[styles.kpiCounterPill, styles.kpiLeave]}>
                        <Text style={styles.kpiCounterNumber}>
                          {attendanceData.stats.leaveCount}
                        </Text>
                        <Text style={styles.kpiCounterLabel}>Leave</Text>
                      </View>

                      <View style={[styles.kpiCounterPill, styles.kpiUnmarked]}>
                        <Text style={styles.kpiCounterNumber}>
                          {attendanceData.stats.unmarkedCount}
                        </Text>
                        <Text style={styles.kpiCounterLabel}>Pending</Text>
                      </View>
                    </View>

                    {/* Day Salary / Wages Incurred KPI Banner */}
                    <View style={styles.totalDayWagesBanner}>
                      <View style={styles.totalDayWagesLeft}>
                        <Text style={styles.totalDayWagesIcon}>💰</Text>
                        <View>
                          <Text style={styles.totalDayWagesLabel}>TODAY'S WAGES / SALARY INCURRED</Text>
                          <Text style={styles.totalDayWagesSub}>Calculated strictly as per marked attendance</Text>
                        </View>
                      </View>
                      <Text style={styles.totalDayWagesAmount}>
                        ₹{(attendanceData.stats.totalSalaryIncurredToday || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Staff Roster Cards */}
                {attendanceLoading && !attendanceData ? (
                  <View style={styles.loaderCenter}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loaderText}>Loading attendance roster...</Text>
                  </View>
                ) : attendanceData?.roster && attendanceData.roster.length > 0 ? (
                  attendanceData.roster.map((staff) => {
                    const status = staff.attendance?.status || staff.status || 'Not Marked';
                    return (
                      <View key={staff.staffId} style={styles.attendanceCard}>
                        {/* Header: Avatar, Name, Role, Current Status */}
                        <View style={styles.attendanceCardHeader}>
                          <View style={styles.attendanceCardLeft}>
                            <View style={styles.attendanceAvatar}>
                              <Text style={styles.attendanceAvatarText}>
                                {staff.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View>
                              <Text style={styles.attendanceStaffName}>{staff.name}</Text>
                              <View style={styles.roleBadgeRow}>
                                <View
                                  style={[
                                    styles.staffRolePill,
                                    staff.role === 'Waiter' && styles.roleWaiter,
                                    staff.role === 'Cook' && styles.roleCook,
                                    staff.role === 'Cleaner' && styles.roleCleaner,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.staffRolePillText,
                                      staff.role === 'Waiter' && styles.roleWaiterText,
                                      staff.role === 'Cook' && styles.roleCookText,
                                      staff.role === 'Cleaner' && styles.roleCleanerText,
                                    ]}
                                  >
                                    {staff.role}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* Status Badge */}
                          <View
                            style={[
                              styles.attStatusPill,
                              status === 'Present' && styles.attPresentPill,
                              status === 'Half-Day' && styles.attHalfDayPill,
                              status === 'Absent' && styles.attAbsentPill,
                              status === 'On Leave' && styles.attLeavePill,
                              status === 'Not Marked' && styles.attPendingPill,
                            ]}
                          >
                            <Text
                              style={[
                                styles.attStatusText,
                                status === 'Present' && styles.attPresentText,
                                status === 'Half-Day' && styles.attHalfDayText,
                                status === 'Absent' && styles.attAbsentText,
                                status === 'On Leave' && styles.attLeaveText,
                                status === 'Not Marked' && styles.attPendingText,
                              ]}
                            >
                              {status === 'Present' && '✓ Present'}
                              {status === 'Half-Day' && '½ Half-Day'}
                              {status === 'Absent' && '✕ Absent'}
                              {status === 'On Leave' && '🌴 On Leave'}
                              {status === 'Not Marked' && '⏳ Pending'}
                            </Text>
                          </View>
                        </View>

                        {/* 4 Single-Tap Status Action Buttons */}
                        <View style={styles.statusActionBtnRow}>
                          <TouchableOpacity
                            style={[
                              styles.statusActionBtn,
                              styles.btnPresent,
                              status === 'Present' && styles.btnPresentActive,
                            ]}
                            onPress={() =>
                              handleMarkStaff(
                                staff.staffId,
                                'Present',
                                staff.attendance?.notes || staff.notes || ''
                              )
                            }
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.statusActionBtnText,
                                styles.btnPresentText,
                                status === 'Present' && styles.btnActiveText,
                              ]}
                            >
                              ✓ Present
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.statusActionBtn,
                              styles.btnHalfDay,
                              status === 'Half-Day' && styles.btnHalfDayActive,
                            ]}
                            onPress={() =>
                              handleMarkStaff(
                                staff.staffId,
                                'Half-Day',
                                staff.attendance?.notes || staff.notes || ''
                              )
                            }
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.statusActionBtnText,
                                styles.btnHalfDayText,
                                status === 'Half-Day' && styles.btnActiveText,
                              ]}
                            >
                              ½ Half-Day
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.statusActionBtn,
                              styles.btnAbsent,
                              status === 'Absent' && styles.btnAbsentActive,
                            ]}
                            onPress={() =>
                              handleMarkStaff(
                                staff.staffId,
                                'Absent',
                                staff.attendance?.notes || staff.notes || ''
                              )
                            }
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.statusActionBtnText,
                                styles.btnAbsentText,
                                status === 'Absent' && styles.btnActiveText,
                              ]}
                            >
                              ✕ Absent
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.statusActionBtn,
                              styles.btnLeave,
                              status === 'On Leave' && styles.btnLeaveActive,
                            ]}
                            onPress={() =>
                              handleMarkStaff(
                                staff.staffId,
                                'On Leave',
                                staff.attendance?.notes || staff.notes || ''
                              )
                            }
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.statusActionBtnText,
                                styles.btnLeaveText,
                                status === 'On Leave' && styles.btnActiveText,
                              ]}
                            >
                              🌴 Leave
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* DAY-WISE SALARY AS PER ATTENDANCE BOX */}
                        <View style={styles.daySalaryRosterBox}>
                          <View style={styles.daySalaryHeaderRow}>
                            <View style={styles.daySalaryTitleGroup}>
                              <Text style={styles.daySalaryTitleLabel}>DAY-WISE SALARY (AS PER ATTENDANCE)</Text>
                              <Text style={styles.daySalaryBaseText}>
                                Base: ₹{(staff.baseSalary || 0).toLocaleString()} (₹{staff.dailyRate || 0}/day)
                              </Text>
                            </View>
                            <View style={styles.dayEarnedBadgeGroup}>
                              <Text style={styles.dayEarnedLabel}>TODAY'S EARNED</Text>
                              <Text
                                style={[
                                  styles.dayEarnedValue,
                                  status === 'Present' && styles.dayEarnedPresent,
                                  status === 'Half-Day' && styles.dayEarnedHalfDay,
                                  (status === 'Absent' || status === 'On Leave') && styles.dayEarnedZero,
                                  status === 'Not Marked' && styles.dayEarnedPending,
                                ]}
                              >
                                {status === 'Present' && `+ ₹${staff.dailyRate || 0}`}
                                {status === 'Half-Day' && `+ ₹${Math.round((staff.dailyRate || 0) * 0.5 * 100) / 100}`}
                                {status === 'Absent' && '₹0 (Absent)'}
                                {status === 'On Leave' && '₹0 (On Leave)'}
                                {status === 'Not Marked' && '⏳ Pending'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.daySalaryMetricsRow}>
                            <View style={styles.daySalaryMetricItem}>
                              <Text style={styles.daySalaryMetricSub}>Daily Rate</Text>
                              <Text style={styles.daySalaryMetricVal}>₹{staff.dailyRate || 0}</Text>
                            </View>
                            <View style={styles.daySalaryMetricItem}>
                              <Text style={styles.daySalaryMetricSub}>Daily Net (Take-Home)</Text>
                              <Text style={[styles.daySalaryMetricVal, { color: colors.available }]}>
                                ₹{staff.dailyNetSalary || staff.dailyRate || 0}
                              </Text>
                            </View>
                            <View style={styles.daySalaryMetricItem}>
                              <Text style={styles.daySalaryMetricSub}>Emp PF (12%)</Text>
                              <Text style={[styles.daySalaryMetricVal, { color: colors.dirty }]}>
                                {staff.pfEnabled ? `-₹${staff.dailyEmpPf || 0}` : '₹0'}
                              </Text>
                            </View>
                            <View style={styles.daySalaryMetricItem}>
                              <Text style={styles.daySalaryMetricSub}>Admin PF (12%)</Text>
                              <Text style={[styles.daySalaryMetricVal, { color: colors.primaryDark }]}>
                                {staff.pfEnabled ? `+₹${staff.dailyEmprPf || 0}` : '₹0'}
                              </Text>
                            </View>
                          </View>

                          {/* Direct Button to View Complete Calendar Day-Wise Salary Log */}
                          <TouchableOpacity
                            style={styles.viewDayWiseBreakdownBtn}
                            onPress={() => {
                              const fullStaff = staffList.find((s) => s._id === (staff.staffId || staff._id)) || staff;
                              handleOpenDayWiseModal(fullStaff);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.viewDayWiseBreakdownText}>
                              📅 View Day-Wise Salary Log ({formatDisplayMonth(attendanceDate.substring(0, 7))}) →
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Footer: Remark pill + Monthly History Button */}
                        <View style={styles.attendanceCardFooter}>
                          <TouchableOpacity
                            style={styles.remarkBtn}
                            onPress={() => handleOpenNoteModal(staff)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.remarkBtnText}>
                              {(staff.attendance?.notes || staff.notes)
                                ? `💬 "${staff.attendance?.notes || staff.notes}"`
                                : '💬 + Add Remark'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.historyBtn}
                            onPress={() => handleOpenStaffHistory(staff)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.historyBtnText}>📊 Attendance History →</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyAttendanceCard}>
                    <Text style={styles.emptyAttendanceTitle}>No Personnel Listed</Text>
                    <Text style={styles.emptyAttendanceSubtitle}>
                      Add active staff in Personnel tab to manage daily attendance.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB 7: STAFF PAYROLL & SALARY MANAGEMENT */}
            {activeTab === 'payroll' && (
              <View style={styles.tabContent}>
                {/* Top Section Bar */}
                <View style={styles.sectionTopBar}>
                  <View>
                    <Text style={styles.sectionHeader}>Staff Payroll & Salary</Text>
                    <Text style={styles.sectionSubtitle}>
                      Base pay, PF deductions, advances & day-wise settlements
                    </Text>
                  </View>
                </View>

                {/* Month Navigator Bar */}
                <View style={styles.dateNavCard}>
                  <TouchableOpacity
                    style={styles.dateNavArrowBtn}
                    onPress={() => handlePayrollMonthChange(-1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateNavArrowText}>◀</Text>
                  </TouchableOpacity>

                  <View style={styles.dateNavCenter}>
                    <Text style={styles.dateNavMainText}>
                      {formatDisplayMonth(payrollMonth)}
                    </Text>
                    <View style={styles.dateNavTagRow}>
                      {payrollMonth === getCurrentMonthStr() ? (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>⭐ Current Month</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.jumpTodayBtn}
                          onPress={() => {
                            const cur = getCurrentMonthStr();
                            setPayrollMonth(cur);
                            fetchPayrollData(cur);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.jumpTodayText}>Jump to Current Month</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.dateNavRawText}>{payrollMonth}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dateNavArrowBtn}
                    onPress={() => handlePayrollMonthChange(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateNavArrowText}>▶</Text>
                  </TouchableOpacity>
                </View>

                {/* Payroll Executive Summary Card */}
                {payrollData?.summary && (
                  <View style={styles.payrollKpiCard}>
                    <View style={styles.payrollKpiTop}>
                      <View>
                        <Text style={styles.attendanceKpiLabel}>TOTAL NET PAYROLL DUE</Text>
                        <Text style={styles.payrollKpiValue}>
                          ₹{payrollData.summary.totalNetPayable.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.payrollStatusSummary}>
                        <Text style={styles.payrollPaidText}>
                          Paid: ₹{payrollData.summary.totalAmountPaid.toLocaleString()}
                        </Text>
                        <Text style={styles.payrollPendingText}>
                          Pending: ₹{payrollData.summary.totalBalancePending.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <GoldDivider />

                    <View style={styles.payrollCountersRow}>
                      <View style={styles.payrollCounterItem}>
                        <Text style={styles.payrollCounterLabel}>Base Salaries</Text>
                        <Text style={styles.payrollCounterValue}>
                          ₹{payrollData.summary.totalBaseSalaries.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.payrollCounterItem}>
                        <Text style={styles.payrollCounterLabel}>Gross Earned</Text>
                        <Text style={[styles.payrollCounterValue, { color: colors.available }]}>
                          ₹{payrollData.summary.totalGrossEarned.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.payrollCounterItem}>
                        <Text style={styles.payrollCounterLabel}>PF Deductions</Text>
                        <Text style={[styles.payrollCounterValue, { color: colors.dirty }]}>
                          -₹{payrollData.summary.totalPfDeductions.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.payrollCounterItem}>
                        <Text style={styles.payrollCounterLabel}>Advances Given</Text>
                        <Text style={[styles.payrollCounterValue, { color: colors.occupied }]}>
                          -₹{payrollData.summary.totalAdvanceDeductions.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Staff Payroll Cards */}
                {payrollLoading && !payrollData ? (
                  <View style={styles.loaderCenter}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loaderText}>Calculating staff payroll statements...</Text>
                  </View>
                ) : payrollData?.staffPayrolls && payrollData.staffPayrolls.length > 0 ? (
                  payrollData.staffPayrolls.map((staff) => (
                    <View key={staff.user._id} style={styles.payrollStaffCard}>
                      {/* Staff Header */}
                      <View style={styles.payrollCardHeader}>
                        <View style={styles.payrollCardLeft}>
                          <View style={styles.attendanceAvatar}>
                            <Text style={styles.attendanceAvatarText}>
                              {staff.user.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.attendanceStaffName}>{staff.user.name}</Text>
                            <View style={styles.roleBadgeRow}>
                              <View
                                style={[
                                  styles.staffRolePill,
                                  staff.user.role === 'Waiter' && styles.roleWaiter,
                                  staff.user.role === 'Cook' && styles.roleCook,
                                  staff.user.role === 'Cleaner' && styles.roleCleaner,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.staffRolePillText,
                                    staff.user.role === 'Waiter' && styles.roleWaiterText,
                                    staff.user.role === 'Cook' && styles.roleCookText,
                                    staff.user.role === 'Cleaner' && styles.roleCleanerText,
                                  ]}
                                >
                                  {staff.user.role}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        {/* Payment Settlement Status Badge */}
                        <View
                          style={[
                            styles.payoutBadge,
                            staff.payout.paymentStatus === 'Paid' && styles.payoutPaid,
                            staff.payout.paymentStatus === 'Partially Paid' && styles.payoutPartial,
                            staff.payout.paymentStatus === 'Unpaid' && styles.payoutUnpaid,
                          ]}
                        >
                          <Text
                            style={[
                              styles.payoutBadgeText,
                              staff.payout.paymentStatus === 'Paid' && styles.textPaid,
                              staff.payout.paymentStatus === 'Partially Paid' && styles.textPartial,
                              staff.payout.paymentStatus === 'Unpaid' && styles.textUnpaid,
                            ]}
                          >
                            {staff.payout.paymentStatus === 'Paid' && '✓ Paid'}
                            {staff.payout.paymentStatus === 'Partially Paid' && `½ Paid: ₹${staff.payout.amountPaid}`}
                            {staff.payout.paymentStatus === 'Unpaid' && '⏳ Unpaid'}
                          </Text>
                        </View>
                      </View>

                      {/* Base Salary & Configuration */}
                      <View style={styles.salaryRateBar}>
                        <View>
                          <Text style={styles.salaryRateLabel}>BASE MONTHLY SALARY</Text>
                          <Text style={styles.salaryRateValue}>
                            ₹{staff.user.baseSalary.toLocaleString()}{' '}
                            <Text style={styles.salaryRateSub}>(₹{staff.dailyRate}/day)</Text>
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.configSalaryBtn}
                          onPress={() => handleOpenSalaryConfigModal(staff)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.configSalaryBtnText}>⚙️ Configure Pay & PF</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Attendance Performance & Gross Earned */}
                      <View style={styles.payrollPerformanceRow}>
                        <View style={styles.payrollPerfCol}>
                          <Text style={styles.payrollPerfLabel}>Worked / Total</Text>
                          <Text style={styles.payrollPerfValue}>
                            {staff.workedDays} / {staff.totalDaysInMonth} Days
                          </Text>
                        </View>
                        <View style={styles.payrollPerfCol}>
                          <Text style={styles.payrollPerfLabel}>Gross Earned</Text>
                          <Text style={[styles.payrollPerfValue, { color: colors.available }]}>
                            ₹{staff.grossEarned.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.payrollPerfCol}>
                          <Text style={styles.payrollPerfLabel}>Net Payable</Text>
                          <Text style={[styles.payrollPerfValue, { color: colors.primaryDark }]}>
                            ₹{staff.netPayable.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Itemized Deductions Box */}
                      <View style={styles.payrollDeductionBox}>
                        <View style={styles.deductionItemRow}>
                          <Text style={styles.deductionItemLabel}>
                            PF Employee (12% Deducted from salary):
                          </Text>
                          <Text style={[styles.deductionItemValue, { color: colors.dirty }]}>
                            {staff.deductions.pfEnabled
                              ? `- ₹${(staff.deductions.pfEmployeeDeduction || staff.deductions.pfDeduction || Math.round((staff.grossEarned || staff.user.baseSalary || 0) * 0.12)).toLocaleString()}`
                              : '₹0 (Inactive)'}
                          </Text>
                        </View>

                        <View style={styles.deductionItemRow}>
                          <Text style={styles.deductionItemLabel}>
                            PF Employer (12% Admin contribution to PF fund):
                          </Text>
                          <Text style={[styles.deductionItemValue, { color: colors.available }]}>
                            {staff.deductions.pfEnabled
                              ? `+ ₹${(staff.deductions.pfEmployerContribution || Math.round((staff.grossEarned || staff.user.baseSalary || 0) * 0.12)).toLocaleString()}`
                              : '₹0 (Inactive)'}
                          </Text>
                        </View>

                        <View style={styles.deductionItemRow}>
                          <Text style={styles.deductionItemLabel}>
                            Total Monthly PF Fund (24% into employee PF):
                          </Text>
                          <Text style={[styles.deductionItemValue, { color: '#B8860B', fontWeight: '800' }]}>
                            {staff.deductions.pfEnabled
                              ? `₹${(staff.deductions.totalPfFund || Math.round((staff.grossEarned || staff.user.baseSalary || 0) * 0.24)).toLocaleString()}`
                              : '₹0'}
                          </Text>
                        </View>

                        <View style={styles.deductionItemRow}>
                          <Text style={styles.deductionItemLabel}>
                            Advance Salary Deducted:
                          </Text>
                          <Text style={styles.deductionItemValue}>
                            - ₹{staff.deductions.totalAdvance.toLocaleString()}
                          </Text>
                        </View>

                        {/* List advances if taken */}
                        {staff.deductions.advancesList && staff.deductions.advancesList.length > 0 && (
                          <View style={styles.adminAdvancesList}>
                            {staff.deductions.advancesList.map((adv) => (
                              <View key={adv._id} style={styles.adminAdvanceRow}>
                                <Text style={styles.adminAdvanceText}>
                                  • {adv.date}: ₹{adv.amount} ({adv.reason || 'Advance'} via {adv.paymentMode})
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleDeleteAdvance(adv._id)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.deleteAdvanceText}>✕ Remove</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.deductionTotalRow}>
                          <Text style={styles.deductionTotalLabel}>Total Deductions:</Text>
                          <Text style={styles.deductionTotalValue}>
                            - ₹{staff.deductions.totalDeductions.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Action Controls */}
                      <View style={styles.payrollActionRow}>
                        <TouchableOpacity
                          style={styles.advanceActionBtn}
                          onPress={() => handleOpenAdvanceModal(staff)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.advanceActionBtnText}>💸 Disburse Advance</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.payoutActionBtn}
                          onPress={() => handleOpenPayoutModal(staff)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.payoutActionBtnText}>💳 Pay Salary</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dayWiseActionBtn}
                          onPress={() => handleOpenDayWiseModal(staff)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.dayWiseActionBtnText}>📅 Day-Wise Log →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : staffList.filter((s) => s.role !== 'Admin').length > 0 ? (
                  staffList
                    .filter((s) => s.role !== 'Admin')
                    .map((staff) => {
                      const salaryVal = staff.baseSalary || 0;
                      const empPf = staff.pfEnabled ? Math.round(salaryVal * 0.12) : 0;
                      const emprPf = staff.pfEnabled ? Math.round(salaryVal * 0.12) : 0;
                      const totalPf = empPf + emprPf;
                      const netPayable = staff.pfEnabled ? Math.max(0, salaryVal - empPf) : salaryVal;

                      return (
                        <View key={staff._id} style={styles.payrollStaffCard}>
                          <View style={styles.payrollCardHeader}>
                            <View style={styles.payrollCardLeft}>
                              <View style={styles.attendanceAvatar}>
                                <Text style={styles.attendanceAvatarText}>{staff.name.charAt(0).toUpperCase()}</Text>
                              </View>
                              <View>
                                <Text style={styles.attendanceStaffName}>{staff.name}</Text>
                                <View style={styles.roleBadgeRow}>
                                  <View style={styles.staffRolePill}>
                                    <Text style={styles.staffRolePillText}>{staff.role}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </View>

                          <View style={styles.salaryRateBar}>
                            <View>
                              <Text style={styles.salaryRateLabel}>TOTAL MONTHLY SALARY</Text>
                              <Text style={styles.salaryRateValue}>₹{salaryVal.toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.configSalaryBtn}
                              onPress={() => handleOpenSalaryConfigModal(staff)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.configSalaryBtnText}>⚙️ Configure Total Salary & PF</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.payrollDeductionBox}>
                            <View style={styles.deductionItemRow}>
                              <Text style={styles.deductionItemLabel}>Total Salary (Gross):</Text>
                              <Text style={styles.deductionItemValue}>₹{salaryVal.toLocaleString()}</Text>
                            </View>
                            <View style={styles.deductionItemRow}>
                              <Text style={styles.deductionItemLabel}>PF Employee (12% Deducted from salary):</Text>
                              <Text style={[styles.deductionItemValue, { color: colors.dirty }]}>{staff.pfEnabled ? `- ₹${empPf.toLocaleString()}` : '₹0 (Off)'}</Text>
                            </View>
                            <View style={styles.deductionItemRow}>
                              <Text style={styles.deductionItemLabel}>PF Employer (12% Admin contribution to PF):</Text>
                              <Text style={[styles.deductionItemValue, { color: colors.available }]}>{staff.pfEnabled ? `+ ₹${emprPf.toLocaleString()}` : '₹0 (Off)'}</Text>
                            </View>
                            <View style={styles.deductionItemRow}>
                              <Text style={styles.deductionItemLabel}>Total PF Deposited in Fund (24%):</Text>
                              <Text style={[styles.deductionItemValue, { color: '#B8860B', fontWeight: '800' }]}>{staff.pfEnabled ? `₹${totalPf.toLocaleString()}` : '₹0'}</Text>
                            </View>
                            <View style={styles.deductionTotalRow}>
                              <Text style={styles.deductionTotalLabel}>Net Salary (After PF deduction):</Text>
                              <Text style={[styles.deductionTotalValue, { color: colors.available }]}>₹{netPayable.toLocaleString()}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                ) : (
                  <View style={styles.emptyAttendanceCard}>
                    <Text style={styles.emptyAttendanceTitle}>No Staff Records</Text>
                    <Text style={styles.emptyAttendanceSubtitle}>
                      Add active restaurant personnel to generate payroll statements.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </LuxuryPatternBackground>

      {/* MODAL: ADD MENU ITEM */}
      <Modal visible={menuModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Add New Menu Offering</Text>
            <GoldDivider />

            <TextInput
              style={styles.formInput}
              placeholder="Course Name (e.g. Malai Kofta Royale)"
              placeholderTextColor={colors.textMuted}
              value={newMenuItem.name}
              onChangeText={(text) => setNewMenuItem({ ...newMenuItem, name: text })}
            />

            <Text style={styles.inputLabel}>Cuisine Category (No Tandoor):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {ALLOWED_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catSelectPill,
                    newMenuItem.category === cat && styles.catSelectPillActive,
                  ]}
                  onPress={() => setNewMenuItem({ ...newMenuItem, category: cat })}
                >
                  <Text
                    style={[
                      styles.catSelectText,
                      newMenuItem.category === cat && styles.catSelectTextActive,
                    ]}
                  >
                    {CATEGORY_ICONS[cat] || '🍽️'} {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.formInput}
              placeholder="Price (₹)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newMenuItem.price}
              onChangeText={(text) => setNewMenuItem({ ...newMenuItem, price: text })}
            />

            <TextInput
              style={[styles.formInput, { height: 60 }]}
              placeholder="Description (Optional chef notes)"
              placeholderTextColor={colors.textMuted}
              multiline
              value={newMenuItem.description}
              onChangeText={(text) => setNewMenuItem({ ...newMenuItem, description: text })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setMenuModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateMenuItem}
              >
                <Text style={styles.modalSubmitText}>Save Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD STAFF */}
      <Modal visible={staffModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Create Staff Account</Text>
            <GoldDivider />

            <TextInput
              style={styles.formInput}
              placeholder="Staff Full Name"
              placeholderTextColor={colors.textMuted}
              value={newStaff.name}
              onChangeText={(text) => setNewStaff({ ...newStaff, name: text })}
            />

            <Text style={styles.inputLabel}>Role Designation:</Text>
            <View style={styles.rolePickerRow}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleSelectPill,
                    newStaff.role === role && styles.roleSelectPillActive,
                  ]}
                  onPress={() => setNewStaff({ ...newStaff, role })}
                >
                  <Text
                    style={[
                      styles.roleSelectText,
                      newStaff.role === role && styles.roleSelectTextActive,
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.formInput}
              placeholder="4-digit Security PIN"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
              value={newStaff.pin}
              onChangeText={(text) => setNewStaff({ ...newStaff, pin: text })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setStaffModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateStaff}
              >
                <Text style={styles.modalSubmitText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD TABLE */}
      <Modal visible={tableModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Add Dining Table</Text>
            <GoldDivider />

            <TextInput
              style={styles.formInput}
              placeholder="Table Number (e.g. 9)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newTable.tableNumber}
              onChangeText={(text) => setNewTable({ ...newTable, tableNumber: text })}
            />

            <TextInput
              style={styles.formInput}
              placeholder="Guest Capacity (e.g. 4)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newTable.capacity}
              onChangeText={(text) => setNewTable({ ...newTable, capacity: text })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTableModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateTable}
              >
                <Text style={styles.modalSubmitText}>Save Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: MONTHLY ATTENDANCE HISTORY */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.historyModalCard]}>
            <View style={styles.historyModalHeader}>
              <View style={styles.historyHeaderLeft}>
                <View style={styles.historyStaffAvatar}>
                  <Text style={styles.historyStaffAvatarText}>
                    {selectedStaffForHistory?.name?.charAt(0).toUpperCase() || 'S'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalCardTitle}>
                    {selectedStaffForHistory?.name}'s Attendance
                  </Text>
                  <Text style={styles.historyStaffRole}>
                    Role: {selectedStaffForHistory?.role || 'Staff'} • Monthly Log
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                style={styles.historyCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.historyCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <GoldDivider />

            {/* Month Switcher Bar */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => handleHistoryMonthChange(-1)}
                activeOpacity={0.7}
              >
                <Text style={styles.monthNavBtnText}>◀ Previous Month</Text>
              </TouchableOpacity>
              <Text style={styles.monthNavTitle}>
                {formatDisplayMonth(historyMonth)}
              </Text>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => handleHistoryMonthChange(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.monthNavBtnText}>Next Month ▶</Text>
              </TouchableOpacity>
            </View>

            {staffHistoryLoading ? (
              <View style={styles.loaderCenter}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loaderText}>Loading monthly log...</Text>
              </View>
            ) : (
              <>
                {/* Monthly Summary Statistics */}
                {staffHistoryData?.summary && (
                  <View style={styles.monthSummaryBox}>
                    <View style={styles.monthSummaryTop}>
                      <Text style={styles.monthSummaryRateLabel}>
                        MONTHLY ATTENDANCE RATE
                      </Text>
                      <Text style={styles.monthSummaryRateValue}>
                        {staffHistoryData.summary.attendanceRate}%
                      </Text>
                    </View>
                    <View style={styles.monthSummaryPills}>
                      <View style={[styles.miniSummaryPill, styles.kpiPresent]}>
                        <Text style={styles.miniSummaryText}>
                          ✓ {staffHistoryData.summary.presentDays} Present
                        </Text>
                      </View>
                      <View style={[styles.miniSummaryPill, styles.kpiHalfDay]}>
                        <Text style={styles.miniSummaryText}>
                          ½ {staffHistoryData.summary.halfDays} Half-Day
                        </Text>
                      </View>
                      <View style={[styles.miniSummaryPill, styles.kpiAbsent]}>
                        <Text style={styles.miniSummaryText}>
                          ✕ {staffHistoryData.summary.absentDays} Absent
                        </Text>
                      </View>
                      <View style={[styles.miniSummaryPill, styles.kpiLeave]}>
                        <Text style={styles.miniSummaryText}>
                          🌴 {staffHistoryData.summary.leaveDays} Leave
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Chronological Log List */}
                <ScrollView
                  style={styles.historyLogScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {staffHistoryData?.history && staffHistoryData.history.length > 0 ? (
                    staffHistoryData.history.map((record) => (
                      <View key={record._id} style={styles.historyLogRow}>
                        <View style={styles.historyLogDateCol}>
                          <Text style={styles.historyLogDate}>
                            {record.dateString}
                          </Text>
                          <Text style={styles.historyLogDay}>
                            {formatDisplayDate(record.dateString).split(',')[0]}
                          </Text>
                        </View>

                        <View style={styles.historyLogInfoCol}>
                          <View
                            style={[
                              styles.attStatusPill,
                              styles.attStatusPillSmall,
                              record.status === 'Present' && styles.attPresentPill,
                              record.status === 'Half-Day' && styles.attHalfDayPill,
                              record.status === 'Absent' && styles.attAbsentPill,
                              record.status === 'On Leave' && styles.attLeavePill,
                            ]}
                          >
                            <Text
                              style={[
                                styles.attStatusText,
                                styles.attStatusTextSmall,
                                record.status === 'Present' && styles.attPresentText,
                                record.status === 'Half-Day' && styles.attHalfDayText,
                                record.status === 'Absent' && styles.attAbsentText,
                                record.status === 'On Leave' && styles.attLeaveText,
                              ]}
                            >
                              {record.status}
                            </Text>
                          </View>
                          {record.notes ? (
                            <Text style={styles.historyLogNotes}>
                              💬 {record.notes}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyHistoryBox}>
                      <Text style={styles.emptyHistoryText}>
                        No attendance records for {formatDisplayMonth(historyMonth)}.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { marginTop: 14 }]}
              onPress={() => setHistoryModalVisible(false)}
            >
              <Text style={styles.modalSubmitText}>Close History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ATTENDANCE REMARK / NOTE */}
      <Modal visible={noteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Attendance Remark</Text>
            <Text style={styles.noteModalSubtitle}>
              For {editingStaffNote?.name} on {formatDisplayDate(attendanceDate)}
            </Text>
            <GoldDivider />

            <Text style={styles.inputLabel}>Quick Presets:</Text>
            <View style={styles.presetChipsRow}>
              {[
                'Approved Leave',
                'Sick / Medical',
                'Half Day (Morning)',
                'Half Day (Evening)',
                'Late Arrival',
                'Family Emergency',
              ].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.presetChip}
                  onPress={() => {
                    setNoteInputText((prev) =>
                      prev ? `${prev}, ${preset}` : preset
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>+ {preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.formInput, { height: 75 }]}
              placeholder="Enter reason or remark (e.g. Approved leave for personal work)..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={noteInputText}
              onChangeText={setNoteInputText}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setNoteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveStaffNote}
              >
                <Text style={styles.modalSubmitText}>Save Remark</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 1: ADMIN DAY-WISE SALARY STATEMENT */}
      <Modal visible={dayWiseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.historyModalCard]}>
            <View style={styles.historyModalHeader}>
              <View style={styles.historyHeaderLeft}>
                <View style={styles.historyStaffAvatar}>
                  <Text style={styles.historyStaffAvatarText}>
                    {selectedStaffForDayWise?.user?.name?.charAt(0).toUpperCase() || 'S'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalCardTitle}>
                    {selectedStaffForDayWise?.user?.name}'s Salary Statement
                  </Text>
                  <Text style={styles.historyStaffRole}>
                    {selectedStaffForDayWise?.user?.role} • {formatDisplayMonth(payrollMonth)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setDayWiseModalVisible(false)}
                style={styles.historyCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.historyCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <GoldDivider />

            <ScrollView style={styles.historyLogScroll} showsVerticalScrollIndicator={false}>
              {/* Summary Metrics */}
              {selectedStaffForDayWise && (
                <View style={styles.monthSummaryBox}>
                  <View style={styles.monthSummaryTop}>
                    <Text style={styles.monthSummaryRateLabel}>NET PAYABLE AMOUNT</Text>
                    <Text style={styles.monthSummaryRateValue}>
                      ₹{selectedStaffForDayWise.netPayable.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.miniSummaryPillsRow}>
                    <View style={styles.miniSalaryPill}>
                      <Text style={styles.miniSalaryPillLabel}>Base Salary</Text>
                      <Text style={styles.miniSalaryPillVal}>
                        ₹{selectedStaffForDayWise.user.baseSalary.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.miniSalaryPill}>
                      <Text style={styles.miniSalaryPillLabel}>Daily Rate</Text>
                      <Text style={styles.miniSalaryPillVal}>
                        ₹{selectedStaffForDayWise.dailyRate}
                      </Text>
                    </View>
                    <View style={styles.miniSalaryPill}>
                      <Text style={styles.miniSalaryPillLabel}>Worked Days</Text>
                      <Text style={styles.miniSalaryPillVal}>
                        {selectedStaffForDayWise.workedDays}/{selectedStaffForDayWise.totalDaysInMonth}
                      </Text>
                    </View>
                    <View style={styles.miniSalaryPill}>
                      <Text style={styles.miniSalaryPillLabel}>Gross Earned</Text>
                      <Text style={[styles.miniSalaryPillVal, { color: colors.available }]}>
                        ₹{selectedStaffForDayWise.grossEarned.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Monthly Salary & Deductions Breakdown */}
                  <View style={styles.adminModalDeductionBox}>
                    <View style={styles.deductionLine}>
                      <Text style={styles.deductionLabel}>Total salary:</Text>
                      <Text style={[styles.deductionValue, { color: colors.secondary, fontWeight: '900' }]}>
                        ₹{(selectedStaffForDayWise.user?.baseSalary || 0).toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.deductionLine}>
                      <Text style={styles.deductionLabel}>Net salary (after PF deduction):</Text>
                      <Text style={[styles.deductionValue, { color: colors.available, fontWeight: '900' }]}>
                        ₹{(selectedStaffForDayWise.netPayable || 0).toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.deductionLine}>
                      <Text style={styles.deductionLabel}>PF given by employee (12% of total salary):</Text>
                      <Text style={[styles.deductionValue, { color: colors.dirty }]}>
                        {selectedStaffForDayWise.deductions.pfEnabled
                          ? `- ₹${(selectedStaffForDayWise.deductions.pfEmployeeDeduction || selectedStaffForDayWise.deductions.pfDeduction || Math.round((selectedStaffForDayWise.user?.baseSalary || 0) * 0.12)).toLocaleString()}`
                          : '₹0'}
                      </Text>
                    </View>

                    <View style={styles.deductionLine}>
                      <Text style={styles.deductionLabel}>PF given by the employer (12% of total salary):</Text>
                      <Text style={[styles.deductionValue, { color: colors.available }]}>
                        {selectedStaffForDayWise.deductions.pfEnabled
                          ? `+ ₹${(selectedStaffForDayWise.deductions.pfEmployerContribution || Math.round((selectedStaffForDayWise.user?.baseSalary || 0) * 0.12)).toLocaleString()}`
                          : '₹0'}
                      </Text>
                    </View>

                    <View style={styles.deductionLine}>
                      <Text style={styles.deductionLabel}>Total PF Deposited (24% into fund):</Text>
                      <Text style={[styles.deductionValue, { color: '#B8860B', fontWeight: '900' }]}>
                        {selectedStaffForDayWise.deductions.pfEnabled
                          ? `₹${(selectedStaffForDayWise.deductions.totalPfFund || Math.round((selectedStaffForDayWise.user?.baseSalary || 0) * 0.24)).toLocaleString()}`
                          : '₹0'}
                      </Text>
                    </View>

                    <View style={styles.deductionLine}>
                      <Text style={styles.deductionLabel}>Advances Deducted:</Text>
                      <Text style={styles.deductionValue}>
                        - ₹{selectedStaffForDayWise.deductions.totalAdvance.toLocaleString()}
                      </Text>
                    </View>

                    {selectedStaffForDayWise.deductions.advancesList?.length > 0 && (
                      <View style={styles.advancesListContainer}>
                        {selectedStaffForDayWise.deductions.advancesList.map((adv) => (
                          <View key={adv._id} style={styles.adminAdvanceRow}>
                            <Text style={styles.advanceItemText}>
                              • {adv.date}: ₹{adv.amount} ({adv.reason} via {adv.paymentMode})
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteAdvance(adv._id)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.deleteAdvanceText}>✕ Remove</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.dividerThin} />
                    <View style={styles.deductionLineTotal}>
                      <Text style={styles.totalDeductionLabel}>Total Deductions:</Text>
                      <Text style={styles.totalDeductionValue}>
                        - ₹{selectedStaffForDayWise.deductions.totalDeductions.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Day-Wise Breakdown List */}
              <Text style={[styles.cardHeaderTitle, { marginTop: 8, marginBottom: 4 }]}>
                Day-Wise Earnings Log
              </Text>

              {selectedStaffForDayWise?.dayWiseBreakdown?.map((item) => (
                <View key={item.dateString} style={styles.historyLogRow}>
                  <View style={styles.historyLogDateCol}>
                    <Text style={styles.historyLogDate}>{item.dateString}</Text>
                    <Text style={styles.historyLogDay}>{item.dayOfWeek}</Text>
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
                        {item.status}
                      </Text>
                    </View>
                    {item.notes ? (
                      <Text style={styles.dayNotesText} numberOfLines={1}>
                        "{item.notes}"
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                      Day Total: ₹{item.dailyTotalSalary || item.dailyRate || selectedStaffForDayWise.dailyRate} • Net: ₹{item.dailyNetSalary || Math.round(((selectedStaffForDayWise?.netPayable || selectedStaffForDayWise?.user?.baseSalary || 0) / (selectedStaffForDayWise?.totalDaysInMonth || 30)) * 100) / 100}
                    </Text>
                  </View>

                  <View style={styles.historyLogInfoCol}>
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
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { marginTop: 14 }]}
              onPress={() => setDayWiseModalVisible(false)}
            >
              <Text style={styles.modalSubmitText}>Close Statement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CONFIGURE SALARY & PF */}
      <Modal visible={salaryConfigModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Configure Salary & Benefits</Text>
            <Text style={styles.noteModalSubtitle}>
              For {editingStaffConfig?.name} ({editingStaffConfig?.role})
            </Text>
            <GoldDivider />

            <Text style={styles.inputLabel}>Monthly Base Salary (₹):</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. 15000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={configBaseSalary}
              onChangeText={setConfigBaseSalary}
            />

            <Text style={styles.inputLabel}>Provident Fund (PF):</Text>
            <View style={styles.pfToggleRow}>
              <TouchableOpacity
                style={[styles.pfToggleBtn, configPfEnabled && styles.pfToggleBtnActive]}
                onPress={() => setConfigPfEnabled(!configPfEnabled)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pfToggleBtnText, configPfEnabled && styles.pfToggleBtnTextActive]}>
                  {configPfEnabled ? '✓ PF Active: 12% Employee + 12% Employer' : '○ PF Disabled'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Live Calculation Preview Card */}
            {(() => {
              const totalVal = parseFloat(configBaseSalary) || 0;
              const empPf = configPfEnabled ? Math.round(totalVal * 0.12) : 0;
              const emprPf = configPfEnabled ? Math.round(totalVal * 0.12) : 0;
              const totalPf = empPf + emprPf;
              const netVal = configPfEnabled ? Math.max(0, totalVal - empPf) : totalVal;
              return (
                <View style={styles.liveSalaryPreviewBox}>
                  <Text style={styles.previewTitle}>📊 Live Salary & PF Calculation Preview</Text>

                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total Salary (Monthly Gross):</Text>
                    <Text style={styles.previewValueBold}>₹{totalVal.toLocaleString()}</Text>
                  </View>

                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>PF Employee (12% Deducted from salary):</Text>
                    <Text style={[styles.previewValue, { color: colors.dirty }]}>
                      {configPfEnabled ? `- ₹${empPf.toLocaleString()}` : '₹0 (Disabled)'}
                    </Text>
                  </View>

                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>PF Employer (12% Admin contribution to PF fund):</Text>
                    <Text style={[styles.previewValue, { color: colors.available }]}>
                      {configPfEnabled ? `+ ₹${emprPf.toLocaleString()}` : '₹0 (Disabled)'}
                    </Text>
                  </View>

                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total PF Deposited (24% into fund):</Text>
                    <Text style={[styles.previewValue, { color: '#B8860B', fontWeight: '800' }]}>
                      {configPfEnabled ? `₹${totalPf.toLocaleString()}` : '₹0'}
                    </Text>
                  </View>

                  <View style={styles.previewDivider} />

                  <View style={styles.previewRowNet}>
                    <Text style={styles.previewNetLabel}>Net Salary (Take-Home after PF deduction):</Text>
                    <Text style={styles.previewNetValue}>₹{netVal.toLocaleString()}</Text>
                  </View>
                </View>
              );
            })()}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSalaryConfigModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveSalaryConfig}
              >
                <Text style={styles.modalSubmitText}>Save Salary Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: DISBURSE ADVANCE SALARY */}
      <Modal visible={advanceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Disburse Advance Salary</Text>
            <Text style={styles.noteModalSubtitle}>
              For {selectedStaffForAdvance?.user?.name} • Settlement Month: {payrollMonth}
            </Text>
            <GoldDivider />

            <Text style={styles.inputLabel}>Advance Amount (₹):</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. 2000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
            />

            <Text style={styles.inputLabel}>Disbursement Date (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.formInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={advanceDate}
              onChangeText={setAdvanceDate}
            />

            <Text style={styles.inputLabel}>Payment Mode:</Text>
            <View style={styles.rolePickerRow}>
              {['Cash', 'UPI', 'Bank Transfer'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.roleSelectPill,
                    advancePaymentMode === mode && styles.roleSelectPillActive,
                  ]}
                  onPress={() => setAdvancePaymentMode(mode)}
                >
                  <Text
                    style={[
                      styles.roleSelectText,
                      advancePaymentMode === mode && styles.roleSelectTextActive,
                    ]}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reason / Quick Presets:</Text>
            <View style={styles.presetChipsRow}>
              {['Festival Advance', 'Medical', 'Travel', 'Emergency', 'Rent'].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.presetChip}
                  onPress={() => setAdvanceReason(preset)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>+ {preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.formInput, { height: 55 }]}
              placeholder="Reason for advance..."
              placeholderTextColor={colors.textMuted}
              value={advanceReason}
              onChangeText={setAdvanceReason}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAdvanceModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveAdvance}
              >
                <Text style={styles.modalSubmitText}>Disburse Advance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: RECORD SALARY SETTLEMENT */}
      <Modal visible={payoutModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Record Salary Payout</Text>
            <Text style={styles.noteModalSubtitle}>
              For {selectedStaffForPayout?.user?.name} • Month: {formatDisplayMonth(payrollMonth)}
            </Text>
            <GoldDivider />

            <View style={styles.payoutNetBanner}>
              <Text style={styles.payoutNetLabel}>TOTAL NET PAYABLE DUE</Text>
              <Text style={styles.payoutNetValue}>
                ₹{selectedStaffForPayout?.netPayable?.toLocaleString()}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Amount Being Paid Now (₹):</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. 5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={payoutAmount}
              onChangeText={setPayoutAmount}
            />

            <Text style={styles.inputLabel}>Payment Mode:</Text>
            <View style={styles.rolePickerRow}>
              {['Cash', 'UPI', 'Bank Transfer'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.roleSelectPill,
                    payoutPaymentMode === mode && styles.roleSelectPillActive,
                  ]}
                  onPress={() => setPayoutPaymentMode(mode)}
                >
                  <Text
                    style={[
                      styles.roleSelectText,
                      payoutPaymentMode === mode && styles.roleSelectTextActive,
                    ]}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Settlement Status:</Text>
            <View style={styles.rolePickerRow}>
              {['Paid', 'Partially Paid'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.roleSelectPill,
                    payoutPaymentStatus === st && styles.roleSelectPillActive,
                  ]}
                  onPress={() => setPayoutPaymentStatus(st)}
                >
                  <Text
                    style={[
                      styles.roleSelectText,
                      payoutPaymentStatus === st && styles.roleSelectTextActive,
                    ]}
                  >
                    {st === 'Paid' ? '✓ Fully Settled (Paid)' : '½ Partial Payment'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.formInput, { height: 50 }]}
              placeholder="Optional payment notes or transaction reference..."
              placeholderTextColor={colors.textMuted}
              value={payoutNotes}
              onChangeText={setPayoutNotes}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPayoutModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSavePayout}
              >
                <Text style={styles.modalSubmitText}>Confirm Payout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  liveOrderBanner: {
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  liveBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  livePulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  liveBannerTitle: {
    flex: 1,
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  liveBannerClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.cardBorderGold,
  },
  liveBannerCloseText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  liveBannerMeta: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  liveBannerItems: {
    gap: 3,
    marginBottom: 10,
    paddingLeft: 8,
  },
  liveBannerItemText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  liveBannerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  liveBannerViewBtn: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  liveBannerViewText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  tabBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 5,
  },
  tabBarScroll: {
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 70,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 13,
  },
  tabContent: {
    gap: 16,
  },
  executiveHeaderBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorderGold,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  executiveInsignia: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1.5,
  },
  executiveTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '800',
    flex: 1,
  },
  metricWatermarkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricWatermarkIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  liveFeedItem: {
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
  },
  liveFeedItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveFeedTable: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  liveFeedWaiter: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 2,
    fontWeight: '800',
  },
  liveFeedItemsList: {
    marginTop: 6,
    gap: 2,
  },
  liveFeedItemText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryItemWrap: {
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  categoryAmount: {
    color: colors.textGold,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 12,
  },
  ordersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    marginBottom: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderCardActive: {
    borderColor: colors.primary,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  orderNumberTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  orderMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  orderItemsSnippet: {
    marginVertical: 12,
    gap: 4,
  },
  orderItemRow: {
    marginBottom: 2,
  },
  orderItemText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  orderItemNote: {
    color: colors.occupied,
    fontSize: 11,
    fontStyle: 'italic',
    marginLeft: 12,
    fontWeight: '700',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: colors.cardBorder,
  },
  orderTotalText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textGold,
  },
  rejectedReasonText: {
    fontSize: 11,
    color: colors.dirty,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  voidBtn: {
    backgroundColor: colors.dirtyBg,
    borderWidth: 1.5,
    borderColor: colors.dirtyBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  voidBtnText: {
    color: colors.dirty,
    fontSize: 11,
    fontWeight: '900',
  },
  sectionTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryAddBtn: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryAddBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  menuManageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuManageLeft: {
    flex: 1,
  },
  dishHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dishCategoryIcon: {
    fontSize: 18,
  },
  dishName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  dishCategory: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '700',
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textGold,
    marginTop: 2,
  },
  availToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  availOn: {
    backgroundColor: colors.availableBg,
    borderColor: colors.availableBorder,
  },
  availOff: {
    backgroundColor: '#F1F5F9',
    borderColor: colors.cardBorderStrong,
  },
  availToggleText: {
    fontWeight: '900',
    fontSize: 11,
  },
  availOnText: {
    color: colors.available,
  },
  availOffText: {
    color: colors.textSecondary,
  },
  staffManageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  staffManageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  staffAvatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatarInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  staffNameText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  staffRoleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '700',
  },
  staffStatusText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  statusToggleBtn: {
    backgroundColor: colors.availableBg,
    borderColor: colors.availableBorder,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDeactivate: {
    backgroundColor: '#F1F5F9',
    borderColor: colors.cardBorderStrong,
  },
  statusToggleText: {
    color: colors.available,
    fontWeight: '900',
    fontSize: 11,
  },
  statusDeactivateText: {
    color: colors.textSecondary,
  },
  tablesListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tableMiniCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    alignItems: 'center',
    gap: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tableMiniIcon: {
    fontSize: 22,
  },
  tableMiniNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  tableMiniCapacity: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  modalCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  formInput: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  categoryPicker: {
    flexGrow: 0,
    marginBottom: 14,
  },
  catSelectPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.bg,
    marginRight: 6,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
  },
  catSelectPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  catSelectText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  catSelectTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleSelectPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    alignItems: 'center',
  },
  roleSelectPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  roleSelectText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  roleSelectTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontWeight: '800',
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSubmitText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  /* Attendance Management Styles */
  markAllPresentBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  markAllPresentBtnText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  dateNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  dateNavArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavArrowText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.secondary,
  },
  dateNavCenter: {
    alignItems: 'center',
    gap: 3,
  },
  dateNavMainText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.secondary,
  },
  dateNavTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  jumpTodayBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  jumpTodayText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  dateNavRawText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  attendanceKpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    padding: 14,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  attendanceKpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  attendanceKpiLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  attendanceKpiValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
    marginTop: 2,
  },
  attendanceKpiStaffCount: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  attendanceKpiStaffText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  kpiCountersRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  kpiCounterPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiCounterNumber: {
    fontSize: 15,
    fontWeight: '900',
  },
  kpiCounterLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  kpiPresent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  kpiHalfDay: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  kpiAbsent: {
    backgroundColor: '#FFF1F2',
    borderColor: '#EF4444',
  },
  kpiLeave: {
    backgroundColor: '#F3E8FF',
    borderColor: '#A855F7',
  },
  kpiUnmarked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
  },
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  attendanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendanceAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  attendanceStaffName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.secondary,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  staffRolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  staffRolePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  roleWaiter: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  roleWaiterText: {
    color: '#1D4ED8',
  },
  roleCook: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  roleCookText: {
    color: '#B45309',
  },
  roleCleaner: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  roleCleanerText: {
    color: '#15803D',
  },
  attStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  attStatusPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  attStatusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  attStatusTextSmall: {
    fontSize: 10,
    fontWeight: '800',
  },
  attPresentPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  attPresentText: {
    color: '#059669',
  },
  attHalfDayPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  attHalfDayText: {
    color: '#D97706',
  },
  attAbsentPill: {
    backgroundColor: '#FFF1F2',
    borderColor: '#EF4444',
  },
  attAbsentText: {
    color: '#E11D48',
  },
  attLeavePill: {
    backgroundColor: '#F3E8FF',
    borderColor: '#A855F7',
  },
  attLeaveText: {
    color: '#7E22CE',
  },
  attPendingPill: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
  },
  attPendingText: {
    color: '#64748B',
  },
  statusActionBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  statusActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  btnPresent: {
    borderColor: '#10B981',
  },
  btnPresentText: {
    color: '#059669',
  },
  btnPresentActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  btnHalfDay: {
    borderColor: '#F59E0B',
  },
  btnHalfDayText: {
    color: '#D97706',
  },
  btnHalfDayActive: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  btnAbsent: {
    borderColor: '#EF4444',
  },
  btnAbsentText: {
    color: '#E11D48',
  },
  btnAbsentActive: {
    backgroundColor: '#E11D48',
    borderColor: '#BE123C',
  },
  btnLeave: {
    borderColor: '#A855F7',
  },
  btnLeaveText: {
    color: '#7E22CE',
  },
  btnLeaveActive: {
    backgroundColor: '#7E22CE',
    borderColor: '#6B21A8',
  },
  btnActiveText: {
    color: '#FFFFFF',
  },
  attendanceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  remarkBtn: {
    flex: 1,
    paddingVertical: 4,
  },
  remarkBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  historyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  historyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  emptyAttendanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyAttendanceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.secondary,
  },
  emptyAttendanceSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  /* History Modal Styles */
  historyModalCard: {
    maxHeight: '85%',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyStaffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyStaffAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  historyStaffRole: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },
  historyCloseBtn: {
    padding: 6,
  },
  historyCloseText: {
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
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
  monthSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  monthSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthSummaryRateLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  monthSummaryRateValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  monthSummaryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniSummaryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniSummaryText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyLogScroll: {
    maxHeight: 220,
  },
  historyLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyLogDateCol: {
    gap: 2,
  },
  historyLogDate: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  historyLogDay: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  historyLogInfoCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyLogNotes: {
    fontSize: 10,
    fontStyle: 'italic',
    color: colors.textSecondary,
    maxWidth: 180,
  },
  emptyHistoryBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  /* Note Modal Presets */
  noteModalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorderStrong,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  /* Payroll & Salary Management Styles */
  payrollKpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    padding: 14,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  payrollKpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  payrollKpiValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
    marginTop: 2,
  },
  payrollStatusSummary: {
    alignItems: 'flex-end',
    gap: 3,
  },
  payrollPaidText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.available,
  },
  payrollPendingText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.occupied,
  },
  payrollCountersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  payrollCounterItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  payrollCounterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  payrollCounterValue: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 2,
  },
  payrollStaffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    padding: 14,
    marginBottom: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  payrollCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payrollCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payoutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  payoutPaid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  payoutPartial: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  payoutUnpaid: {
    backgroundColor: '#FFF1F2',
    borderColor: '#EF4444',
  },
  payoutBadgeText: {
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
  salaryRateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  salaryRateLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  salaryRateValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primaryDark,
    marginTop: 1,
  },
  salaryRateSub: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  configSalaryBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  configSalaryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  payrollPerformanceRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 8,
  },
  payrollPerfCol: {
    flex: 1,
    alignItems: 'center',
  },
  payrollPerfLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  payrollPerfValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 2,
  },
  payrollDeductionBox: {
    backgroundColor: '#FFF8F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    gap: 6,
  },
  deductionItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deductionItemValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dirty,
  },
  adminAdvancesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  adminAdvanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminAdvanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  deleteAdvanceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    marginLeft: 6,
  },
  deductionTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  deductionTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
  },
  deductionTotalValue: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.dirty,
  },
  payrollActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  advanceActionBtn: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  advanceActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  payoutActionBtn: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  payoutActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  dayWiseActionBtn: {
    flex: 1.1,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayWiseActionBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  /* Day-Wise Statement Modal styles */
  miniSummaryPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  miniSalaryPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  miniSalaryPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  miniSalaryPillVal: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 1,
  },
  adminModalDeductionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 8,
    gap: 4,
    marginTop: 6,
  },
  deductionLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deductionValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dirty,
  },
  advancesListContainer: {
    backgroundColor: '#FFF1F2',
    borderRadius: 6,
    padding: 6,
    gap: 3,
  },
  advanceItemText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#BE123C',
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
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
  },
  totalDeductionValue: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.dirty,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
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
  dayEarnedText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
  },
  dayEarnedPositive: {
    color: colors.available,
    fontWeight: '900',
  },
  pfToggleRow: {
    marginBottom: 10,
  },
  pfToggleBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pfToggleBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  pfToggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  pfToggleBtnTextActive: {
    color: '#059669',
    fontWeight: '900',
  },
  payoutNetBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutNetLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#166534',
  },
  payoutNetValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 2,
  },
  liveSalaryPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    marginVertical: 12,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primaryDark,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  previewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  previewValueBold: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 8,
  },
  previewRowNet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  previewNetLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  previewNetValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.available,
  },
  staffSalaryActionBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  staffSalaryActionBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
  },
  staffProfileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  staffProfileSalaryBox: {
    backgroundColor: '#FDFCF7',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    gap: 4,
  },
  profileSalaryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8C8',
    marginBottom: 2,
  },
  profileSalaryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8A6D3B',
    letterSpacing: 0.5,
  },
  profilePfBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  profileSalaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  profileSalaryLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.secondary,
  },
  profileSalaryTotalVal: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.secondary,
  },
  profileSalaryRowNet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginVertical: 3,
  },
  profileSalaryNetLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#065F46',
  },
  profileSalaryNetSub: {
    fontSize: 9,
    color: '#047857',
  },
  profileSalaryNetVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#047857',
  },
  profileSalaryEmpPf: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dirty,
  },
  profileSalaryEmprPf: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.available,
  },
  profileTotalPfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE047',
    marginTop: 2,
  },
  profileTotalPfLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854D0E',
  },
  profileTotalPfVal: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#854D0E',
  },
  staffActionBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  staffConfigureBtn: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  staffConfigureBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
  },
  staffDayWiseBtn: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
  },
  staffDayWiseBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
  },
  // Day-Wise Salary as per Attendance Styles
  daySalaryRosterBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6DCB8',
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  daySalaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7CF',
    paddingBottom: 6,
  },
  daySalaryTitleGroup: {
    flex: 1,
  },
  daySalaryTitleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C7335',
    letterSpacing: 0.5,
  },
  daySalaryBaseText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 2,
  },
  dayEarnedBadgeGroup: {
    alignItems: 'flex-end',
  },
  dayEarnedLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayEarnedValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  dayEarnedPresent: {
    color: colors.available,
  },
  dayEarnedHalfDay: {
    color: '#D97706',
  },
  dayEarnedZero: {
    color: colors.dirty,
  },
  dayEarnedPending: {
    color: colors.textMuted,
  },
  daySalaryMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  daySalaryMetricItem: {
    flex: 1,
  },
  daySalaryMetricSub: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  daySalaryMetricVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 1,
  },
  viewDayWiseBreakdownBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDayWiseBreakdownText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  totalDayWagesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F4E9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2D5A9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  totalDayWagesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalDayWagesIcon: {
    fontSize: 20,
  },
  totalDayWagesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C7335',
    letterSpacing: 0.5,
  },
  totalDayWagesSub: {
    fontSize: 9,
    color: colors.textMuted,
  },
  totalDayWagesAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.available,
  },
});

export default AdminDashboard;

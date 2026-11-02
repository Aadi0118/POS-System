/**
 * @file StaffSalaryBanner.js
 * @description Luxury Staff Profile Salary Banner displayed on staff dashboards
 * (Waiter, Cook, Cleaner). Displays monthly salary breakdown (Total Salary, Net Salary,
 * Employee PF 12%, Employer PF 12%) and one-click access to the full day-wise calendar.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getSecureItem } from '../utils/secureStore';
import StaffSalaryModal from './StaffSalaryModal';
import colors from '../theme/colors';

const StaffSalaryBanner = () => {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [salaryConfig, setSalaryConfig] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadSalary = async () => {
      if (!user) return;
      let effectiveBase = user.baseSalary || 0;
      let effectivePfEnabled = typeof user.pfEnabled === 'boolean' ? user.pfEnabled : true;

      try {
        const raw = await getSecureItem('pos_staff_salary_overrides');
        if (raw) {
          const overrides = JSON.parse(raw);
          const userId = user.id || user._id;
          if (overrides[userId]) {
            if (overrides[userId].baseSalary !== undefined) {
              effectiveBase = Number(overrides[userId].baseSalary);
            }
            if (overrides[userId].pfEnabled !== undefined) {
              effectivePfEnabled = Boolean(overrides[userId].pfEnabled);
            }
          }
        }
      } catch (_) {}

      if (isMounted) {
        setSalaryConfig({
          baseSalary: effectiveBase,
          pfEnabled: effectivePfEnabled,
        });
      }
    };

    loadSalary();
    return () => { isMounted = false; };
  }, [user]);

  if (!user || user.role === 'Admin') return null;

  const totalSalary = salaryConfig?.baseSalary || 0;
  const pfEnabled = salaryConfig?.pfEnabled ?? true;
  const empPf = pfEnabled ? Math.round(totalSalary * 0.12) : 0;
  const emprPf = pfEnabled ? Math.round(totalSalary * 0.12) : 0;
  const totalPf = empPf + emprPf;
  const netSalary = pfEnabled ? Math.max(0, totalSalary - empPf) : totalSalary;

  return (
    <>
      <TouchableOpacity
        style={styles.bannerContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.topHeader}>
          <View style={styles.topLeft}>
            <Text style={styles.insigniaText}>💼 SALARY & BENEFITS PROFILE</Text>
            <Text style={styles.staffNameText}>
              {user.name} ({user.role})
            </Text>
          </View>
          <View style={styles.viewDetailsBtn}>
            <Text style={styles.viewDetailsText}>📅 Day-Wise Log →</Text>
          </View>
        </View>

        {/* 4-Item Format Requested by User */}
        <View style={styles.metricsGrid}>
          {/* 1. Total Salary */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total salary</Text>
            <Text style={styles.metricValueTotal}>₹{totalSalary.toLocaleString()}</Text>
          </View>

          {/* 2. Net Salary */}
          <View style={[styles.metricItem, styles.metricItemNet]}>
            <Text style={styles.metricLabelNet}>Net salary</Text>
            <Text style={styles.metricValueNet}>₹{netSalary.toLocaleString()}</Text>
          </View>

          {/* 3. PF Employee */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PF employee (12%)</Text>
            <Text style={styles.metricValueEmpPf}>
              {pfEnabled ? `- ₹${empPf.toLocaleString()}` : '₹0'}
            </Text>
          </View>

          {/* 4. PF Employer */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PF employer (12%)</Text>
            <Text style={styles.metricValueEmprPf}>
              {pfEnabled ? `+ ₹${emprPf.toLocaleString()}` : '₹0'}
            </Text>
          </View>
        </View>

        <View style={styles.bannerFooter}>
          <Text style={styles.footerHint}>
            {pfEnabled
              ? `🏦 Total PF Deposited: ₹${totalPf.toLocaleString()} (24% into fund) • Tap for day-wise earnings log`
              : '○ PF Disabled • Tap for full calendar statement'}
          </Text>
        </View>
      </TouchableOpacity>

      <StaffSalaryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FDFCF7',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    borderRadius: 14,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
    padding: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8C8',
  },
  topLeft: {
    flex: 1,
  },
  insigniaText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#8A6D3B',
    letterSpacing: 0.6,
  },
  staffNameText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.secondary,
    marginTop: 1,
  },
  viewDetailsBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewDetailsText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#047857',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  metricItemNet: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
  },
  metricLabelNet: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'center',
  },
  metricValueTotal: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 2,
  },
  metricValueNet: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 2,
  },
  metricValueEmpPf: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dirty,
    marginTop: 2,
  },
  metricValueEmprPf: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.available,
    marginTop: 2,
  },
  bannerFooter: {
    marginTop: 6,
    alignItems: 'center',
  },
  footerHint: {
    fontSize: 9,
    fontWeight: '600',
    color: '#854D0E',
  },
});

export default StaffSalaryBanner;

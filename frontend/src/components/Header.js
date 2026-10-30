/**
 * @file Header.js
 * @description Haute Cuisine Top Navigation Bar.
 * Features a golden top ribbon, royal crest, fine-dining typography,
 * and elegant staff identity badge with visible luxury borders.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

const Header = ({ title, subtitle }) => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.wrapper}>
      {/* Opulent Top Gold Accent Ribbon */}
      <View style={styles.topGoldRibbon} />

      <View style={styles.headerContainer}>
        {/* Left Section: Brand & Service Status */}
        <View style={styles.leftSection}>
          <View style={styles.titleRow}>
            <View style={styles.crestCircle}>
              <Text style={styles.crestEmoji}>👑</Text>
            </View>
            <View>
              <Text style={styles.title}>{title || 'Spicy Zaika'}</Text>
              <View style={styles.serviceRow}>
                <Text style={styles.serviceSparkle}>✦</Text>
                <Text style={styles.subtitle}>{subtitle || 'Haute Gastronomie'}</Text>
                <Text style={styles.serviceSparkle}>✦</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Section: Staff Identity & Actions */}
        <View style={styles.rightSection}>
          {user && (
            <View style={styles.userBadge}>
              <View style={styles.livePulseContainer}>
                <View style={styles.livePulseDot} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.rolePill}>
                  <Text style={styles.roleText}>{user.role}</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Sign Out ⎋</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  topGoldRibbon: {
    height: 3,
    backgroundColor: colors.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
  },
  leftSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crestCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.cardBorderGold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  crestEmoji: {
    fontSize: 18,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.8,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  serviceSparkle: {
    color: colors.primary,
    fontSize: 8,
  },
  subtitle: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.cardBorderGold,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  livePulseContainer: {
    marginRight: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.available,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  rolePill: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  logoutText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default Header;

/**
 * @file Header.js
 * @description Haute Cuisine Top Navigation Bar.
 * Features a golden top ribbon, royal crest, fine-dining typography,
 * and elegant staff identity badge with visible luxury borders.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
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
              <Image
                source={require('../../assets/logo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.titleTextContainer}>
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {title || 'Shree Restaurant'}
              </Text>
              <View style={styles.serviceRow}>
                <Text style={styles.serviceSparkle}>✦</Text>
                <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
                  {subtitle || 'Haute Gastronomie'}
                </Text>
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
                <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {user.name}
                </Text>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
    width: '100%',
  },
  topGoldRibbon: {
    height: 3,
    backgroundColor: colors.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
  },
  leftSection: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crestCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cardBorderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    padding: 2,
  },
  headerLogo: {
    width: '100%',
    height: '100%',
  },
  titleTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.secondary,
    letterSpacing: 0.6,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    gap: 3,
  },
  serviceSparkle: {
    color: colors.primary,
    fontSize: 7,
  },
  subtitle: {
    fontSize: 9,
    color: colors.primaryDark,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.cardBorderGold,
    maxWidth: 160,
  },
  livePulseContainer: {
    marginRight: 5,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.available,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 75,
  },
  rolePill: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  roleText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  logoutText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
});

export default Header;

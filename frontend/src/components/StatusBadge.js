/**
 * @file StatusBadge.js
 * @description Luxury status badge pill with high-contrast, distinct visible borders.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const StatusBadge = ({ status, type = 'table', size = 'medium' }) => {
  let badgeBg = colors.cardBgHover;
  let textColor = colors.textSecondary;
  let borderColor = colors.cardBorderStrong;

  const normalized = (status || '').toLowerCase();

  if (type === 'table') {
    switch (normalized) {
      case 'available':
        badgeBg = colors.availableBg;
        textColor = colors.available;
        borderColor = colors.availableBorder;
        break;
      case 'occupied':
        badgeBg = colors.occupiedBg;
        textColor = colors.occupied;
        borderColor = colors.occupiedBorder;
        break;
      case 'dirty':
        badgeBg = colors.dirtyBg;
        textColor = colors.dirty;
        borderColor = colors.dirtyBorder;
        break;
      default:
        badgeBg = colors.bgAlt;
        textColor = colors.textSecondary;
        borderColor = colors.cardBorderStrong;
    }
  } else {
    // Order statuses: Pending, Accepted, Ready, Completed, Rejected
    switch (normalized) {
      case 'pending':
        badgeBg = colors.pendingBg;
        textColor = colors.pending;
        borderColor = colors.occupiedBorder;
        break;
      case 'accepted':
        badgeBg = colors.acceptedBg;
        textColor = colors.accepted;
        borderColor = colors.acceptedBorder;
        break;
      case 'ready':
        badgeBg = colors.readyBg;
        textColor = colors.ready;
        borderColor = colors.availableBorder;
        break;
      case 'completed':
        badgeBg = colors.completedBg;
        textColor = colors.completed;
        borderColor = colors.cardBorderStrong;
        break;
      case 'rejected':
        badgeBg = colors.rejectedBg;
        textColor = colors.rejected;
        borderColor = colors.dirtyBorder;
        break;
      default:
        badgeBg = colors.bgAlt;
        textColor = colors.textSecondary;
        borderColor = colors.cardBorderStrong;
    }
  }

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeBg, borderColor },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor },
          isSmall && styles.textSmall,
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  textSmall: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
});

export default StatusBadge;

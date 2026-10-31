/**
 * @file Keypad.js
 * @description White & Luxury on-screen numeric keypad with distinct, visible borders.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const Keypad = ({ onKeyPress, onDelete, onClear, disabled }) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['CLR', '0', 'DEL'],
  ];

  const handlePress = (key) => {
    if (disabled) return;
    if (key === 'DEL') {
      onDelete();
    } else if (key === 'CLR') {
      onClear();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <View style={styles.container}>
      {keys.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((key) => {
            const isActionKey = key === 'DEL' || key === 'CLR';
            return (
              <TouchableOpacity
                key={`key-${key}`}
                style={[
                  styles.keyButton,
                  isActionKey && styles.actionButton,
                  disabled && styles.disabledButton,
                ]}
                onPress={() => handlePress(key)}
                activeOpacity={0.6}
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.keyText,
                    isActionKey && styles.actionText,
                    disabled && styles.disabledText,
                  ]}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  keyButton: {
    width: 82,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  actionButton: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.cardBorderStrong,
  },
  disabledButton: {
    opacity: 0.4,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  disabledText: {
    color: colors.textMuted,
  },
});

export default Keypad;

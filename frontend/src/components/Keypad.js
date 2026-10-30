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
    maxWidth: 320,
    alignSelf: 'center',
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  keyButton: {
    width: 86,
    height: 74,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.cardBorderStrong,
  },
  disabledButton: {
    opacity: 0.4,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  disabledText: {
    color: colors.textMuted,
  },
});

export default Keypad;

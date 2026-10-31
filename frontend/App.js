/**
 * @file App.js
 * @description Master React Native application root with luxury white theme.
 * Dispatches staff to role-specific fine-dining dashboards.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Inject mobile viewport and touch rules on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.id = 'pos-mobile-viewport-fix';
  style.textContent = `
    html, body, #root {
      width: 100%;
      height: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: manipulation;
    }
    #root {
      display: flex;
      flex-direction: column;
    }
  `;
  if (!document.getElementById('pos-mobile-viewport-fix')) {
    document.head.appendChild(style);
  }

  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
}

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import WaiterDashboard from './src/screens/WaiterDashboard';
import CookDashboard from './src/screens/CookDashboard';
import CleanerDashboard from './src/screens/CleanerDashboard';
import AdminDashboard from './src/screens/AdminDashboard';
import colors from './src/theme/colors';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.splashLogo}>✨</Text>
        </View>
        <Text style={styles.splashTitle}>SPICY ZAIKA</Text>
        <Text style={styles.splashSubtitle}>Fine Dining Operations • POS & KDS Suite</Text>
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {user.role === 'Admin' && (
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            )}
            {user.role === 'Waiter' && (
              <Stack.Screen name="WaiterDashboard" component={WaiterDashboard} />
            )}
            {user.role === 'Cook' && (
              <Stack.Screen name="CookDashboard" component={CookDashboard} />
            )}
            {user.role === 'Cleaner' && (
              <Stack.Screen name="CleanerDashboard" component={CleanerDashboard} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  splashLogo: {
    fontSize: 36,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 3,
  },
  splashSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  spinner: {
    marginTop: 36,
  },
});

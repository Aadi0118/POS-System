/**
 * @file AuthContext.js
 * @description Authentication context providing state management for staff login,
 * role tracking, token storage, and session lifecycles.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { getSocket, disconnectSocket } from '../api/socket';
import {
  saveAuthToken,
  saveAuthUser,
  getAuthToken,
  getAuthUser,
  removeAuthToken,
  removeAuthUser,
} from '../utils/secureStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize session from SecureStore on startup
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await getAuthToken();
        const storedUser = await getAuthUser();

        if (storedToken && storedUser) {
          try {
            const res = await apiClient.get('/auth/me');
            if (res.data.success) {
              setToken(storedToken);
              setUser(res.data.user);
              getSocket().catch((e) => console.warn('[Socket warm-up warning]', e));
            }
          } catch (verifyErr) {
            console.warn('[Auth Bootstrap] Stored token expired. Purging.');
            await removeAuthToken();
            await removeAuthUser();
          }
        }
      } catch (e) {
        console.error('[Auth Bootstrap Error]', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();

    global.__onSessionExpired = () => {
      logout();
    };

    return () => {
      delete global.__onSessionExpired;
    };
  }, []);

  /**
   * Performs 4-digit PIN authentication.
   */
  const login = async (staffId, pin) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const response = await apiClient.post('/auth/login', {
        staffId,
        pin,
      });

      if (response.data.success) {
        const { token: receivedToken, user: receivedUser } = response.data;

        await saveAuthToken(receivedToken);
        await saveAuthUser(receivedUser);

        setToken(receivedToken);
        setUser(receivedUser);

        // Connect real-time socket asynchronously (non-blocking)
        getSocket().catch((err) => console.warn('[Socket connect error]', err));

        return { success: true };
      }
      return { success: false, error: 'Authentication failed.' };
    } catch (err) {
      console.warn('[Login Error]', err.response?.data || err.message);
      const message =
        err.response?.data?.error ||
        'Authentication failed. Please verify your PIN.';
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logs out staff member and purges credentials.
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      disconnectSocket();
      await removeAuthToken();
      await removeAuthUser();
      setUser(null);
      setToken(null);
      setAuthError(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        authError,
        login,
        logout,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

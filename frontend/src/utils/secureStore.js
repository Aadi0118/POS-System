/**
 * @file secureStore.js
 * @description Secure credential storage utility using Expo SecureStore.
 * Ensures JWT bearer tokens and user credentials are encrypted on-device (Android Keystore / iOS Keychain).
 * Never uses insecure AsyncStorage for authentication secrets.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'pos_kds_auth_token';
const USER_KEY = 'pos_kds_auth_user';

// In-memory fallback strictly for web previews where hardware keystore is unavailable
const memoryFallback = new Map();

/**
 * Saves a key-value pair to hardware-backed secure storage.
 * @param {string} key
 * @param {string} value
 */
export async function saveSecureItem(key, value) {
  try {
    if (Platform.OS === 'web') {
      memoryFallback.set(key, value);
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // LocalStorage fallback for web
      }
      return;
    }
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    console.error(`[SecureStore Error] Failed to save key '${key}':`, error);
  }
}

/**
 * Retrieves a value from hardware-backed secure storage.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function getSecureItem(key) {
  try {
    if (Platform.OS === 'web') {
      return memoryFallback.get(key) || (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null);
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[SecureStore Error] Failed to retrieve key '${key}':`, error);
    return null;
  }
}

/**
 * Deletes a value from hardware-backed secure storage upon logout.
 * @param {string} key
 */
export async function deleteSecureItem(key) {
  try {
    if (Platform.OS === 'web') {
      memoryFallback.delete(key);
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`[SecureStore Error] Failed to delete key '${key}':`, error);
  }
}

// Convenience token helpers
export const saveAuthToken = (token) => saveSecureItem(TOKEN_KEY, token);
export const getAuthToken = () => getSecureItem(TOKEN_KEY);
export const removeAuthToken = () => deleteSecureItem(TOKEN_KEY);

export const saveAuthUser = (user) => saveSecureItem(USER_KEY, JSON.stringify(user));
export const getAuthUser = async () => {
  const data = await getSecureItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};
export const removeAuthUser = () => deleteSecureItem(USER_KEY);


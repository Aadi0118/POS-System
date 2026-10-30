/**
 * @file serverConfig.js
 * @description Dynamic Server Host Resolution for Android, iOS, and Web.
 * Supports:
 * 1. Cloud Internet URLs (e.g., https://spicy-zaika-pos.onrender.com or https://xxxx.ngrok-free.app)
 * 2. Local Restaurant Wi-Fi Intranet IPs (e.g., 10.18.123.121 or 192.168.1.100:5000)
 * 3. Auto-detected LAN IP from Expo Metro Bundler connection.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSecureItem, saveSecureItem } from '../utils/secureStore';

const SERVER_HOST_KEY = 'pos_kds_server_host';
const DEFAULT_PORT = 5000;
const FALLBACK_LAN_IP = '10.70.249.121'; // Current host machine LAN IP

// In-memory cache of resolved host/URL
let activeHost = null;

/**
 * Normalizes any host or full URL into a complete base URL.
 * @param {string} input - e.g. "10.18.123.121", "https://pos.myrestaurant.com", "192.168.1.50:5000"
 * @returns {string} - e.g. "http://10.18.123.121:5000" or "https://pos.myrestaurant.com"
 */
export function normalizeServerBaseUrl(input) {
  if (!input || !input.trim()) {
    return `http://${FALLBACK_LAN_IP}:${DEFAULT_PORT}`;
  }

  const trimmed = input.trim().replace(/\/+$/, '');

  // 1. Full HTTPS / HTTP URL (Cloud deployments like Render, Railway, ngrok)
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }

  // 2. Host with explicit port specified (e.g. "192.168.1.50:5000")
  if (trimmed.includes(':')) {
    return `http://${trimmed}`;
  }

  // 3. Domain or IP without port (e.g. "10.18.123.121") -> defaults to port 5000
  return `http://${trimmed}:${DEFAULT_PORT}`;
}

/**
 * Auto-detects the host IP from Expo's Metro Bundler connection.
 * On physical Android devices running Expo Go, Constants.expoConfig?.hostUri
 * contains the computer's exact LAN IP (e.g. '10.18.123.121:8081').
 */
export function getAutoDetectedHost() {
  try {
    // 1. Expo SDK 52 expoConfig
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }

    // 2. Legacy manifest debuggerHost
    const debuggerHost = Constants.manifest2?.extra?.expoGo?.debuggerHost || Constants.manifest?.debuggerHost;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch (e) {
    console.warn('[ServerConfig] Auto-detect failed:', e);
  }

  // 3. Web environment
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  // 4. Android physical device fallback to LAN IP
  if (Platform.OS === 'android') {
    return FALLBACK_LAN_IP;
  }

  return 'localhost';
}

/**
 * Initializes and resolves the active server host/URL.
 */
export async function getResolvedHost() {
  if (activeHost) return activeHost;

  try {
    const saved = await getSecureItem(SERVER_HOST_KEY);
    if (saved && saved.trim()) {
      activeHost = saved.trim();
      return activeHost;
    }
  } catch (e) {
    // Fall through
  }

  activeHost = getAutoDetectedHost();
  return activeHost;
}

/**
 * Gets the synchronous API base URL (uses cached host or auto-detected).
 * e.g., "http://10.18.123.121:5000/api" or "https://pos.onrender.com/api"
 */
export function getBaseApiUrl() {
  const host = activeHost || getAutoDetectedHost();
  const base = normalizeServerBaseUrl(host);
  return `${base}/api`;
}

/**
 * Gets the synchronous Socket.io URL (uses cached host or auto-detected).
 * e.g., "http://10.18.123.121:5000" or "https://pos.onrender.com"
 */
export function getBaseSocketUrl() {
  const host = activeHost || getAutoDetectedHost();
  return normalizeServerBaseUrl(host);
}

/**
 * Overrides and saves a custom server host or Cloud URL.
 * Accepts:
 * - Local IP: "10.18.123.121"
 * - Local IP with Port: "10.18.123.121:5000"
 * - Internet Cloud URL: "https://my-pos-backend.onrender.com"
 * - Tunnel URL: "https://xxxx.ngrok-free.app"
 */
export async function setCustomServerHost(newHost) {
  const cleaned = (newHost || '').trim();
  activeHost = cleaned || getAutoDetectedHost();
  await saveSecureItem(SERVER_HOST_KEY, activeHost);
  return activeHost;
}

/**
 * Resets server host back to auto-detection.
 */
export async function resetServerHost() {
  activeHost = getAutoDetectedHost();
  await saveSecureItem(SERVER_HOST_KEY, '');
  return activeHost;
}

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
export const PERMANENT_CLOUD_URL = 'https://pos-system-1-efvl.onrender.com';
const FALLBACK_LAN_IP = PERMANENT_CLOUD_URL;

// In-memory cache of resolved host/URL
let activeHost = PERMANENT_CLOUD_URL;

/**
 * Normalizes any host or full URL into a complete base URL.
 * @param {string} input - e.g. "10.18.123.121", "https://pos.myrestaurant.com", "192.168.1.50:5000"
 * @returns {string} - e.g. "http://10.18.123.121:5000" or "https://pos.myrestaurant.com"
 */
export function normalizeServerBaseUrl(input) {
  if (!input || !input.trim()) {
    return PERMANENT_CLOUD_URL;
  }

  const trimmed = input.trim().replace(/\/+$/, '');

  // 1. Full HTTPS / HTTP URL (Cloud deployments like Render, Railway, ngrok)
  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Automatically upgrade any old local LAN IP (e.g. 10.x, 192.168.x) to permanent cloud backend
  return PERMANENT_CLOUD_URL;
}

/**
 * Auto-detects the host IP from Expo's Metro Bundler connection.
 * Default is permanent 24/7 cloud backend.
 */
export function getAutoDetectedHost() {
  return PERMANENT_CLOUD_URL;
}

/**
 * Initializes and resolves the active server host/URL.
 */
export async function getResolvedHost() {
  if (activeHost && activeHost === PERMANENT_CLOUD_URL) return activeHost;

  try {
    const saved = await getSecureItem(SERVER_HOST_KEY);
    // Only accept saved host if it is an explicit HTTPS cloud address
    if (saved && saved.trim() && saved.trim().startsWith('https://')) {
      activeHost = saved.trim();
      return activeHost;
    }
  } catch (e) {
    // Fall through
  }

  activeHost = PERMANENT_CLOUD_URL;
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

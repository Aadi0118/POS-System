/**
 * @file client.js
 * @description Hardened Axios HTTP client.
 * Injects JWT Bearer tokens from SecureStore and intercepts 401 session expirations.
 * Dynamically resolves host for Cloud URLs, LAN Wi-Fi IPs, Android devices, and Web.
 */

import axios from 'axios';
import { getAuthToken, removeAuthToken, removeAuthUser } from '../utils/secureStore';
import { getBaseApiUrl, getResolvedHost, normalizeServerBaseUrl } from '../config/serverConfig';

const apiClient = axios.create({
  baseURL: getBaseApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Ensure baseURL is fresh and attach JWT Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    // Dynamic baseURL refresh for Android devices & Cloud URLs
    const currentHost = await getResolvedHost();
    if (currentHost) {
      config.baseURL = `${normalizeServerBaseUrl(currentHost)}/api`;
    }

    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Capture session expirations and 401 Unauthorizations
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Client] Session expired or unauthorized.');
      await removeAuthToken();
      await removeAuthUser();
      if (global.__onSessionExpired) {
        global.__onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

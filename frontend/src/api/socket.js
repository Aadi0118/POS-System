/**
 * @file socket.js
 * @description Real-time Socket.io client wrapper with JWT token authentication.
 * Dynamically resolves connection endpoint for Android physical devices, tablets, and Web.
 * Supports public Cloud URLs (wss://), local Wi-Fi IPs, and dev environments.
 */

import { io } from 'socket.io-client';
import { getAuthToken } from '../utils/secureStore';
import { getResolvedHost, getBaseSocketUrl, normalizeServerBaseUrl } from '../config/serverConfig';

let socketInstance = null;
let currentSocketHost = null;

/**
 * Initializes or retrieves an authenticated Socket.io connection.
 * @returns {Promise<import('socket.io-client').Socket>}
 */
export async function getSocket() {
  const host = await getResolvedHost();
  const socketUrl = host ? normalizeServerBaseUrl(host) : getBaseSocketUrl();

  // If host changed, disconnect existing socket
  if (socketInstance && currentSocketHost !== socketUrl) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const token = await getAuthToken();
  currentSocketHost = socketUrl;

  socketInstance = io(socketUrl, {
    auth: {
      token,
    },
    transports: ['polling', 'websocket'], // Robust fallback for mobile/cellular networks
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    timeout: 8000,
  });

  socketInstance.on('connect', () => {
    console.log(`[Socket.io Client] Connected to ${socketUrl} with ID: ${socketInstance.id}`);
  });

  socketInstance.on('connect_error', (err) => {
    console.warn(`[Socket.io Client Warning] Connection issue to ${socketUrl}: ${err.message}`);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log(`[Socket.io Client] Disconnected from ${socketUrl}: ${reason}`);
  });

  return socketInstance;
}

/**
 * Disconnects and destroys the active socket instance.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentSocketHost = null;
  }
}

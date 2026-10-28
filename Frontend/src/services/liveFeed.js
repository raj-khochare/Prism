/**
 * Live push from the Spring STOMP broker (/topic/alerts, /topic/runtime).
 * Uses the raw WebSocket transport (`/ws/websocket`) that Spring exposes next to SockJS, so
 * no sockjs-client dependency is needed.
 */
import { Client } from '@stomp/stompjs';
import { API_BASE } from './apiClient.js';

let client = null;
const handlers = new Map(); // topic -> Set<callback>
const subscriptions = new Map();

function wsUrl() {
  return `${API_BASE.replace(/^http/, 'ws')}/ws/websocket`;
}

function ensureClient() {
  if (client) return client;
  client = new Client({
    brokerURL: wsUrl(),
    reconnectDelay: 4000,
    onConnect: () => {
      handlers.forEach((_, topic) => attach(topic));
    },
  });
  client.activate();
  return client;
}

function attach(topic) {
  if (!client || !client.connected || subscriptions.has(topic)) return;
  const sub = client.subscribe(topic, (msg) => {
    let payload = null;
    try {
      payload = JSON.parse(msg.body);
    } catch {
      return;
    }
    handlers.get(topic)?.forEach((cb) => cb(payload));
  });
  subscriptions.set(topic, sub);
}

/** Returns an unsubscribe function. */
export function subscribeTopic(topic, callback) {
  if (!handlers.has(topic)) handlers.set(topic, new Set());
  handlers.get(topic).add(callback);
  ensureClient();
  attach(topic);
  return () => {
    handlers.get(topic)?.delete(callback);
  };
}

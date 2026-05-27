import { NotificationEvent } from '../../../backend/shared/contracts';
import { getAuthSession } from '../../utils/api';
import {
  buildNotificationsWebSocketUrl,
  logApiConfigWarningOnce,
} from '@/src/config/api';

let socket: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let messageHandler: ((event: NotificationEvent) => void) | null = null;
let shouldReconnect = true;

const getWebSocketUrl = (): string | null => {
  const accessToken = getAuthSession()?.accessToken;

  if (!accessToken) {
    return null;
  }

  const url = buildNotificationsWebSocketUrl(accessToken);

  if (!url) {
    logApiConfigWarningOnce();
  }

  return url;
};

export const connectWebSocket = (onMessage: (event: NotificationEvent) => void): void => {
  messageHandler = onMessage;
  shouldReconnect = true;

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const webSocketUrl = getWebSocketUrl();

  if (!webSocketUrl) {
    return;
  }

  socket = new WebSocket(webSocketUrl);

  socket.onopen = () => {
    console.log('WebSocket connected');
  };

  socket.onmessage = (event) => {
    try {
      if (typeof event.data !== 'string') {
        return;
      }

      const data = JSON.parse(event.data) as NotificationEvent;
      messageHandler?.(data);
    } catch (err) {
      console.error('WS parse error', err);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket disconnected');
    socket = null;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    if (!shouldReconnect) {
      return;
    }

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;

      if (messageHandler) {
        connectWebSocket(messageHandler);
      }
    }, 3000);
  };

  socket.onerror = (err) => {
    console.error('WebSocket error', err);
  };
};

export const disconnectWebSocket = (): void => {
  shouldReconnect = false;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (socket) {
    socket.close();
    socket = null;
  }
};

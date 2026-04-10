import { NotificationEvent } from '../../../shared/contracts';
import { getAuthSession } from '../../utils/api';
import { API_BASE_URL } from '@/src/config/api';

let socket: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let messageHandler: ((event: NotificationEvent) => void) | null = null;

const getWebSocketUrl = (): string | null => {
  if (!API_BASE_URL) {
    return null;
  }

  const userId = getAuthSession()?.user.id;

  if (!userId) {
    return null;
  }

  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/notifications/ws';
  url.searchParams.set('userId', userId);

  return url.toString();
};

export const connectWebSocket = (onMessage: (event: NotificationEvent) => void): void => {
  messageHandler = onMessage;

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

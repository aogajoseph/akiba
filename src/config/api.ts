const trimEnv = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeHttpUrl = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    url.pathname = url.pathname.replace(/\/+$/, '');
    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

const normalizeSocketUrl = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:' &&
      url.protocol !== 'ws:' &&
      url.protocol !== 'wss:'
    ) {
      return null;
    }

    if (url.protocol === 'ws:') {
      url.protocol = 'http:';
    } else if (url.protocol === 'wss:') {
      url.protocol = 'https:';
    }

    url.pathname = url.pathname.replace(/\/+$/, '');
    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

const deriveSocketUrlFromApi = (apiUrl: string | null): string | null => {
  if (!apiUrl) {
    return null;
  }

  return normalizeSocketUrl(apiUrl);
};

const rawApiUrl = trimEnv(process.env.EXPO_PUBLIC_API_URL);
const rawSocketUrl = trimEnv(process.env.EXPO_PUBLIC_WS_URL);

export const API_BASE_URL = normalizeHttpUrl(rawApiUrl);
export const SOCKET_IO_URL =
  normalizeSocketUrl(rawSocketUrl) ?? deriveSocketUrlFromApi(API_BASE_URL);

export const API_CONFIG_ERROR =
  API_BASE_URL
    ? null
    : 'Missing or invalid EXPO_PUBLIC_API_URL. Set it to your backend base URL, for example https://akiba-backend.onrender.com';

export const WS_CONFIG_ERROR =
  SOCKET_IO_URL
    ? null
    : 'Missing or invalid EXPO_PUBLIC_WS_URL. Set it to your websocket base URL, or omit it to derive from EXPO_PUBLIC_API_URL.';

let hasLoggedConfigWarning = false;

export const logApiConfigWarningOnce = (): void => {
  if (hasLoggedConfigWarning) {
    return;
  }

  const warnings = [API_CONFIG_ERROR, WS_CONFIG_ERROR].filter(
    (value): value is string => Boolean(value),
  );

  if (warnings.length === 0) {
    return;
  }

  hasLoggedConfigWarning = true;
  console.warn('[config.api]', warnings.join(' '));
};

export const buildApiUrl = (path: string): string | null => {
  if (!API_BASE_URL) {
    logApiConfigWarningOnce();
    return null;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const buildNotificationsWebSocketUrl = (accessToken: string): string | null => {
  if (!SOCKET_IO_URL) {
    logApiConfigWarningOnce();
    return null;
  }

  const url = new URL(SOCKET_IO_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/notifications/ws';
  url.search = '';
  url.hash = '';
  url.searchParams.set('token', accessToken);

  return url.toString();
};

import axios from 'axios';

import { API_BASE_URL, API_CONFIG_ERROR, logApiConfigWarningOnce } from '@/src/config/api';
import { type AuthSession, useAuthStore } from '@/src/store/authStore';

export type ApiError = {
  error: string;
  status?: number;
};

const shouldLogApiTraffic = process.env.EXPO_PUBLIC_DEBUG_API_LOGS === 'true';

const logApiTraffic = (stage: string, details: Record<string, unknown>): void => {
  if (!shouldLogApiTraffic) {
    return;
  }

  console.log(
    JSON.stringify({
      event: `api.${stage}`,
      ...details,
    }),
  );
};

const isApiErrorLike = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error?: unknown }).error === 'string'
  );
};

export const getAuthSession = (): AuthSession | null => {
  return useAuthStore.getState().session;
};

export const setAuthSession = async (session: AuthSession): Promise<void> => {
  await useAuthStore.getState().setSession(session);
};

export const setAuthSessionUser = (user: AuthSession['user']): void => {
  useAuthStore.getState().setUser(user);
};

export const clearAuthSession = async (): Promise<void> => {
  await useAuthStore.getState().clearSession();
};

export const api = axios.create({
  ...(API_BASE_URL ? { baseURL: API_BASE_URL } : {}),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    logApiConfigWarningOnce();

    return Promise.reject({
      error: API_CONFIG_ERROR ?? 'API URL is not configured.',
      status: 500,
    } satisfies ApiError);
  }

  logApiTraffic('request', {
    baseURL: config.baseURL ?? API_BASE_URL,
    data: config.data,
    method: config.method,
    params: config.params,
    url: config.url,
  });

  const session = getAuthSession();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isApiErrorLike(error)) {
      logApiTraffic('error', {
        error: error.error,
        status: error.status,
      });

      return Promise.reject(error);
    }

    const status =
      typeof error.response?.status === 'number' ? error.response.status : undefined;

    logApiTraffic('response', {
      data: error.response?.data,
      message: error.message,
      method: error.config?.method,
      status,
      url: error.config?.url,
    });

    if (status === 401) {
      void clearAuthSession();
    }

    const message =
      error.response?.data?.error ??
      error.message ??
      'Something went wrong. Please try again.';

    return Promise.reject({ error: message, status } satisfies ApiError);
  },
);

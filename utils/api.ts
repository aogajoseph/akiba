import axios from 'axios';

import { API_BASE_URL, API_CONFIG_ERROR, logApiConfigWarningOnce } from '@/src/config/api';
import { type AuthSession, useAuthStore } from '@/src/store/authStore';

export type ApiError = {
  error: string;
  status?: number;
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

  const session = getAuthSession();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status =
      typeof error.response?.status === 'number' ? error.response.status : undefined;

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

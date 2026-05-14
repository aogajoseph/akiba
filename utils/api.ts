import axios from 'axios';

import { API_BASE_URL } from '@/src/config/api';
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

export const clearAuthSession = async (): Promise<void> => {
  await useAuthStore.getState().clearSession();
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
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

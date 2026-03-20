import axios from 'axios';

import { User } from '../../shared/contracts';

export type ApiError = {
  error: string;
};

export type AuthSession = {
  user: User;
  token: string;
};

let authSession: AuthSession | null = null;

export const setAuthSession = (session: AuthSession): void => {
  authSession = session;
};

export const getAuthSession = (): AuthSession | null => {
  return authSession;
};

export const clearAuthSession = (): void => {
  authSession = null;
};

export const api = axios.create({
  baseURL: 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const session = getAuthSession();

  if (session?.user.id) {
    config.headers['x-user-id'] = session.user.id;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.message ??
      'Something went wrong. Please try again.';

    return Promise.reject({ error: message } satisfies ApiError);
  },
);

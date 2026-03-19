import axios from 'axios';

import { User } from '../../shared/contracts';

export type ApiError = {
  error: string;
};

type AuthSession = {
  token: string | null;
  user: User | null;
};

let authSession: AuthSession = {
  token: null,
  user: null,
};

export const setAuthSession = (user: User, token: string): void => {
  authSession = {
    user,
    token,
  };
};

export const clearAuthSession = (): void => {
  authSession = {
    user: null,
    token: null,
  };
};

export const getAuthSession = (): AuthSession => {
  return authSession;
};

export const api = axios.create({
  baseURL: 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const session = getAuthSession();

  if (session.user?.id) {
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

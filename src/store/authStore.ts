import axios from 'axios';
import { create } from 'zustand';

import { MeResponseDto, User } from '../../../backend/shared/contracts';
import { buildApiUrl, logApiConfigWarningOnce } from '@/src/config/api';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/src/services/authStorage';

export type AuthSession = {
  accessToken: string;
  user: User;
};

export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated';

type AuthState = {
  session: AuthSession | null;
  status: AuthStatus;
  clearSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setSession: (session: AuthSession) => Promise<void>;
  setUser: (user: User) => void;
};

let restorePromise: Promise<void> | null = null;

const fetchAuthenticatedUser = async (accessToken: string): Promise<User> => {
  const meUrl = buildApiUrl('/auth/me');

  if (!meUrl) {
    logApiConfigWarningOnce();
    throw new Error('API URL is not configured');
  }

  const response = await axios.get<{ data: MeResponseDto }>(meUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.data.user;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  status: 'restoring',

  setSession: async (session) => {
    await setAccessToken(session.accessToken);
    set({
      session,
      status: 'authenticated',
    });
  },

  clearSession: async () => {
    await clearAccessToken();
    set({
      session: null,
      status: 'unauthenticated',
    });
  },

  restoreSession: async () => {
    if (restorePromise) {
      return restorePromise;
    }

    restorePromise = (async () => {
      set({ status: 'restoring' });

      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          set({
            session: null,
            status: 'unauthenticated',
          });
          return;
        }

        const user = await fetchAuthenticatedUser(accessToken);

        set({
          session: {
            accessToken,
            user,
          },
          status: 'authenticated',
        });
      } catch {
        await clearAccessToken();
        set({
          session: null,
          status: 'unauthenticated',
        });
      } finally {
        restorePromise = null;
      }
    })();

    return restorePromise;
  },

  setUser: (user) => {
    set((state) => {
      if (!state.session) {
        return state;
      }

      return {
        session: {
          ...state.session,
          user,
        },
      };
    });
  },
}));

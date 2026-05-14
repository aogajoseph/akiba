import { Platform } from 'react-native';
import {
  deleteItemAsync as deleteSecureItemAsync,
  getItemAsync as getSecureItemAsync,
  setItemAsync as setSecureItemAsync,
} from 'expo-secure-store';

import { SECURE_STORE_KEYS } from '@/src/constants/secureStore';

const WEB_ACCESS_TOKEN_STORAGE_KEY = 'akiba.auth.token';

const getWebStorage = (): Storage | null => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  return window.localStorage;
};

export const getAccessToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    return storage?.getItem(WEB_ACCESS_TOKEN_STORAGE_KEY) ?? null;
  }

  return getSecureItemAsync(SECURE_STORE_KEYS.authToken);
};

export const setAccessToken = async (token: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    storage?.setItem(WEB_ACCESS_TOKEN_STORAGE_KEY, token);
    return;
  }

  await setSecureItemAsync(SECURE_STORE_KEYS.authToken, token);
};

export const clearAccessToken = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    storage?.removeItem(WEB_ACCESS_TOKEN_STORAGE_KEY);
    return;
  }

  await deleteSecureItemAsync(SECURE_STORE_KEYS.authToken);
};

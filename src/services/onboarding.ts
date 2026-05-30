import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STORAGE_KEY = 'hasSeenOnboarding';

export const getHasSeenOnboarding = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
  return value === 'true';
};

export const setHasSeenOnboarding = async (): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
};

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { api, getAuthSession } from '../../utils/api';

let lastRegisteredDeviceKey: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const getExpoProjectId = (): string | undefined => {
  const easProjectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

  return typeof easProjectId === 'string' && easProjectId.trim() ? easProjectId : undefined;
};

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Device.osName === 'Android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId = getExpoProjectId();
  const tokenData = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenData.data;
};

export const syncPushTokenWithBackend = async (token: string): Promise<void> => {
  const userId = getAuthSession()?.user.id;

  if (!userId || !token) {
    return;
  }

  const deviceKey = `${userId}:${token}`;

  if (lastRegisteredDeviceKey === deviceKey) {
    return;
  }

  await api.post('/devices/register', {
    token,
  });

  lastRegisteredDeviceKey = deviceKey;
};

export const registerPushNotificationsForCurrentUser = async (): Promise<void> => {
  try {
    if (!getAuthSession()?.user.id) {
      return;
    }

    const token = await registerForPushNotifications();

    if (!token) {
      return;
    }

    await syncPushTokenWithBackend(token);
  } catch (error) {
    console.error('Failed to register push notifications', error);
  }
};

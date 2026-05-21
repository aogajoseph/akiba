import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'akiba.notification.settings';

export type NotificationSettings = {
  activityUpdates: boolean;
  allowImportantAlerts: boolean;
  approvalRequests: boolean;
  appBadgeCount: boolean;
  chatMessages: boolean;
  notificationSounds: boolean;
  pushNotifications: boolean;
  transactionAlerts: boolean;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  pushNotifications: true,
  activityUpdates: true,
  transactionAlerts: true,
  approvalRequests: true,
  chatMessages: true,
  allowImportantAlerts: true,
  appBadgeCount: true,
  notificationSounds: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getDefaultNotificationSettings = (): NotificationSettings => DEFAULT_SETTINGS;

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const storedValue = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);

  if (!storedValue) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown;

    if (!isRecord(parsed)) {
      return DEFAULT_SETTINGS;
    }

    return {
      pushNotifications:
        typeof parsed.pushNotifications === 'boolean'
          ? parsed.pushNotifications
          : DEFAULT_SETTINGS.pushNotifications,
      activityUpdates:
        typeof parsed.activityUpdates === 'boolean'
          ? parsed.activityUpdates
          : DEFAULT_SETTINGS.activityUpdates,
      transactionAlerts:
        typeof parsed.transactionAlerts === 'boolean'
          ? parsed.transactionAlerts
          : DEFAULT_SETTINGS.transactionAlerts,
      approvalRequests:
        typeof parsed.approvalRequests === 'boolean'
          ? parsed.approvalRequests
          : DEFAULT_SETTINGS.approvalRequests,
      chatMessages:
        typeof parsed.chatMessages === 'boolean'
          ? parsed.chatMessages
          : DEFAULT_SETTINGS.chatMessages,
      allowImportantAlerts:
        typeof parsed.allowImportantAlerts === 'boolean'
          ? parsed.allowImportantAlerts
          : DEFAULT_SETTINGS.allowImportantAlerts,
      appBadgeCount:
        typeof parsed.appBadgeCount === 'boolean'
          ? parsed.appBadgeCount
          : DEFAULT_SETTINGS.appBadgeCount,
      notificationSounds:
        typeof parsed.notificationSounds === 'boolean'
          ? parsed.notificationSounds
          : DEFAULT_SETTINGS.notificationSounds,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveNotificationSettings = async (
  settings: NotificationSettings,
): Promise<void> => {
  await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
};

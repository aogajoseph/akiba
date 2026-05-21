import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileSection from '@/src/components/profile/ProfileSection';
import SettingsSwitchRow from '@/src/components/settings/SettingsSwitchRow';
import {
  getDefaultNotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from '@/src/services/notificationSettings';
import {
  getSpaceNotificationPreference,
  listSpaces,
  updateSpaceNotificationPreference,
} from '@/services/spaceService';
import { useNotificationsStore } from '@/src/store/notificationsStore';
import { ApiError } from '@/utils/api';

export default function NotificationSettingsScreen() {
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const [settings, setSettings] = useState<NotificationSettings>(getDefaultNotificationSettings());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingMuted, setSavingMuted] = useState(false);
  const [allSpacesMuted, setAllSpacesMuted] = useState(false);
  const [spaceCount, setSpaceCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [localSettings, spacesResponse] = await Promise.all([
        getNotificationSettings(),
        listSpaces(),
      ]);

      const spaces = spacesResponse.spaces ?? spacesResponse.groups ?? [];
      const preferences = await Promise.all(
        spaces.map(async (space) => {
          const response = await getSpaceNotificationPreference(space.id);
          return response.muted;
        }),
      );

      setSettings(localSettings);
      setSpaceCount(spaces.length);
      setAllSpacesMuted(spaces.length > 0 && preferences.every(Boolean));
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load notification settings.');
    } finally {
      if (mode === 'refresh') {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadSettings('initial');
  }, []);

  const updateLocalSetting = async <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    const nextSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(nextSettings);
    await saveNotificationSettings(nextSettings);
  };

  const handleMuteAllSpaces = async (nextValue: boolean) => {
    if (savingMuted) {
      return;
    }

    setSavingMuted(true);
    setError(null);

    try {
      const spacesResponse = await listSpaces();
      const spaces = spacesResponse.spaces ?? spacesResponse.groups ?? [];

      await Promise.all(
        spaces.map((space) => updateSpaceNotificationPreference(space.id, nextValue)),
      );

      setSpaceCount(spaces.length);
      setAllSpacesMuted(nextValue);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to update space notification settings.');
    } finally {
      setSavingMuted(false);
    }
  };

  const unreadSummary = useMemo(() => {
    if (unreadCount === 0) {
      return 'You are fully caught up right now.';
    }

    return `${unreadCount} unread ${unreadCount === 1 ? 'update' : 'updates'} are currently waiting for you.`;
  }, [unreadCount]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={['#0f766e']}
            onRefresh={() => {
              void loadSettings('refresh');
            }}
            refreshing={refreshing}
            tintColor="#0f766e"
          />
        }>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Choose how Akiba keeps you informed. Space muting is saved to your account. Other
            preferences below are stored on this device for now.
          </Text>
          <Text style={styles.heroMeta}>{unreadSummary}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#0f766e" />
            <Text style={styles.loadingText}>Loading notification preferences</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <ProfileSection title="General">
          <SettingsSwitchRow
            description="Allow Akiba to keep sending push alerts to this device."
            helper="Stored on this device"
            onValueChange={(value) => {
              void updateLocalSetting('pushNotifications', value);
            }}
            title="Push Notifications"
            value={settings.pushNotifications}
          />
          <View style={styles.divider} />
          <SettingsSwitchRow
            description="Receive updates about joins, changes, and other space activity."
            helper="Stored on this device"
            onValueChange={(value) => {
              void updateLocalSetting('activityUpdates', value);
            }}
            title="Activity Updates"
            value={settings.activityUpdates}
          />
          <View style={styles.divider} />
          <SettingsSwitchRow
            description="Be notified when deposits or withdrawals need your attention."
            helper="Stored on this device"
            onValueChange={(value) => {
              void updateLocalSetting('transactionAlerts', value);
            }}
            title="Transaction Alerts"
            value={settings.transactionAlerts}
          />
          <View style={styles.divider} />
          <SettingsSwitchRow
            description="Get alerts when approvals are waiting for action."
            helper="Stored on this device"
            onValueChange={(value) => {
              void updateLocalSetting('approvalRequests', value);
            }}
            title="Approval Requests"
            value={settings.approvalRequests}
          />
          <View style={styles.divider} />
          <SettingsSwitchRow
            description="Receive alerts for new messages in your spaces."
            helper="Stored on this device"
            onValueChange={(value) => {
              void updateLocalSetting('chatMessages', value);
            }}
            title="Chat Messages"
            value={settings.chatMessages}
          />
        </ProfileSection>

        <ProfileSection title="Spaces">
          <SettingsSwitchRow
            description="Mute notification delivery for every space you currently belong to."
            disabled={spaceCount === 0 || savingMuted}
            helper={
              spaceCount === 0
                ? 'You have no spaces yet'
                : `Applies across ${spaceCount} ${spaceCount === 1 ? 'space' : 'spaces'}`
            }
            onValueChange={(value) => {
              void handleMuteAllSpaces(value);
            }}
            title="Mute All Space Notifications"
            value={allSpacesMuted}
          />
          <View style={styles.divider} />
          <SettingsSwitchRow
            description="Keep important alerts and mentions visible even when you reduce noise."
            helper="Stored on this device"
            onValueChange={(value) => {
              void updateLocalSetting('allowImportantAlerts', value);
            }}
            title="Allow Mentions & Important Alerts"
            value={settings.allowImportantAlerts}
          />
        </ProfileSection>

        <ProfileSection title="Sounds & Badges">
          <SettingsSwitchRow
            description="Show unread counts on supported app icons."
            helper="Stored on this device"
            onValueChange={(value) => {
              void updateLocalSetting('appBadgeCount', value);
            }}
            title="App Badge Count"
            value={settings.appBadgeCount}
          />
          <View style={styles.divider} />
          <SettingsSwitchRow
            description="Play a sound when new notification banners arrive."
            helper="Stored on this device"
            onValueChange={(value) => {
              void updateLocalSetting('notificationSounds', value);
            }}
            title="Notification Sounds"
            value={settings.notificationSounds}
          />
        </ProfileSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#132238',
    borderRadius: 24,
    gap: 10,
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#d7e3f1',
    fontSize: 14,
    lineHeight: 21,
  },
  heroMeta: {
    color: '#99f6e4',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  loadingText: {
    color: '#526172',
    fontSize: 14,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    backgroundColor: '#eef2f6',
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});

import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User } from '@shared/contracts';
import AppHeader from '@/components/AppHeader';
import ProfileRow from '@/src/components/profile/ProfileRow';
import ProfileSection from '@/src/components/profile/ProfileSection';
import { logout, me } from '@/services/authService';
import { useAuthStore } from '@/src/store/authStore';
import { ApiError } from '@/utils/api';

const formatJoinedDate = (value?: string): string => {
  if (!value) {
    return 'Member since recently';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Member since recently';
  }

  return `Joined ${date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
};

export default function ProfileScreen() {
  const sessionUser = useAuthStore((state) => state.session?.user ?? null);
  const [user, setUser] = useState<User | null>(sessionUser);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(sessionUser === null);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayUser = user ?? sessionUser;
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const joinedLabel = formatJoinedDate(displayUser?.createdAt);
  const initials = useMemo(() => {
    return (displayUser?.name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }, [displayUser?.name]);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await me();
      setUser(response.user);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load your profile.');
    } finally {
      if (mode === 'refresh') {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile(user ? 'refresh' : 'initial');
    }, [loadProfile, user]),
  );

  const handlePlaceholderPress = (title: string) => {
    Alert.alert(title, 'This section will be expanded in a later update.');
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();
      router.replace('/(auth)/login');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <AppHeader />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={['#0f766e']}
            onRefresh={() => {
              void loadProfile('refresh');
            }}
            refreshing={refreshing}
            tintColor="#0f766e"
          />
        }>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            {initials ? (
              <Text style={styles.avatarText}>{initials}</Text>
            ) : (
              <Ionicons color="#0f766e" name="person-outline" size={28} />
            )}
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{displayUser?.name ?? 'Your account'}</Text>
            <Text style={styles.heroSubtitle}>
              {displayUser?.phoneNumber ?? 'Phone number unavailable'}
            </Text>
            <View style={styles.badge}>
              <Ionicons color="#0f766e" name="shield-checkmark-outline" size={14} />
              <Text style={styles.badgeText}>Secure session active</Text>
            </View>
            <Text style={styles.joinedText}>{joinedLabel}</Text>
          </View>
        </View>

        {loading && !displayUser ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#0f766e" />
            <Text style={styles.loadingText}>Loading your account</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <ProfileSection title="Account">
          <ProfileRow
            icon="create-outline"
            onPress={() => router.push('/profile/edit')}
            subtitle="Update the name shown across your spaces"
            title="Edit Profile"
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="call-outline"
            subtitle={displayUser?.phoneNumber ?? 'Not available'}
            title="Phone Number"
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="mail-outline"
            subtitle="Email support will be added later"
            title="Email"
            trailing={<Text style={styles.placeholderValue}>Not added</Text>}
          />
          <View style={styles.divider} />
          <ProfileRow
            destructive
            icon="log-out-outline"
            onPress={() => {
              void handleLogout();
            }}
            subtitle={loggingOut ? 'Signing you out' : 'End this session on this device'}
            title={loggingOut ? 'Logging Out...' : 'Logout'}
          />
        </ProfileSection>

        <ProfileSection title="Preferences">
          <ProfileRow
            icon="notifications-outline"
            onPress={() => handlePlaceholderPress('Notifications')}
            subtitle="Manage alerts and message updates"
            title="Notifications"
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="color-palette-outline"
            onPress={() => handlePlaceholderPress('Appearance')}
            subtitle="Theme options will appear here"
            title="Appearance"
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="language-outline"
            onPress={() => handlePlaceholderPress('Language')}
            subtitle="Language preferences are planned"
            title="Language"
          />
        </ProfileSection>

        <ProfileSection title="Support & About">
          <ProfileRow
            icon="information-circle-outline"
            subtitle={`Version ${appVersion}`}
            title="App Version"
            trailing={<Text style={styles.placeholderValue}>{appVersion}</Text>}
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="help-buoy-outline"
            onPress={() => handlePlaceholderPress('Help & Support')}
            subtitle="Get help with your account and spaces"
            title="Help & Support"
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="document-text-outline"
            onPress={() => handlePlaceholderPress('Privacy Policy')}
            subtitle="Review how Akiba handles your data"
            title="Privacy Policy"
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="receipt-outline"
            onPress={() => handlePlaceholderPress('Terms')}
            subtitle="Review the current product terms"
            title="Terms"
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
  header: {
    elevation: 10,
    zIndex: 1000,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#132238',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 16,
    padding: 20,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#edf7f5',
    borderRadius: 24,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: '#0f766e',
    fontSize: 24,
    fontWeight: '800',
  },
  heroBody: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#d9e3ef',
    fontSize: 15,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#eaf8f5',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  joinedText: {
    color: '#c4d3e3',
    fontSize: 13,
    marginTop: 4,
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
    marginLeft: 66,
  },
  placeholderValue: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});

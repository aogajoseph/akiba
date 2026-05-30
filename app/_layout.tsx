import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import LaunchSplash from '@/src/components/launch/LaunchSplash';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerPushNotificationsForCurrentUser } from '@/src/services/pushNotifications';
import { useAuthStore } from '@/src/store/authStore';
import { connectWebSocket, disconnectWebSocket } from '@/src/services/websocket';
import { useNotificationsStore } from '@/src/store/notificationsStore';
import { useOnboardingStore } from '@/src/store/onboardingStore';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const authStatus = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const hasSeenOnboarding = useOnboardingStore((state) => state.hasSeenOnboarding);
  const hydrateOnboarding = useOnboardingStore((state) => state.hydrate);
  const bootReady = authStatus !== 'restoring' && hasSeenOnboarding !== null;

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    void hydrateOnboarding();
  }, [hydrateOnboarding]);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      disconnectWebSocket();
      return;
    }

    const addNotification = useNotificationsStore.getState().addNotification;

    connectWebSocket((event) => {
      if (event.type === 'notification_created') {
        addNotification(event.payload);
      }
    });
    void registerPushNotificationsForCurrentUser();

    return () => {
      disconnectWebSocket();
    };
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== 'unauthenticated') {
      return;
    }

    if (segments[0] === '(drawer)') {
      router.replace('/(auth)/login');
    }
  }, [authStatus, segments]);

  useEffect(() => {
    if (!bootReady) {
      return;
    }

    void SplashScreen.hideAsync().catch(() => undefined);
  }, [bootReady]);

  useEffect(() => {
    if (!bootReady || hasSeenOnboarding !== false) {
      return;
    }

    if (segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [bootReady, hasSeenOnboarding, segments]);

  useEffect(() => {
    if (!bootReady || hasSeenOnboarding !== true) {
      return;
    }

    if (segments[0] === 'onboarding') {
      router.replace(authStatus === 'authenticated' ? '/home' : '/(auth)/login');
    }
  }, [authStatus, bootReady, hasSeenOnboarding, segments]);

  useEffect(() => {
    if (!bootReady || authStatus !== 'authenticated') {
      return;
    }

    if (segments[0] === '(auth)') {
      router.replace('/home');
    }
  }, [authStatus, bootReady, segments]);

  if (!bootReady) {
    return <LaunchSplash dark={colorScheme === 'dark'} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

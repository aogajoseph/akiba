import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import LaunchSplash from '@/src/components/launch/LaunchSplash';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerPushNotificationsForCurrentUser } from '@/src/services/pushNotifications';
import { useAuthStore } from '@/src/store/authStore';
import { connectWebSocket, disconnectWebSocket } from '@/src/services/websocket';
import { useNotificationsStore } from '@/src/store/notificationsStore';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import {
  captureInviteFromUrl,
  getPendingInviteState,
  getPendingInviteRoute,
  hydratePendingInviteCache,
  type PendingInvite,
} from '@/src/services/pendingInvite';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const currentSegment = segments[segments.length - 1];
  const isAuthRoute =
    currentSegment === 'forgot-password' ||
    currentSegment === 'login' ||
    currentSegment === 'register' ||
    currentSegment === 'reset-password';
  const authStatus = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const hasSeenOnboarding = useOnboardingStore((state) => state.hasSeenOnboarding);
  const hydrateOnboarding = useOnboardingStore((state) => state.hydrate);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null | undefined>(undefined);
  const bootReady =
    authStatus !== 'restoring' && hasSeenOnboarding !== null && pendingInvite !== undefined;

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    void hydrateOnboarding();
  }, [hydrateOnboarding]);

  useEffect(() => {
    void hydratePendingInviteCache()
      .then((invite) => {
        setPendingInvite(invite);
      })
      .catch(() => {
        setPendingInvite(null);
      });
  }, []);

  useEffect(() => {
    if (pendingInvite === undefined) {
      return;
    }

    const cachedInvite = getPendingInviteState();
    if (
      cachedInvite?.spaceId === pendingInvite?.spaceId &&
      cachedInvite?.spaceName === pendingInvite?.spaceName &&
      cachedInvite?.token === pendingInvite?.token
    ) {
      return;
    }

    setPendingInvite(cachedInvite ?? null);
  }, [authStatus, hasSeenOnboarding, pendingInvite, segments]);

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
    let active = true;

    const handleIncomingUrl = async (url: string, source: 'initial' | 'foreground' | 'warm-start') => {
      const invite = await captureInviteFromUrl(url, source).catch(() => null);

      if (!active) {
        return;
      }

      if (invite) {
        setPendingInvite(invite);
      }
    };

    const subscribe = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url, 'foreground');
    });

    void Linking.getInitialURL().then((url) => {
      if (url) {
        void handleIncomingUrl(url, 'initial');
      }
    });

    return () => {
      active = false;
      subscribe.remove();
    };
  }, []);

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
    if (!bootReady || hasSeenOnboarding !== true || !pendingInvite) {
      return;
    }

    if (segments[0] === 'onboarding' || isAuthRoute) {
      return;
    }

    const inviteRoute = getPendingInviteRoute(pendingInvite);

    if (inviteRoute && segments[0] !== 'invite') {
      router.replace(inviteRoute);
      return;
    }
  }, [bootReady, hasSeenOnboarding, pendingInvite, segments]);

  useEffect(() => {
    if (!bootReady || pendingInvite) {
      return;
    }

    if (hasSeenOnboarding === false) {
      return;
    }

    if (authStatus === 'unauthenticated' && !isAuthRoute) {
      router.replace('/(auth)/login');
      return;
    }

    if (authStatus === 'authenticated' && isAuthRoute) {
      router.replace('/home');
    }
  }, [authStatus, bootReady, isAuthRoute, pendingInvite, segments]);

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

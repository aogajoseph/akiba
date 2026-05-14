import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerPushNotificationsForCurrentUser } from '@/src/services/pushNotifications';
import { useAuthStore } from '@/src/store/authStore';
import { connectWebSocket, disconnectWebSocket } from '@/src/services/websocket';
import { useNotificationsStore } from '@/src/store/notificationsStore';

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const authStatus = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

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

  if (authStatus === 'restoring') {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colorScheme === 'dark' ? '#000000' : '#ffffff',
          flex: 1,
          justifyContent: 'center',
        }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

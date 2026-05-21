import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Profile',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="help-support"
        options={{
          title: 'Help & Support',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: 'Privacy Policy',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: 'Terms',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="delete-account"
        options={{
          title: 'Delete Account',
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

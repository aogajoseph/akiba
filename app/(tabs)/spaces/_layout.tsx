import { Stack } from 'expo-router';

export default function SpacesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: 'Create Space' }} />
      <Stack.Screen name="[spaceId]/index" options={{ title: 'Space' }} />
      <Stack.Screen name="[spaceId]/members" options={{ title: 'Members' }} />
    </Stack>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function InviteIndexScreen() {
  const params = useLocalSearchParams<{ spaceId?: string; spaceName?: string; token?: string }>();

  useEffect(() => {
    const token = typeof params.token === 'string' ? params.token.trim() : '';
    const spaceId = typeof params.spaceId === 'string' ? params.spaceId.trim() : '';
    const spaceName =
      typeof params.spaceName === 'string' && params.spaceName.trim().length > 0
        ? params.spaceName.trim()
        : undefined;

    if (token || spaceId) {
      router.replace({
        pathname: '/invite/join',
        params: {
          ...(token ? { token } : {}),
          ...(spaceId ? { spaceId } : {}),
          ...(spaceName ? { spaceName } : {}),
        },
      });
      return;
    }

    router.replace('/home');
  }, [params]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Loading invite…</Text>
        <ActivityIndicator color="#0f766e" style={styles.loader} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f7f5ef',
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loader: {
    marginTop: 16,
  },
  title: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

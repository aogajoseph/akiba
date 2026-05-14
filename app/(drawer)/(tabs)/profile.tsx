import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User } from '../../../../shared/contracts';
import AppHeader from '@/components/AppHeader';
import { logout, me } from '../../../services/authService';
import { ApiError } from '../../../utils/api';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await me();
      setUser(response.user);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ zIndex: 1000, elevation: 10 }}>
        <AppHeader />
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {loading ? <ActivityIndicator color="#0f766e" /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {user && !loading ? (
          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{user.name}</Text>
            <Text style={styles.label}>Phone number</Text>
            <Text style={styles.value}>{user.phoneNumber}</Text>
          </View>
        ) : null}

        <Pressable onPress={() => { void handleLogout(); }} style={styles.button}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    color: '#132238',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 20,
  },
  label: {
    color: '#7b8794',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  value: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#132238',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 'auto',
    minHeight: 52,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

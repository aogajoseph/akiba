import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { joinSpace } from '../../services/spaceService';
import {
  clearPendingInvite,
  setPendingInvite,
} from '../../src/services/pendingInvite';
import { ApiError, getAuthSession } from '../../utils/api';

type ResolverState = 'loading' | 'invalid' | 'error';

export default function InviteResolverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ spaceId?: string; spaceName?: string }>();
  const [state, setState] = useState<ResolverState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const spaceId = typeof params.spaceId === 'string' ? params.spaceId.trim() : '';
  const spaceName =
    typeof params.spaceName === 'string' && params.spaceName.trim().length > 0
      ? params.spaceName
      : 'this space';

  useEffect(() => {
    let active = true;

    const resolveInvite = async () => {
      if (!spaceId) {
        if (active) {
          setState('invalid');
        }
        return;
      }

      const session = getAuthSession();

      if (!session?.user.id) {
        await setPendingInvite({ spaceId, spaceName });
        router.replace('/(auth)/login');
        return;
      }

      if (isJoining) {
        return;
      }

      setIsJoining(true);

      try {
        await joinSpace(spaceId);
        router.replace(`/spaces/${spaceId}`);
        await clearPendingInvite();
      } catch (caughtError) {
        const apiError = caughtError as ApiError;

        if (apiError.error === 'User is already a member of this group') {
          router.replace(`/spaces/${spaceId}`);
          await clearPendingInvite();
          return;
        }

        if (apiError.error === 'Group not found') {
          if (active) {
            setState('invalid');
          }
          return;
        }

        if (active) {
          setErrorMessage(apiError.error ?? 'Unable to join this space right now.');
          setState('error');
        }
      } finally {
        if (active) {
          setIsJoining(false);
        }
      }
    };

    void resolveInvite();

    return () => {
      active = false;
    };
  }, [isJoining, retryNonce, router, spaceId, spaceName]);

  if (state === 'invalid') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.brandTitle}>Akiba</Text>
          <Text style={styles.brandSubtitle}>Save money with friends & family</Text>
          <Text style={styles.title}>This invite link is invalid</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.brandTitle}>Akiba</Text>
          <Text style={styles.brandSubtitle}>Save money with friends & family</Text>
          <Text style={styles.inviteLine}>You&apos;ve been invited to join {spaceName}</Text>
          <Text style={styles.title}>{errorMessage ?? 'Unable to join this space.'}</Text>
          <Pressable
            onPress={() => {
              setErrorMessage(null);
              setState('loading');
              setRetryNonce((current) => current + 1);
            }}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brandTitle}>Akiba</Text>
        <Text style={styles.brandSubtitle}>Save money with friends & family</Text>
        <Text style={styles.inviteLine}>You&apos;ve been invited to join {spaceName}</Text>
        <Text style={styles.title}>Joining {spaceName}...</Text>
        <ActivityIndicator color="#0f766e" style={styles.loader} />
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandTitle: {
    color: '#0f766e',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  brandSubtitle: {
    color: '#6b7280',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  inviteLine: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  title: {
    color: '#132238',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 14,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

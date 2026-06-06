import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { clearPendingInvite, setPendingInvite } from '../../src/services/pendingInvite';
import { logStructuredEvent } from '../../src/utils/logger';
import { ApiError, getAuthSession } from '../../utils/api';
import { joinSpace, validateInviteToken } from '../../services/spaceService';

type InviteStatus = 'loading' | 'ready' | 'invalid' | 'error';

export default function InviteJoinScreen() {
  const params = useLocalSearchParams<{ spaceId?: string; spaceName?: string; token?: string }>();
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [spaceId, setSpaceId] = useState<string>('');
  const [spaceName, setSpaceName] = useState<string>('this space');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const normalizedParams = useMemo(() => {
    const token = typeof params.token === 'string' ? params.token.trim() : '';
    const legacySpaceId = typeof params.spaceId === 'string' ? params.spaceId.trim() : '';
    const legacySpaceName =
      typeof params.spaceName === 'string' && params.spaceName.trim().length > 0
        ? params.spaceName.trim()
        : undefined;

    return {
      legacySpaceId,
      legacySpaceName,
      token,
    };
  }, [params.spaceId, params.spaceName, params.token]);

  const resolveAndMaybeJoin = async () => {
    const { legacySpaceId, legacySpaceName, token } = normalizedParams;

    if (!token && !legacySpaceId) {
      logStructuredEvent('invite.context.missing', { source: 'route' });
      setStatus('invalid');
      setErrorMessage('This invite link is missing a token.');
      return;
    }

    const pendingInvite = token
      ? {
          token,
          ...(legacySpaceId ? { spaceId: legacySpaceId } : {}),
          ...(legacySpaceName ? { spaceName: legacySpaceName } : {}),
        }
      : {
          spaceId: legacySpaceId,
          ...(legacySpaceName ? { spaceName: legacySpaceName } : {}),
        };

    await setPendingInvite(pendingInvite, { source: 'route' });

    if (!token) {
      setSpaceId(legacySpaceId);
      setSpaceName(legacySpaceName ?? 'this space');
      const session = getAuthSession();

      if (session?.accessToken) {
        setIsJoining(true);
        logStructuredEvent('invite.join.started', {
          source: 'route',
          spaceId: legacySpaceId,
          tokenPresent: false,
        });

        try {
          await joinSpace(legacySpaceId);
          logStructuredEvent('invite.join.success', {
            source: 'route',
            spaceId: legacySpaceId,
            tokenPresent: false,
          });
          await clearPendingInvite();
          router.replace(`/spaces/${legacySpaceId}`);
          return;
        } catch (caughtError) {
          const apiError = caughtError as ApiError;

          if (apiError.error === 'User is already a member of this group') {
            logStructuredEvent('invite.join.success', {
              source: 'route',
              spaceId: legacySpaceId,
              tokenPresent: false,
              alreadyMember: true,
            });
            await clearPendingInvite();
            router.replace(`/spaces/${legacySpaceId}`);
            return;
          }

          logStructuredEvent('invite.join.failed', {
            error: apiError.error,
            source: 'route',
            spaceId: legacySpaceId,
            tokenPresent: false,
          });
          setErrorMessage(apiError.error ?? 'Unable to join this space right now.');
          setStatus('error');
          return;
        } finally {
          setIsJoining(false);
        }
      }

      setStatus('ready');
      return;
    }

    logStructuredEvent('invite.join.started', {
      source: 'route',
      tokenPresent: true,
    });

    try {
      const validation = await validateInviteToken(token);

      if (!validation.valid || validation.expired || !validation.spaceId) {
        logStructuredEvent('invite.join.failed', {
          reason: validation.expired ? 'expired' : 'invalid',
          source: 'route',
          tokenPresent: true,
        });
        await clearPendingInvite();
        setSpaceId(validation.spaceId ?? legacySpaceId);
        setSpaceName(validation.spaceName ?? legacySpaceName ?? 'this space');
        setStatus('invalid');
        setErrorMessage(validation.expired ? 'This invite link has expired.' : 'This invite link is invalid.');
        return;
      }

      if (validation.spaceId) {
        setSpaceId(validation.spaceId);
      }

      setSpaceName(validation.spaceName ?? legacySpaceName ?? 'this space');

      const session = getAuthSession();

      if (session?.accessToken) {
        setIsJoining(true);
        logStructuredEvent('invite.join.started', {
          source: 'route',
          spaceId: validation.spaceId,
          tokenPresent: true,
        });

        try {
          await joinSpace(validation.spaceId);
          logStructuredEvent('invite.join.success', {
            source: 'route',
            spaceId: validation.spaceId,
            tokenPresent: true,
          });
          await clearPendingInvite();
          router.replace(`/spaces/${validation.spaceId}`);
          return;
        } catch (caughtError) {
          const apiError = caughtError as ApiError;

          if (apiError.error === 'User is already a member of this group') {
            logStructuredEvent('invite.join.success', {
              source: 'route',
              spaceId: validation.spaceId,
              tokenPresent: true,
              alreadyMember: true,
            });
            await clearPendingInvite();
            router.replace(`/spaces/${validation.spaceId}`);
            return;
          }

          logStructuredEvent('invite.join.failed', {
            error: apiError.error,
            source: 'route',
            spaceId: validation.spaceId,
            tokenPresent: true,
          });
          setErrorMessage(apiError.error ?? 'Unable to join this space right now.');
          setStatus('error');
          return;
        } finally {
          setIsJoining(false);
        }
      }

      setStatus('ready');
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      logStructuredEvent('invite.join.failed', {
        error: apiError.error,
        source: 'route',
        tokenPresent: true,
      });
      setErrorMessage(apiError.error ?? 'Unable to resolve this invite right now.');
      setStatus('error');
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      setStatus('loading');
      setErrorMessage(null);

      try {
        await resolveAndMaybeJoin();
      } catch (caughtError) {
        const apiError = caughtError as ApiError;
        if (!active) {
          return;
        }

        setErrorMessage(apiError.error ?? 'Unable to resolve this invite right now.');
        setStatus('error');
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [normalizedParams.legacySpaceId, normalizedParams.legacySpaceName, normalizedParams.token, retryNonce]);

  if (status === 'invalid') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.brandTitle}>Akiba</Text>
          <Text style={styles.brandSubtitle}>Raise money with friends & family</Text>
          <Text style={styles.title}>{errorMessage ?? 'This invite link is invalid.'}</Text>
          <Pressable
            onPress={() => {
              setRetryNonce((current) => current + 1);
            }}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.brandTitle}>Akiba</Text>
          <Text style={styles.brandSubtitle}>Raise money with friends & family</Text>
          <Text style={styles.inviteLine}>You&apos;ve been invited to join {spaceName}</Text>
          <Text style={styles.title}>{errorMessage ?? 'Unable to resolve this invite.'}</Text>
          <Pressable
            onPress={() => {
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
        <Text style={styles.brandSubtitle}>Raise money with friends & family</Text>
        <Text style={styles.inviteLine}>
          You&apos;ve been invited to join {spaceName}
        </Text>
        <Text style={styles.title}>
          {isJoining
            ? `Joining ${spaceName}...`
            : status === 'ready' && !getAuthSession()
              ? `Continue to join ${spaceName}`
              : `Loading invite...`}
        </Text>

        {status === 'ready' && !getAuthSession() ? (
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Log in</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Register</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator color="#0f766e" style={styles.loader} />
        )}
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
  actions: {
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 14,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d6e2db',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '700',
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

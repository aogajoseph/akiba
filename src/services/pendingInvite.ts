import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { joinSpace } from '../../services/spaceService';
import { ApiError } from '../../utils/api';
import { logStructuredEvent } from '@/src/utils/logger';

export type PendingInvite = {
  spaceId: string;
  spaceName?: string;
};

const PENDING_INVITE_STORAGE_KEY = 'akiba:pendingInvite';
let currentPendingInvite: PendingInvite | null | undefined = undefined;

const normalizeInvite = (invite: PendingInvite): PendingInvite | null => {
  const spaceId = invite.spaceId.trim();

  if (!spaceId) {
    return null;
  }

  return {
    spaceId,
    spaceName: invite.spaceName?.trim() ? invite.spaceName.trim() : undefined,
  };
};

export const getPendingInviteState = (): PendingInvite | null | undefined => {
  return currentPendingInvite;
};

export const parseInviteUrl = (url: string): PendingInvite | null => {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path?.replace(/^\/+/, '') ?? '';

    if (path !== 'invite') {
      return null;
    }

    const rawSpaceId = parsed.queryParams?.spaceId;
    const rawSpaceName = parsed.queryParams?.spaceName;
    const spaceId = typeof rawSpaceId === 'string' ? rawSpaceId.trim() : '';
    const spaceName =
      typeof rawSpaceName === 'string' && rawSpaceName.trim().length > 0
        ? rawSpaceName.trim()
        : undefined;

    if (!spaceId) {
      return null;
    }

    return {
      spaceId,
      spaceName,
    };
  } catch {
    return null;
  }
};

export const captureInviteFromUrl = async (
  url: string,
  source: 'initial' | 'foreground' | 'warm-start',
): Promise<PendingInvite | null> => {
  logStructuredEvent('invite.link.received', { source, url });

  const invite = parseInviteUrl(url);

  if (!invite) {
    logStructuredEvent('invite.context.missing', { source, url });
    return null;
  }

  logStructuredEvent('invite.link.parsed', {
    source,
    spaceId: invite.spaceId,
    hasSpaceName: Boolean(invite.spaceName),
  });

  await setPendingInvite(invite, { source });

  return invite;
};

export const setPendingInvite = async (
  invite: PendingInvite,
  options?: {
    source?: string;
  },
): Promise<void> => {
  const normalizedInvite = normalizeInvite(invite);

  if (!normalizedInvite) {
    currentPendingInvite = null;
    await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
    logStructuredEvent('invite.context.missing', {
      source: options?.source ?? 'set',
    });
    return;
  }

  currentPendingInvite = normalizedInvite;
  await AsyncStorage.setItem(
    PENDING_INVITE_STORAGE_KEY,
    JSON.stringify(normalizedInvite),
  );
  logStructuredEvent('invite.persisted', {
    source: options?.source ?? 'set',
    spaceId: normalizedInvite.spaceId,
    hasSpaceName: Boolean(normalizedInvite.spaceName),
  });
};

export const getPendingInvite = async (): Promise<PendingInvite | null> => {
  const rawValue = await AsyncStorage.getItem(PENDING_INVITE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PendingInvite>;

    if (typeof parsed.spaceId !== 'string' || parsed.spaceId.trim().length === 0) {
      await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
      return null;
    }

    return {
      spaceId: parsed.spaceId,
      spaceName: typeof parsed.spaceName === 'string' ? parsed.spaceName : undefined,
    };
  } catch {
    await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
    return null;
  }
};

export const clearPendingInvite = async (): Promise<void> => {
  currentPendingInvite = null;
  await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
};

export const hydratePendingInviteCache = async (): Promise<PendingInvite | null> => {
  const invite = await getPendingInvite();
  currentPendingInvite = invite;

  if (invite) {
    logStructuredEvent('invite.restored', {
      spaceId: invite.spaceId,
      hasSpaceName: Boolean(invite.spaceName),
    });
  } else {
    logStructuredEvent('invite.context.missing', {
      source: 'hydrate',
    });
  }

  return invite;
};

const isRecoverableJoinError = (error: ApiError): boolean => {
  if (typeof error.status === 'number') {
    return error.status >= 500;
  }

  return true;
};

export const consumePendingInviteAndJoin = async (): Promise<string | null> => {
  const invite = currentPendingInvite ?? (await hydratePendingInviteCache());

  if (!invite?.spaceId) {
    logStructuredEvent('invite.context.missing', {
      source: 'join',
    });
    return null;
  }

  try {
    logStructuredEvent('invite.join.started', {
      spaceId: invite.spaceId,
      hasSpaceName: Boolean(invite.spaceName),
    });
    await joinSpace(invite.spaceId);
    await clearPendingInvite();
    logStructuredEvent('invite.join.success', {
      spaceId: invite.spaceId,
      hasSpaceName: Boolean(invite.spaceName),
    });
    return invite.spaceId;
  } catch (caughtError) {
    const apiError = caughtError as ApiError;

    if (apiError.error === 'User is already a member of this group') {
      await clearPendingInvite();
      logStructuredEvent('invite.join.success', {
        spaceId: invite.spaceId,
        hasSpaceName: Boolean(invite.spaceName),
        alreadyMember: true,
      });
      return invite.spaceId;
    }

    if (!isRecoverableJoinError(apiError)) {
      await clearPendingInvite();
    }

    logStructuredEvent('invite.join.failed', {
      spaceId: invite.spaceId,
      hasSpaceName: Boolean(invite.spaceName),
      error: apiError.error ?? 'Unknown error',
      status: apiError.status,
    });

    throw caughtError;
  }
};

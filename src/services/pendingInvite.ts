import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logStructuredEvent } from '@/src/utils/logger';

export type PendingInvite = {
  spaceId?: string;
  spaceName?: string;
  token?: string;
};

export type PendingInviteRoute =
  | {
      pathname: '/invite/join';
      params: {
        token: string;
        spaceId?: string;
        spaceName?: string;
      };
    }
  | {
      pathname: '/invite/join';
      params: {
        spaceId: string;
        spaceName?: string;
      };
    };

const PENDING_INVITE_STORAGE_KEY = 'akiba:pendingInvite';
let currentPendingInvite: PendingInvite | null | undefined = undefined;

const normalizeInvite = (invite: PendingInvite): PendingInvite | null => {
  const token = invite.token?.trim();
  const spaceId = invite.spaceId?.trim();

  if (token) {
    return {
      token,
      ...(spaceId ? { spaceId } : {}),
      spaceName: invite.spaceName?.trim() ? invite.spaceName.trim() : undefined,
    };
  }

  if (!spaceId) {
    return null;
  }

  return {
    spaceId,
    spaceName: invite.spaceName?.trim() ? invite.spaceName.trim() : undefined,
  };
};

const normalizeInvitePath = (parsed: Linking.ParsedURL): string => {
  const path = parsed.path?.replace(/^\/+/, '') ?? '';
  const host = (parsed as { hostname?: string; host?: string }).hostname?.replace(/^\/+/, '')
    ?? (parsed as { hostname?: string; host?: string }).host?.replace(/^\/+/, '')
    ?? '';

  if (host === 'akiba.app' || host === 'www.akiba.app') {
    return path;
  }

  return [host, path].filter(Boolean).join('/').replace(/^\/+/, '');
};

export const getPendingInviteState = (): PendingInvite | null | undefined => {
  return currentPendingInvite;
};

export const getPendingInviteRoute = (
  invite: PendingInvite | null | undefined,
): PendingInviteRoute | null => {
  if (!invite) {
    return null;
  }

  if (invite.token) {
    return {
      pathname: '/invite/join',
      params: {
        token: invite.token,
        ...(invite.spaceId ? { spaceId: invite.spaceId } : {}),
        ...(invite.spaceName ? { spaceName: invite.spaceName } : {}),
      },
    };
  }

  if (!invite.spaceId) {
    return null;
  }

  return {
    pathname: '/invite/join',
    params: {
      spaceId: invite.spaceId,
      ...(invite.spaceName ? { spaceName: invite.spaceName } : {}),
    },
  };
};

export const parseInviteUrl = (url: string): PendingInvite | null => {
  try {
    const parsed = Linking.parse(url);
    const normalizedPath = normalizeInvitePath(parsed);

    if (normalizedPath !== 'invite' && normalizedPath !== 'invite/join') {
      return null;
    }

    const rawToken = parsed.queryParams?.token;
    const rawSpaceId = parsed.queryParams?.spaceId;
    const rawSpaceName = parsed.queryParams?.spaceName;
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    const spaceId = typeof rawSpaceId === 'string' ? rawSpaceId.trim() : '';
    const spaceName =
      typeof rawSpaceName === 'string' && rawSpaceName.trim().length > 0
        ? rawSpaceName.trim()
        : undefined;

    if (token) {
      return {
        token,
        ...(spaceId ? { spaceId } : {}),
        ...(spaceName ? { spaceName } : {}),
      };
    }

    if (!spaceId) {
      return null;
    }

    return {
      spaceId,
      ...(spaceName ? { spaceName } : {}),
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
    hasSpaceId: Boolean(invite.spaceId),
    hasSpaceName: Boolean(invite.spaceName),
    hasToken: Boolean(invite.token),
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
    hasSpaceId: Boolean(normalizedInvite.spaceId),
    hasSpaceName: Boolean(normalizedInvite.spaceName),
    hasToken: Boolean(normalizedInvite.token),
    source: options?.source ?? 'set',
  });
};

export const getPendingInvite = async (): Promise<PendingInvite | null> => {
  const rawValue = await AsyncStorage.getItem(PENDING_INVITE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PendingInvite>;
    const invite = normalizeInvite({
      spaceId: typeof parsed.spaceId === 'string' ? parsed.spaceId : undefined,
      spaceName: typeof parsed.spaceName === 'string' ? parsed.spaceName : undefined,
      token: typeof parsed.token === 'string' ? parsed.token : undefined,
    });

    if (!invite) {
      await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
      return null;
    }

    return invite;
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
      hasSpaceId: Boolean(invite.spaceId),
      hasSpaceName: Boolean(invite.spaceName),
      hasToken: Boolean(invite.token),
    });
  } else {
    logStructuredEvent('invite.context.missing', {
      source: 'hydrate',
    });
  }

  return invite;
};

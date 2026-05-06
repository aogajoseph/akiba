import AsyncStorage from '@react-native-async-storage/async-storage';

import { joinSpace } from '../../services/spaceService';
import { ApiError } from '../../utils/api';

export type PendingInvite = {
  spaceId: string;
  spaceName?: string;
};

const PENDING_INVITE_STORAGE_KEY = 'akiba:pendingInvite';

export const setPendingInvite = async (invite: PendingInvite): Promise<void> => {
  await AsyncStorage.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(invite));
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
  await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
};

const isRecoverableJoinError = (error: ApiError): boolean => {
  if (typeof error.status === 'number') {
    return error.status >= 500;
  }

  return true;
};

export const consumePendingInviteAndJoin = async (): Promise<string | null> => {
  const invite = await getPendingInvite();

  if (!invite?.spaceId) {
    return null;
  }

  try {
    await joinSpace(invite.spaceId);
    await clearPendingInvite();
    return invite.spaceId;
  } catch (caughtError) {
    const apiError = caughtError as ApiError;

    if (apiError.error === 'User is already a member of this group') {
      await clearPendingInvite();
      return invite.spaceId;
    }

    if (!isRecoverableJoinError(apiError)) {
      await clearPendingInvite();
    }

    throw caughtError;
  }
};

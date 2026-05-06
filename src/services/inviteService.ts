import { Share } from 'react-native';

import { getSpaceInviteLink } from '@/services/spaceService';

/**
 * SINGLE SOURCE OF TRUTH for invite sharing.
 * All invite/share actions MUST go through this service.
 */
export type ShareSpace = {
  id: string;
  name?: string;
};

export const getInviteLink = async (spaceId: string): Promise<string> => {
  return getSpaceInviteLink(spaceId);
};

export const generateShareMessage = async (space: ShareSpace): Promise<string> => {
  const inviteLink = await getInviteLink(space.id);
  const safeName = space.name?.trim() ? space.name.trim() : 'My Savings Group';

  return `Akiba \u{1F4B0}
Save money with friends & family

\u{1F4CC} ${safeName}
\u{1F449} Join here: ${inviteLink}`;
};

export const shareInvite = async (space: ShareSpace): Promise<void> => {
  const message = await generateShareMessage(space);
  await Share.share({ message });
};

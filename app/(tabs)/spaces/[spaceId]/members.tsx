import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Group, SpaceAdmin, SpaceMember } from '../../../../../shared/contracts';
import {
  deleteSpace,
  getAdmins,
  getMembers,
  getSpace,
  leaveSpace,
  promoteMember,
  revokeMember,
} from '../../../../services/spaceService';
import { ApiError, getAuthSession } from '../../../../utils/api';

export default function MembersScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Group | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [admins, setAdmins] = useState<SpaceAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMemberId, setActionMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = getAuthSession()?.user.id ?? null;
  const isCreator = currentUserId !== null && currentUserId === space?.createdByUserId;
  const inviteLink = spaceId ? `akiba://spaces/${spaceId}` : null;

  const loadData = useCallback(async () => {
    if (!spaceId) {
      setError('Missing space id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [spaceResponse, membersResponse, adminsResponse] = await Promise.all([
        getSpace(spaceId),
        getMembers(spaceId),
        getAdmins(spaceId),
      ]);

      setSpace(spaceResponse.space ?? spaceResponse.group);
      setMembers(membersResponse.members);
      setAdmins(adminsResponse.admins);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load members.');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const myMembership = useMemo(() => {
    return members.find((member) => member.userId === currentUserId) ?? null;
  }, [currentUserId, members]);

  const adminIds = useMemo(() => new Set(admins.map((admin) => admin.userId)), [admins]);
  const adminMembers = members.filter((member) => adminIds.has(member.userId));
  const regularMembers = members.filter((member) => !adminIds.has(member.userId));
  const isDeletingSpace = actionMemberId === 'delete-space';

  const showInviteMembers = () => {
    if (!inviteLink) {
      return;
    }

    Alert.alert('Invite Members', `Invite link: ${inviteLink}`);
  };

  const runMemberAction = async (memberId: string, action: () => Promise<void>) => {
    setActionMemberId(memberId);
    setError(null);

    try {
      await action();
      await loadData();
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to complete this action.');
    } finally {
      setActionMemberId(null);
    }
  };

  const handlePromote = (member: SpaceMember) => {
    if (!spaceId) {
      return;
    }

    void runMemberAction(member.id, async () => {
      await promoteMember(spaceId, member.id);
    });
  };

  const handleRevoke = (member: SpaceMember) => {
    if (!spaceId) {
      return;
    }

    void runMemberAction(member.id, async () => {
      await revokeMember(spaceId, member.id);
    });
  };

  const handleLeave = () => {
    if (!spaceId || !myMembership) {
      return;
    }

    Alert.alert('Leave Space', 'Are you sure you want to leave this space?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          void runMemberAction(myMembership.id, async () => {
            await leaveSpace(spaceId, myMembership.id);
            router.replace('/(tabs)/spaces');
          });
        },
      },
    ]);
  };

  const performDeleteSpace = async () => {
    if (!spaceId) return;

    setActionMemberId('delete-space');
    setError(null);

    try {
      const response = await deleteSpace(spaceId);

      if (response.success) {
        Alert.alert('Success', 'Space deleted successfully');

        // small delay so user sees the message
        setTimeout(() => {
          router.replace('/(tabs)/spaces');
        }, 500);
      }
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to delete this space.');
    } finally {
      setActionMemberId(null);
    }
  };

  const confirmDeleteSpace = () => {
    if (!spaceId || !space || isDeletingSpace) {
      return;
    }

    Alert.alert('Delete Space', `Delete ${space.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void performDeleteSpace();
        },
      },
    ]);
  };

  const renderMemberCard = (member: SpaceMember) => {
    const isAdmin = adminIds.has(member.userId);
    const isCreatorMember = space?.createdByUserId === member.userId;
    const loadingAction = actionMemberId === member.id;

    return (
      <View key={member.id} style={[styles.memberCard, isAdmin ? styles.adminCard : null]}>
        <View style={styles.memberHeader}>
          <View>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberMeta}>{isAdmin ? 'Admin' : 'Member'}</Text>
          </View>
          {isCreatorMember ? <Text style={styles.creatorBadge}>Creator</Text> : null}
        </View>

        {isCreator && !isCreatorMember ? (
          isAdmin ? (
            <Pressable
              disabled={loadingAction}
              onPress={() => handleRevoke(member)}
              style={[styles.secondaryButton, loadingAction ? styles.disabledButton : null]}>
              <Text style={styles.secondaryButtonText}>
                {loadingAction ? 'Working...' : 'Revoke Admin'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={loadingAction}
              onPress={() => handlePromote(member)}
              style={[styles.primaryButton, loadingAction ? styles.disabledButton : null]}>
              <Text style={styles.primaryButtonText}>
                {loadingAction ? 'Working...' : 'Promote to Admin'}
              </Text>
            </Pressable>
          )
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? <ActivityIndicator color="#0f766e" /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {space && !loading ? (
          <>
            <View style={styles.spaceHeader}>
              {space.imageUrl ? (
                <Image source={{ uri: space.imageUrl }} style={styles.spaceAvatar} />
              ) : (
                <View style={styles.spaceAvatarPlaceholder}>
                  <Text style={styles.spaceAvatarInitial}>
                    {space.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.spaceHeaderContent}>
                <Text style={styles.title}>{space.name}</Text>
                {space.description ? (
                  <Text style={styles.spaceDescription}>{space.description}</Text>
                ) : null}
              </View>
            </View>

            {isCreator ? (
              <Text style={styles.subtitle}>Manage members and admins for this space</Text>
            ) : null}

            {members.length === 1 ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>You&apos;re the only member in this space</Text>
                <Text style={styles.emptyStateText}>
                  Bring in a few more people to start saving together transparently.
                </Text>
                <Pressable onPress={showInviteMembers} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Invite Members</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Admins</Text>
              </View>
              {adminMembers.length > 0 ? (
                adminMembers.map(renderMemberCard)
              ) : (
                <Text style={styles.emptyText}>No admins found.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Members</Text>
              {regularMembers.length > 0 ? (
                regularMembers.map(renderMemberCard)
              ) : (
                <Text style={styles.emptyText}>No members yet</Text>
              )}
            </View>

            {myMembership && !isCreator ? (
              <Pressable
                disabled={actionMemberId === myMembership.id}
                onPress={handleLeave}
                style={[
                  styles.leaveButton,
                  actionMemberId === myMembership.id ? styles.disabledButton : null,
                ]}>
                <Text style={styles.leaveButtonText}>Leave Space</Text>
              </Pressable>
            ) : null}

            {isCreator ? (
              <Pressable
                disabled={isDeletingSpace}
                onPress={confirmDeleteSpace}
                style={[styles.deleteButton, isDeletingSpace ? styles.disabledButton : null]}>
                <Text style={styles.deleteButtonText}>
                  {isDeletingSpace ? 'Deleting...' : 'Delete Space'}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 40,
  },
  spaceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  spaceHeaderContent: {
    flex: 1,
  },
  spaceAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    marginTop: 2,
  },
  spaceAvatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    width: 50,
  },
  spaceAvatarInitial: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    color: '#132238',
    fontSize: 30,
    fontWeight: '800',
  },
  spaceDescription: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  emptyStateTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
  },
  inlineActionButton: {
    backgroundColor: '#edf4f2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionButtonText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
  },
  memberCard: {
    backgroundColor: '#faf7f0',
    borderRadius: 16,
    gap: 12,
    padding: 16,
  },
  adminCard: {
    backgroundColor: '#edf8f6',
  },
  memberHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberName: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '700',
  },
  memberMeta: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },
  creatorBadge: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  inviteLinkContainer: {
    alignItems: 'center',
    gap: 6,
  },
  inviteLinkLabel: {
    color: '#6b7280',
    fontSize: 13,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  secondaryButtonText: {
    color: '#b42318',
    fontSize: 14,
    fontWeight: '700',
  },
  leaveButton: {
    alignItems: 'center',
    backgroundColor: '#fff4e5',
    borderColor: '#f7c98a',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  leaveButtonText: {
    color: '#9a5d22',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#b42318',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
  },
});

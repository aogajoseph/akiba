import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Group, SpaceAdmin } from '../../../../../shared/contracts';
import FullScreenImageViewer from '../../../../components/FullScreenImageViewer';
import InviteMembersModal from '../../../../components/InviteMembersModal';
import { getAdmins, getSpace } from '../../../../services/spaceService';
import { ApiError } from '../../../../utils/api';

type ToastMessage = {
  id: number;
  text: string;
};

export default function SpaceDashboardScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Group | null>(null);
  const [admins, setAdmins] = useState<SpaceAdmin[]>([]);
  const [remainingSlots, setRemainingSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);
  const toastTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const showInviteMembers = () => {
    if (!spaceId) {
      return;
    }

    setInviteModalVisible(true);
  };

  const dismissToast = useCallback((toastId: number) => {
    const timeout = toastTimeoutsRef.current[toastId];

    if (timeout) {
      clearTimeout(timeout);
      delete toastTimeoutsRef.current[toastId];
    }

    setToastMessages((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback((text: string) => {
    const toastId = Date.now() + Math.floor(Math.random() * 1000);

    setToastMessages((current) => [...current, { id: toastId, text }]);
    toastTimeoutsRef.current[toastId] = setTimeout(() => {
      dismissToast(toastId);
    }, 2200);
  }, [dismissToast]);

  const handleCopyInviteLink = async () => {
    if (!spaceId) {
      return;
    }

    const link = `akiba://spaces/${spaceId}`;

    try {
      await Clipboard.setStringAsync(link);
      setInviteModalVisible(false);
      showToast('Link copied to clipboard');
    } catch {
      setError('Unable to copy invite link.');
      setInviteModalVisible(false);
    }
  };

  const handleShareSpace = async () => {
    if (!spaceId) {
      return;
    }

    const link = `https://akiba.app/spaces/${spaceId}/join`;

    try {
      await Share.share({
        message: `Join our Akiba Space on:\n${link}`,
      });
      setInviteModalVisible(false);
    } catch {
      await Clipboard.setStringAsync(link);
      setInviteModalVisible(false);
      showToast('Link copied to clipboard');
    }
  };

  useEffect(() => {
    const loadSpace = async () => {
      if (!spaceId) {
        setError('Missing space id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [spaceResponse, adminsResponse] = await Promise.all([
          getSpace(spaceId),
          getAdmins(spaceId),
        ]);

        setSpace(spaceResponse.space ?? spaceResponse.group);
        setAdmins(adminsResponse.admins);
        setRemainingSlots(adminsResponse.remainingSlots);
      } catch (caughtError) {
        const apiError = caughtError as ApiError;
        setError(apiError.error ?? 'Unable to load this space.');
      } finally {
        setLoading(false);
      }
    };

    void loadSpace();
  }, [spaceId]);

  useEffect(() => {
    return () => {
      Object.values(toastTimeoutsRef.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
      toastTimeoutsRef.current = {};
    };
  }, []);

  const targetAmount = space?.targetAmount ?? 0;
  const collectedAmount = space?.collectedAmount ?? 0;
  const progressRatio =
    targetAmount > 0 ? Math.min(collectedAmount / targetAmount, 1) : 0;
  const progressPercent = Math.round(progressRatio * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? <ActivityIndicator color="#0f766e" /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {space && !loading ? (
          <>
            {space.imageUrl ? (
              <Pressable onPress={() => setViewerVisible(true)}>
                <ExpoImage
                  contentFit="cover"
                  source={{ uri: space.imageUrl }}
                  style={styles.spaceImage}
                />
              </Pressable>
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.placeholderInitial}>
                  {space.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.title}>{space.name}</Text>
            <Text style={styles.subtitle}>
              {space.description?.trim() || 'No description yet'}
            </Text>

            {space.targetAmount ? (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Target Amount</Text>
                  <Text style={styles.progressLabelRight}>
                    KES {space.targetAmount.toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.progressMeta}>
                  KES {collectedAmount.toLocaleString()} collected
                </Text>

                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercent}>completion: {progressPercent}%</Text>

                {space.deadline ? (
                  <Text style={styles.deadlineText}>
                    Deadline: {new Date(space.deadline).toDateString()}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Admins</Text>
              </View>
              {admins.map((admin) => (
                <View key={admin.userId} style={styles.adminRow}>
                  <Text style={styles.adminName}>{admin.name}</Text>
                  <Text style={styles.adminRole}>{admin.role}</Text>
                </View>
              ))}
              <Text style={styles.remainingText}>
                Admins required to approve: {space.approvalThreshold}
              </Text>
              <Text style={styles.remainingText}>Available admin slots: {remainingSlots}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <Pressable style={styles.placeholderButton}>
                <Text style={styles.placeholderButtonText}>View Transactions</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/spaces/${space.id}/chat`)}
                style={styles.placeholderButton}>
                <Text style={styles.placeholderButtonText}>Open Chat</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/spaces/${space.id}/members`)}
                style={styles.placeholderButton}>
                <Text style={styles.placeholderButtonText}>View Members</Text>
              </Pressable>
              <Pressable onPress={showInviteMembers} style={styles.placeholderButton}>
                <Text style={styles.placeholderButtonText}>Add Members</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

      {toastMessages.length > 0 ? (
        <View pointerEvents="none" style={styles.toastStack}>
          {toastMessages.map((toast) => (
            <View key={toast.id} style={styles.toast}>
              <Text style={styles.toastText}>{toast.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <InviteMembersModal
        onClose={() => setInviteModalVisible(false)}
        onCopyLink={() => {
          void handleCopyInviteLink();
        }}
        onFromContacts={() => {
          setInviteModalVisible(false);
          router.push(`/(tabs)/spaces/${spaceId}/invite/contacts`);
        }}
        onShareSpace={() => {
          void handleShareSpace();
        }}
        visible={inviteModalVisible}
      />

      <FullScreenImageViewer
        imageUrl={space?.imageUrl ?? null}
        onClose={() => setViewerVisible(false)}
        visible={viewerVisible}
      />
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
  },
  spaceImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
  },
  placeholderAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  placeholderInitial: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    color: '#132238',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '700',
  },
  progressLabelRight: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '700',
  },
  progressMeta: {
    color: '#6b7280',
    fontSize: 14,
  },
  progressBarContainer: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    height: 12,
    marginBottom: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#0f766e',
    height: '100%',
  },
  progressPercent: {
    alignSelf: 'flex-end',
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '700',
  },
  deadlineText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 6,
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
  adminRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  adminName: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '600',
  },
  adminRole: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  remainingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  placeholderButton: {
    alignItems: 'center',
    backgroundColor: '#edf4f2',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
  },
  placeholderButtonText: {
    color: '#132238',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
  },
  toastStack: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 8,
    zIndex: 40,
  },
  toast: {
    backgroundColor: 'rgba(19, 34, 56, 0.92)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Group, SpaceAdmin } from '../../../../../shared/contracts';
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? <ActivityIndicator color="#0f766e" /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {space && !loading ? (
          <>
            {space.imageUrl ? (
              <ExpoImage
                contentFit="cover"
                source={{ uri: space.imageUrl }}
                style={styles.spaceImage}
              />
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
              <Text style={styles.remainingText}>Remaining admin slots: {remainingSlots}</Text>
              <Text style={styles.remainingText}>
                Admins required to approve: {space.approvalThreshold}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <Pressable
                onPress={() => router.push(`/(tabs)/spaces/${space.id}/members`)}
                style={styles.placeholderButton}>
                <Text style={styles.placeholderButtonText}>View Members</Text>
              </Pressable>
              <Pressable onPress={showInviteMembers} style={styles.placeholderButton}>
                <Text style={styles.placeholderButtonText}>Invite Members</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/spaces/${space.id}/chat`)}
                style={styles.placeholderButton}>
                <Text style={styles.placeholderButtonText}>Open Chat</Text>
              </Pressable>
              <Pressable style={styles.placeholderButton}>
                <Text style={styles.placeholderButtonText}>View Transactions</Text>
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

      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Invite Members</Text>

            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setInviteModalVisible(false);
                router.push(`/(tabs)/spaces/${spaceId}/invite/contacts`);
              }}
            >
              <Text style={styles.modalButtonText}>From Contacts</Text>
            </Pressable>

            <Pressable
              style={styles.modalButton}
              onPress={() => {
                void handleCopyInviteLink();
              }}
            >
              <Text style={styles.modalButtonText}>Copy Invite Link</Text>
            </Pressable>

            <Pressable
              style={styles.modalButton}
              onPress={() => {
                void handleShareSpace();
              }}
            >
              <Text style={styles.modalButtonText}>Share Space</Text>
            </Pressable>

            <Pressable
              style={styles.modalCancel}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#132238',
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#edf4f2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#132238',
  },
  modalCancel: {
    marginTop: 6,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#b42318',
    fontWeight: '600',
  },
});

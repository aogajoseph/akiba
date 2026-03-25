import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Group, SpaceAdmin } from '../../../../../shared/contracts';
import { getAdmins, getSpace } from '../../../../services/spaceService';
import { ApiError } from '../../../../utils/api';

export default function SpaceDashboardScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Group | null>(null);
  const [admins, setAdmins] = useState<SpaceAdmin[]>([]);
  const [remainingSlots, setRemainingSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  const showInviteMembers = () => {
    if (!spaceId) {
      return;
    }

    setInviteModalVisible(true);
  };

  const handleCopyInviteLink = async () => {
    if (!spaceId) {
      return;
    }

    const link = `https://akiba.app/spaces/${spaceId}/join`;

    try {
      await Clipboard.setStringAsync(link);
      setInviteModalVisible(false);
      Alert.alert('Success', 'Link copied to clipboard');
    } catch {
      setError('Unable to copy invite link.');
      setInviteModalVisible(false);
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

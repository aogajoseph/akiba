import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

  const showInviteMembers = () => {
    if (!spaceId) {
      return;
    }

    Alert.alert('Invite Members', `Invite link: akiba://spaces/${spaceId}/join`);
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
            <Text style={styles.title}>{space.name}</Text>
            <Text style={styles.subtitle}>No description yet</Text>

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
                <Text style={styles.placeholderButtonText}>Transact</Text>
              </Pressable>
            </View>
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
  },
  title: {
    color: '#132238',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
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
});

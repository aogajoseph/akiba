import { router, Stack, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Group } from '../../../../shared/contracts';
import AppHeader from '@/components/AppHeader';
import FullScreenImageViewer from '../../../components/FullScreenImageViewer';
import { listSpaces } from '../../../services/spaceService';
import { ApiError } from '../../../utils/api';

export default function ListSpacesScreen() {
  const [spaces, setSpaces] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listSpaces();
      setSpaces(response.spaces ?? response.groups);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load spaces.');
    } finally {
      setLoading(false);
    }
  }, []);

  const openViewer = useCallback((imageUrl: string) => {
    setViewerImageUrl(imageUrl);
    setViewerVisible(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSpaces();
    }, [loadSpaces]),
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Spaces</Text>
            <Text style={styles.subtitle}>Your shared saving spaces</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/spaces/create')} style={styles.createButton}>
            <Text style={styles.createButtonText}>Create Space</Text>
          </Pressable>
        </View>

        {loading ? <ActivityIndicator color="#0f766e" style={styles.loader} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && spaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Spaces Yet</Text>
            <Text style={styles.emptyText}>Create a space to start saving with others.</Text>
          </View>
        ) : null}

        <FlatList
          contentContainerStyle={styles.listContent}
          data={spaces}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.imageUrl ? (
                <Pressable onPress={() => openViewer(item.imageUrl)} style={styles.cardAvatarButton}>
                  <ExpoImage
                    contentFit="cover"
                    source={{ uri: item.imageUrl }}
                    style={styles.cardAvatar}
                  />
                </Pressable>
              ) : (
                <View style={styles.cardAvatarPlaceholder}>
                  <Text style={styles.cardAvatarInitial}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={() => router.push(`/(tabs)/spaces/${item.id}`)}
                style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>Admins: {item.approvalThreshold}</Text>
              </Pressable>
            </View>
          )}
        />

        <FullScreenImageViewer
          imageUrl={viewerImageUrl}
          onClose={() => setViewerVisible(false)}
          visible={viewerVisible}
        />
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
    padding: 20,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    color: '#132238',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#0f766e',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    padding: 28,
  },
  emptyTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  cardAvatarButton: {
    borderRadius: 22,
  },
  cardAvatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  cardAvatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cardAvatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
  },
  cardMeta: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
});

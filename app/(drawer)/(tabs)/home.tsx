import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Group, NotificationDTO } from '@shared/contracts';
import AppHeader from '@/components/AppHeader';
import { listSpaces } from '@/services/spaceService';
import { useAuthStore } from '@/src/store/authStore';
import { useNotificationsStore } from '@/src/store/notificationsStore';
import { timeAgo } from '@/src/utils/timeAgo';
import { ApiError } from '@/utils/api';

const getGreeting = (name?: string): string => {
  const hour = new Date().getHours();
  const firstName = name?.trim().split(/\s+/)[0] ?? 'there';

  if (hour < 12) {
    return `Good morning, ${firstName}`;
  }

  if (hour < 18) {
    return `Good afternoon, ${firstName}`;
  }

  return `Good evening, ${firstName}`;
};

const formatCurrency = (amount?: number): string => {
  const safeAmount = Number.isFinite(amount) ? Number(amount) : 0;

  return new Intl.NumberFormat('en-KE', {
    currency: 'KES',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(safeAmount);
};

const getSpaceBalanceLabel = (space: Group): string => {
  if (typeof space.availableBalance === 'number') {
    return formatCurrency(space.availableBalance);
  }

  if (typeof space.totalBalance === 'number') {
    return formatCurrency(space.totalBalance);
  }

  return formatCurrency(0);
};

const getActivityRoute = (activity: NotificationDTO) => {
  if (activity.spaceId && activity.transactionId) {
    return {
      pathname: '/spaces/[spaceId]/transactions/[transactionId]' as const,
      params: {
        spaceId: activity.spaceId,
        transactionId: activity.transactionId,
      },
    };
  }

  if (activity.spaceId) {
    return `/spaces/${activity.spaceId}` as const;
  }

  return '/notifications' as const;
};

export default function HomeScreen() {
  const sessionUser = useAuthStore((state) => state.session?.user ?? null);
  const { notifications, unreadCount, loading: notificationsLoading, fetchNotifications } =
    useNotificationsStore();
  const [spaces, setSpaces] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadSpaces = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await listSpaces();
      const nextSpaces = response.spaces ?? response.groups ?? [];
      setSpaces(nextSpaces);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load your spaces.');
    } finally {
      if (mode === 'refresh') {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const mode = hasLoadedOnceRef.current ? 'refresh' : 'initial';
      hasLoadedOnceRef.current = true;
      void loadSpaces(mode);
    }, [loadSpaces]),
  );

  const greeting = getGreeting(sessionUser?.name);
  const totalAvailableBalance = useMemo(() => {
    return spaces.reduce((sum, space) => {
      if (typeof space.availableBalance === 'number') {
        return sum + space.availableBalance;
      }

      return sum + (space.totalBalance ?? 0);
    }, 0);
  }, [spaces]);
  const spacesWithPendingWithdrawals = useMemo(() => {
    return spaces.filter((space) => (space.pendingWithdrawalAmount ?? 0) > 0);
  }, [spaces]);
  const recentActivity = notifications.slice(0, 6);

  const unreadCountBySpace = useMemo(() => {
    return notifications.reduce<Record<string, number>>((map, activity) => {
      if (!activity.spaceId || activity.isRead) {
        return map;
      }

      map[activity.spaceId] = (map[activity.spaceId] ?? 0) + 1;
      return map;
    }, {});
  }, [notifications]);

  const handleRefresh = async () => {
    await Promise.all([
      loadSpaces('refresh'),
      fetchNotifications(),
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerWrap}>
        <AppHeader />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={['#0f766e']}
            onRefresh={() => {
              void handleRefresh();
            }}
            refreshing={refreshing}
            tintColor="#0f766e"
          />
        }>
        <View style={styles.heroCard}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heroSubtitle}>
            Track money activity, recent updates and where your attention is needed.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{spaces.length}</Text>
              <Text style={styles.heroStatLabel}>Spaces</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{formatCurrency(totalAvailableBalance)}</Text>
              <Text style={styles.heroStatLabel}>Contributions</Text>
            </View>
          </View>
        </View>

        {unreadCount > 0 || spacesWithPendingWithdrawals.length > 0 ? (
          <View style={styles.attentionCard}>
            <View style={styles.attentionHeader}>
              <Ionicons color="#9a3412" name="sparkles-outline" size={18} />
              <Text style={styles.attentionTitle}>Needs attention</Text>
            </View>
            {unreadCount > 0 ? (
              <Text style={styles.attentionText}>
                {unreadCount} unread {unreadCount === 1 ? 'update' : 'updates'} across your spaces.
              </Text>
            ) : null}
            {spacesWithPendingWithdrawals.length > 0 ? (
              <Text style={styles.attentionText}>
                {spacesWithPendingWithdrawals.length}{' '}
                {spacesWithPendingWithdrawals.length === 1 ? 'space has' : 'spaces have'} pending
                withdrawal activity.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Spaces</Text>
          <Pressable onPress={() => router.push('/spaces')}>
            <Text style={styles.sectionAction}>View all</Text>
          </Pressable>
        </View>

        {loading && spaces.length === 0 ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#0f766e" />
            <Text style={styles.loadingText}>Loading your spaces</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && spaces.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Start your first shared savings space</Text>
            <Text style={styles.emptyBody}>
              Create a group for family, friends, events, or a simple chama and begin tracking
              money together.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable onPress={() => router.push('/spaces/create')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Create Space</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/spaces')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Browse Spaces</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.spaceCardsContent}
            horizontal
            showsHorizontalScrollIndicator={false}>
            {spaces.map((space) => {
              const unreadForSpace = unreadCountBySpace[space.id] ?? 0;
              const hasPendingWithdrawal = (space.pendingWithdrawalAmount ?? 0) > 0;

              return (
                <Pressable
                  key={space.id}
                  onPress={() => router.push(`/spaces/${space.id}`)}
                  style={styles.spaceCard}>
                  <View style={styles.spaceCardTopRow}>
                    <Text numberOfLines={1} style={styles.spaceCardTitle}>
                      {space.name}
                    </Text>
                    {unreadForSpace > 0 ? (
                      <View style={styles.unreadPill}>
                        <Text style={styles.unreadPillText}>
                          {unreadForSpace} new
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.spaceBalanceLabel}>Total Contributions</Text>
                  <Text style={styles.spaceBalance}>{getSpaceBalanceLabel(space)}</Text>

                  <View style={styles.spaceMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons color="#64748b" name="people-outline" size={14} />
                      <Text style={styles.metaText}>
                        {space.membersCount ?? 0} members
                      </Text>
                    </View>

                    {hasPendingWithdrawal ? (
                      <View style={styles.pendingPill}>
                        <Ionicons color="#9a3412" name="time-outline" size={14} />
                        <Text style={styles.pendingPillText}>Pending withdrawal</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable onPress={() => router.push('/notifications')}>
            <Text style={styles.sectionAction}>View all</Text>
          </Pressable>
        </View>

        {notificationsLoading && recentActivity.length === 0 ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#0f766e" />
            <Text style={styles.loadingText}>Loading recent activity</Text>
          </View>
        ) : null}

        {!notificationsLoading && recentActivity.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Your activity will appear here</Text>
            <Text style={styles.emptyBody}>
              Deposits, withdrawals, approvals and other space updates will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.feedCard}>
            {recentActivity.map((activity, index) => (
              <Pressable
                key={activity.cursorId}
                onPress={() => router.push(getActivityRoute(activity))}
                style={[
                  styles.feedItem,
                  index < recentActivity.length - 1 ? styles.feedItemDivider : null,
                ]}>
                <View style={styles.feedIcon}>
                  <Ionicons
                    color={activity.isRead ? '#64748b' : '#0f766e'}
                    name={activity.isRead ? 'ellipse-outline' : 'sparkles-outline'}
                    size={16}
                  />
                </View>
                <View style={styles.feedBody}>
                  <Text style={[styles.feedTitle, !activity.isRead ? styles.feedTitleUnread : null]}>
                    {activity.title}
                  </Text>
                  <Text numberOfLines={2} style={styles.feedText}>
                    {activity.body}
                  </Text>
                  <Text style={styles.feedTime}>{timeAgo(activity.createdAt)}</Text>
                </View>
                {!activity.isRead ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  headerWrap: {
    elevation: 10,
    zIndex: 1000,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#132238',
    borderRadius: 24,
    gap: 10,
    padding: 20,
  },
  greeting: {
    color: '#99f6e4',
    fontSize: 18,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#d7e3f1',
    fontSize: 14,
    lineHeight: 21,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  heroStat: {
    backgroundColor: '#1d3654',
    borderRadius: 18,
    flex: 1,
    gap: 4,
    padding: 14,
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: '#c4d3e3',
    fontSize: 12,
    fontWeight: '600',
  },
  attentionCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  attentionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  attentionTitle: {
    color: '#9a3412',
    fontSize: 14,
    fontWeight: '800',
  },
  attentionText: {
    color: '#7c2d12',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionAction: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  loadingText: {
    color: '#526172',
    fontSize: 14,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  emptyTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBody: {
    color: '#526172',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#f7fffd',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#edf7f5',
    borderColor: '#cde8e3',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '700',
  },
  spaceCardsContent: {
    gap: 12,
    paddingRight: 8,
  },
  spaceCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    minHeight: 156,
    padding: 18,
    width: 250,
  },
  spaceCardTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  spaceCardTitle: {
    color: '#132238',
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  unreadPill: {
    backgroundColor: '#e7faf5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadPillText: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '700',
  },
  spaceBalance: {
    color: '#132238',
    fontSize: 24,
    fontWeight: '800',
  },
  spaceBalanceLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  spaceMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metaText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingPill: {
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pendingPillText: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
  },
  feedCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  feedItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  feedItemDivider: {
    borderBottomColor: '#eef2f6',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feedIcon: {
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    marginTop: 2,
    width: 32,
  },
  feedBody: {
    flex: 1,
    gap: 4,
  },
  feedTitle: {
    color: '#132238',
    fontSize: 14,
    fontWeight: '700',
  },
  feedTitleUnread: {
    fontWeight: '800',
  },
  feedText: {
    color: '#526172',
    fontSize: 13,
    lineHeight: 19,
  },
  feedTime: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  unreadDot: {
    backgroundColor: '#0f766e',
    borderRadius: 4,
    height: 8,
    marginTop: 8,
    width: 8,
  },
});

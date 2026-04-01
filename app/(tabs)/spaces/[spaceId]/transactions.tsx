import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import {
  GetTransactionsSummaryResponseDto,
  Group,
  SpaceAdmin,
} from '../../../../../shared/contracts';
import FullScreenImageViewer from '../../../../components/FullScreenImageViewer';
import {
  approveWithdrawal,
  getAdmins,
  getSpace,
  getTransactionsSummary,
} from '../../../../services/spaceService';
import { ApiError, getAuthSession } from '../../../../utils/api';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(15, 118, 110, ${opacity})`,
  labelColor: () => '#6b7280',
  style: { borderRadius: 16 },
};

const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number') return 'KES 0';
  return `KES ${amount.toLocaleString()}`;
};

const buildChartData = (data: number[]) => {
  const safeData = data.length > 0 ? data : [0];

  return {
    labels: safeData.map(() => ''),
    datasets: [{ data: safeData }],
  };
};

type TransactionsSummaryState = GetTransactionsSummaryResponseDto & {
  pendingDeposits?: Array<{
    amount: number;
    createdAt: string;
    id: string;
    status: 'pending' | 'completed' | 'failed';
    userId: string;
    userName: string;
  }>;
  pendingWithdrawals: Array<
    GetTransactionsSummaryResponseDto['pendingWithdrawals'][number] & {
      status?: 'pending' | 'approved' | 'completed' | 'failed';
    }
  >;
};

export default function SpaceTransactionsScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Group | null>(null);
  const [admins, setAdmins] = useState<SpaceAdmin[]>([]);
  const [summary, setSummary] = useState<TransactionsSummaryState | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [approvingWithdrawals, setApprovingWithdrawals] = useState<Record<string, boolean>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = getAuthSession()?.user.id ?? null;
  const isAdmin = useMemo(() => {
    return admins.some((admin) => admin.userId === currentUserId);
  }, [admins, currentUserId]);

  const loadTransactionsScreen = useCallback(async () => {
    if (!spaceId) {
      setError('Missing space id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [spaceResponse, summaryResponse, adminsResponse] = await Promise.all([
        getSpace(spaceId),
        getTransactionsSummary(spaceId),
        getAdmins(spaceId),
      ]);

      setSpace(spaceResponse.space ?? spaceResponse.group);
      setSummary(summaryResponse as TransactionsSummaryState);
      setAdmins(adminsResponse.admins);
    } catch (caughtError) {
      console.log('TRANSACTIONS ERROR:', caughtError);
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useFocusEffect(
    useCallback(() => {
      void loadTransactionsScreen();
    }, [loadTransactionsScreen]),
  );

  useEffect(() => {
    if (!summary) {
      setIsPolling(false);
      return;
    }

    const hasPendingTransactions =
      (summary as TransactionsSummaryState & { hasPendingTransactions?: boolean })
        .hasPendingTransactions;
    const hasDerivedPendingTransactions =
      (summary.pendingDeposits?.length ?? 0) > 0 ||
      summary.pendingWithdrawals.some(
        (withdrawal) => withdrawal.status === 'pending' || withdrawal.status === 'approved',
      );

    setIsPolling(hasPendingTransactions ?? hasDerivedPendingTransactions);
  }, [summary]);

  useEffect(() => {
    if (!spaceId || !isPolling) {
      return;
    }

    const interval = setInterval(() => {
      void loadTransactionsScreen();
    }, 3000);

    return () => clearInterval(interval);
  }, [isPolling, loadTransactionsScreen, spaceId]);

  const handleApproveWithdrawal = useCallback(async (withdrawalId: string) => {
    if (!spaceId) {
      return;
    }

    setApprovingWithdrawals((current) => ({
      ...current,
      [withdrawalId]: true,
    }));
    setError(null);

    try {
      await approveWithdrawal(withdrawalId);
      await loadTransactionsScreen();
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to approve withdrawal.');
    } finally {
      setApprovingWithdrawals((current) => ({
        ...current,
        [withdrawalId]: false,
      }));
    }
  }, [loadTransactionsScreen, spaceId]);

  const progress =
    space?.targetAmount && summary
      ? space.targetAmount > 0
        ? Math.min(summary.currentBalance / space.targetAmount, 1)
        : 0
      : 0;
  const progressPercent = Math.round(progress * 100);
  const createdAtLabel = space?.createdAt
    ? new Date(space.createdAt).toDateString()
    : '';
  const deadlineLabel = space?.deadline
    ? new Date(space.deadline).toDateString()
    : '';

  if (!spaceId) {
    return (
      <SafeAreaView>
        <Text>Invalid space</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Transactions',
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? <ActivityIndicator color="#0f766e" style={styles.loader} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && space && summary ? (
          <>
            <View style={styles.identityCard}>
              <Pressable
                disabled={!space.imageUrl}
                onPress={() => {
                  if (space.imageUrl) {
                    setViewerVisible(true);
                  }
                }}>
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
              </Pressable>

              <View style={styles.identityText}>
                <Text style={styles.title}>{space.name}</Text>
                {space.description ? (
                  <Text style={styles.subtitle}>{space.description}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(summary.currentBalance)}
              </Text>
              <Text style={styles.balanceSubtext}>Available for withdrawal</Text>
            </View>

            {space.targetAmount ? (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Target Amount</Text>
                  <Text style={styles.progressLabel}>Completion: {progressPercent}%</Text>
                </View>
                <Text style={styles.progressAmount}>
                  {formatCurrency(space.targetAmount)}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>
                {space.deadline ? (
                  <Text style={styles.progressDeadline}>
                    Deadline: {deadlineLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => router.push(`/(tabs)/spaces/${spaceId}/deposit`)}
                style={[styles.actionButton, styles.depositButton]}>
                <Text style={styles.actionButtonText}>Deposit</Text>
              </Pressable>

              {isAdmin ? (
                <Pressable
                  onPress={() => router.push(`/(tabs)/spaces/${spaceId}/withdraw`)}
                  style={[styles.actionButton, styles.withdrawButton]}>
                  <Text style={styles.actionButtonText}>Withdraw</Text>
                </Pressable>
              ) : null}
            </View>

            {summary.pendingDeposits && summary.pendingDeposits.length > 0 ? (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Deposits In Progress</Text>
                <View style={styles.pendingWithdrawalsList}>
                  {summary.pendingDeposits.map((deposit) => (
                    <View key={deposit.id} style={styles.pendingWithdrawalItem}>
                      <View style={styles.pendingWithdrawalHeader}>
                        <Text style={styles.pendingWithdrawalAmount}>
                          {formatCurrency(deposit.amount)}
                        </Text>
                        <Text style={styles.pendingWithdrawalMeta}>Pending deposit...</Text>
                      </View>
                      <Text style={styles.pendingWithdrawalMeta}>
                        Initiated by {deposit.userName}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Total Deposits</Text>
              <Text style={styles.chartAmount}>
                {formatCurrency(summary.totalDeposits)}
              </Text>
              <Text style={styles.chartMeta}>Since {createdAtLabel}</Text>
              <LineChart
                bezier
                chartConfig={chartConfig}
                data={buildChartData(summary.depositsOverTime ?? [])}
                fromZero
                height={180}
                style={styles.chart}
                width={screenWidth - 40}
                withDots={(summary.depositsOverTime?.length ?? 0) > 1}
                withInnerLines={false}
                withOuterLines={false}
                withShadow={false}
                yAxisInterval={1}
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Total Withdrawals</Text>
              <Text style={styles.chartAmount}>
                {formatCurrency(summary.totalWithdrawals)}
              </Text>
              <Text style={styles.chartMeta}>Since {createdAtLabel}</Text>
              <LineChart
                bezier
                chartConfig={chartConfig}
                data={buildChartData(summary.withdrawalsOverTime ?? [])}
                fromZero
                height={180}
                style={styles.chart}
                width={screenWidth - 40}
                withDots={(summary.withdrawalsOverTime?.length ?? 0) > 1}
                withInnerLines={false}
                withOuterLines={false}
                withShadow={false}
                yAxisInterval={1}
              />
            </View>
          </>
        ) : !loading ? (
          <Text>Unable to load transactions.</Text>
        ) : null}

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Withdrawal Requests</Text>
          {summary.pendingWithdrawals.length > 0 ? (
            <View style={styles.pendingWithdrawalsList}>
              {summary.pendingWithdrawals.map((withdrawal) => {
                const hasApproved = withdrawal.approvals.includes(currentUserId ?? '');
                const isApproving = approvingWithdrawals[withdrawal.id] === true;
                const isProcessingPayout = withdrawal.status === 'approved';

                return (
                  <View key={withdrawal.id} style={styles.pendingWithdrawalItem}>
                    <View style={styles.pendingWithdrawalHeader}>
                      <Text style={styles.pendingWithdrawalAmount}>
                        {formatCurrency(withdrawal.amount)}
                      </Text>
                      <Text style={styles.pendingWithdrawalMeta}>
                        {isProcessingPayout
                          ? 'Processing payout...'
                          : `${withdrawal.approvals.length}/${withdrawal.requiredApprovals} Approved`}
                      </Text>
                    </View>

                    <Text style={styles.pendingWithdrawalMeta}>
                      Requested by {withdrawal.requestedByName}
                    </Text>

                    <Text style={styles.pendingWithdrawalMeta}>
                      {isProcessingPayout ? 'Processing payout...' : 'Waiting for approvals'}
                    </Text>

                    {withdrawal.reason ? (
                      <Text style={styles.pendingWithdrawalReason}>
                        {withdrawal.reason}
                      </Text>
                    ) : null}

                    {isAdmin && !isProcessingPayout ? (
                      <Pressable
                        disabled={hasApproved || isApproving}
                        onPress={() => {
                          void handleApproveWithdrawal(withdrawal.id);
                        }}
                        style={[
                          styles.pendingWithdrawalButton,
                          hasApproved || isApproving
                            ? styles.pendingWithdrawalButtonDisabled
                            : null,
                        ]}>
                        <Text style={styles.pendingWithdrawalButtonText}>
                          {hasApproved
                            ? 'Approved'
                            : isApproving
                              ? 'Approving...'
                              : 'Approve'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.chartMeta}>No withdrawals are currently in progress.</Text>
          )}
        </View>
      </ScrollView>

      <FullScreenImageViewer
        visible={viewerVisible}
        imageUrl={space?.imageUrl ?? null}
        onClose={() => setViewerVisible(false)}
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
    paddingBottom: 40,
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
  },
  identityCard: {
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  spaceImage: {
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  placeholderAvatar: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  placeholderInitial: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  identityText: {
    flex: 1,
  },
  title: {
    color: '#132238',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: '#0f766e',
    borderRadius: 20,
    padding: 20,
  },
  balanceLabel: {
    color: '#d1fae5',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 8,
  },
  balanceSubtext: {
    color: '#ccfbf1',
    fontSize: 13,
    marginTop: 8,
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
  progressAmount: {
    color: '#0f766e',
    fontSize: 18,
    fontWeight: '800',
  },
  progressBarContainer: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    height: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#0f766e',
    height: '100%',
  },
  progressDeadline: {
    color: '#6b7280',
    fontSize: 14,
  },
  actionRow: {
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
  },
  depositButton: {
    backgroundColor: '#0f766e',
  },
  withdrawButton: {
    backgroundColor: '#132238',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    overflow: 'hidden',
    padding: 18,
  },
  chartTitle: {
    color: '#132238',
    fontSize: 17,
    fontWeight: '700',
  },
  chartAmount: {
    color: '#0f766e',
    fontSize: 22,
    fontWeight: '800',
  },
  chartMeta: {
    color: '#6b7280',
    fontSize: 13,
  },
  chart: {
    marginLeft: -12,
    marginTop: 8,
  },
  pendingWithdrawalsList: {
    gap: 12,
    marginTop: 4,
  },
  pendingWithdrawalItem: {
    backgroundColor: '#f7f5ef',
    borderRadius: 16,
    gap: 8,
    padding: 14,
  },
  pendingWithdrawalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingWithdrawalAmount: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '800',
  },
  pendingWithdrawalMeta: {
    color: '#6b7280',
    fontSize: 13,
  },
  pendingWithdrawalReason: {
    color: '#132238',
    fontSize: 14,
    lineHeight: 20,
  },
  pendingWithdrawalButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#132238',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: 16,
  },
  pendingWithdrawalButtonDisabled: {
    opacity: 0.6,
  },
  pendingWithdrawalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

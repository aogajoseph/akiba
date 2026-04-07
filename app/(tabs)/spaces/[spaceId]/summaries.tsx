import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';

import {
  GetSpaceSummaryResponseDto,
  Group,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@shared/contracts';
import { maskPhoneNumber } from '@shared/phone';
import { getSpace, getSpaceSummary } from '../../../../services/spaceService';
import { ApiError } from '../../../../utils/api';

type TransactionGroup = {
  dateKey: string;
  label: string;
  transactions: Transaction[];
};

const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'KES 0';
  }

  return `KES ${amount.toLocaleString()}`;
};

const formatAmountWithSign = (transaction: Transaction): string => {
  const sign = transaction.type === TransactionType.DEPOSIT ? '+' : '-';
  return `${sign}${transaction.amount.toLocaleString()}`;
};

const formatTransactionDate = (createdAt: string): string => {
  return format(parseISO(createdAt), 'dd MMM yyyy');
};

const formatTransactionTime = (createdAt: string): string => {
  return format(parseISO(createdAt), 'HH:mm');
};

const formatTransactionType = (type: TransactionType): string => {
  if (type === TransactionType.DEPOSIT) {
    return 'Deposit';
  }

  if (type === TransactionType.WITHDRAWAL) {
    return 'Withdrawal';
  }

  return 'Fee';
};

const formatStatus = (status: TransactionStatus): string => {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildStatementContent = (
  spaceName: string,
  dateLabel: string,
  transactions: Transaction[],
): string => {
  const groupedLines = transactions.map((transaction) => {
    const typeLabel = formatTransactionType(transaction.type);
    const amountLabel = `${transaction.type === TransactionType.DEPOSIT ? '+' : '-'}KES ${transaction.amount.toLocaleString()}`;
    const timeLabel = formatTransactionTime(transaction.createdAt);
    const detailLines = [
      `${typeLabel}: ${amountLabel} (${timeLabel})`,
    ];

    if (transaction.recipientName) {
      const recipientPhone = transaction.recipientPhoneNumber
        ? ` (${maskPhoneNumber(transaction.recipientPhoneNumber)})`
        : '';
      detailLines.push(`Recipient: ${transaction.recipientName}${recipientPhone}`);
    }

    if (transaction.reason) {
      detailLines.push(`Reason: ${transaction.reason}`);
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      detailLines.push(`Status: ${formatStatus(transaction.status)}`);
    }

    return detailLines.join('\n');
  });

  const total = transactions.reduce((sum, transaction) => {
    if (transaction.type === TransactionType.DEPOSIT) {
      return sum + transaction.amount;
    }

    return sum - transaction.amount;
  }, 0);

  return [
    'Akiba Statement',
    `Space: ${spaceName}`,
    `Date: ${dateLabel}`,
    '',
    ...groupedLines,
    '',
    `Total: KES ${total.toLocaleString()}`,
  ].join('\n');
};

export default function SpaceSummariesScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Group | null>(null);
  const [data, setData] = useState<GetSpaceSummaryResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningDateKey, setActioningDateKey] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!spaceId) {
      setError('Missing space id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [spaceResponse, summaryResponse] = await Promise.all([
        getSpace(spaceId),
        getSpaceSummary(spaceId),
      ]);

      setSpace(spaceResponse.space ?? spaceResponse.group);
      setData(summaryResponse);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load summary');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const groupedTransactions = useMemo<TransactionGroup[]>(() => {
    const transactions = data?.transactions ?? [];
    const groups = transactions.reduce<Map<string, Transaction[]>>((map, transaction) => {
      const dateKey = formatTransactionDate(transaction.createdAt);
      const current = map.get(dateKey) ?? [];
      current.push(transaction);
      map.set(dateKey, current);
      return map;
    }, new Map());

    return Array.from(groups.entries()).map(([label, transactionsForDate]) => ({
      dateKey: label,
      label,
      transactions: transactionsForDate,
    }));
  }, [data?.transactions]);

  const writeStatementFile = useCallback(async (
    content: string,
    fileName: string,
    directory: string | null,
  ) => {
    const baseDirectory = directory ?? FileSystem.cacheDirectory;

    if (!baseDirectory) {
      throw new Error('Storage is not available on this device.');
    }

    await FileSystem.makeDirectoryAsync(baseDirectory, { intermediates: true }).catch(() => {});
    const fileUri = `${baseDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return fileUri;
  }, []);

  const handleShareGroup = useCallback(async (group: TransactionGroup) => {
    if (!space) {
      return;
    }

    setActioningDateKey(group.dateKey);

    try {
      const content = buildStatementContent(space.name, group.label, group.transactions);
      const fileUri = await writeStatementFile(
        content,
        `akiba-statement-${group.dateKey.replace(/\s+/g, '-').toLowerCase()}.txt`,
        FileSystem.cacheDirectory,
      );

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: `Share ${group.label} statement`,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to share statement.';
      Alert.alert('Share failed', message);
    } finally {
      setActioningDateKey(null);
    }
  }, [space, writeStatementFile]);

  const handleDownloadGroup = useCallback(async (group: TransactionGroup) => {
    if (!space) {
      return;
    }

    setActioningDateKey(group.dateKey);

    try {
      const content = buildStatementContent(space.name, group.label, group.transactions);
      const statementsDirectory = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}akiba-statements/`;
      const fileUri = await writeStatementFile(
        content,
        `statement-${group.dateKey.replace(/\s+/g, '-').toLowerCase()}.txt`,
        statementsDirectory,
      );

      Alert.alert('Saved', `Statement saved to:\n${fileUri}`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to download statement.';
      Alert.alert('Download failed', message);
    } finally {
      setActioningDateKey(null);
    }
  }, [space, writeStatementFile]);

  if (!spaceId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyText}>Invalid space</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Stack.Screen options={{ title: 'Summaries' }} />
        <ActivityIndicator color="#0f766e" size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Stack.Screen options={{ title: 'Summaries' }} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => { void loadSummary(); }} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Summaries' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Contributions</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(data?.summary.totalDeposits ?? 0)}
          </Text>

          <View style={styles.summaryBreakdown}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Akiba Service Charge (2.5%)</Text>
              <Text style={styles.summaryRowValue}>
                {formatCurrency(data?.summary.totalFees ?? 0)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Available for Withdrawal</Text>
              <Text style={styles.summaryRowValue}>
                {formatCurrency(data?.summary.availableBalance ?? data?.summary.netBalance ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {groupedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          groupedTransactions.map((group) => (
            <View key={group.dateKey} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.label}</Text>
                <View style={styles.groupActions}>
                  <Pressable
                    disabled={actioningDateKey === group.dateKey}
                    onPress={() => { void handleShareGroup(group); }}
                    style={[
                      styles.groupActionButton,
                      actioningDateKey === group.dateKey ? styles.groupActionButtonDisabled : null,
                    ]}>
                    <Text style={styles.groupActionButtonText}>Share</Text>
                  </Pressable>
                  <Pressable
                    disabled={actioningDateKey === group.dateKey}
                    onPress={() => { void handleDownloadGroup(group); }}
                    style={[
                      styles.groupActionButton,
                      actioningDateKey === group.dateKey ? styles.groupActionButtonDisabled : null,
                    ]}>
                    <Text style={styles.groupActionButtonText}>Download</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.transactionList}>
                {group.transactions.map((transaction) => {
                  const isDeposit = transaction.type === TransactionType.DEPOSIT;
                  const isPending = transaction.status !== TransactionStatus.COMPLETED;

                  return (
                    <View key={transaction.id} style={styles.transactionRow}>
                      <View style={styles.transactionPrimary}>
                        <Text
                          style={[
                            styles.transactionType,
                            isDeposit ? styles.depositText : styles.withdrawalText,
                          ]}>
                          {formatTransactionType(transaction.type)}
                        </Text>
                        <Text style={styles.transactionTime}>
                          {formatTransactionTime(transaction.createdAt)}
                        </Text>
                      </View>

                      <View style={styles.transactionSecondary}>
                        <Text
                          style={[
                            styles.transactionAmount,
                            isDeposit ? styles.depositText : styles.withdrawalText,
                          ]}>
                          {formatAmountWithSign(transaction)}
                        </Text>
                        <Text
                          style={[
                            styles.transactionStatus,
                            isPending ? styles.pendingText : null,
                          ]}>
                          {formatStatus(transaction.status)}
                        </Text>
                      </View>

                      {transaction.recipientName ? (
                        <Text style={styles.transactionDetail}>
                          {`→ ${transaction.recipientName}${
                            transaction.recipientPhoneNumber
                              ? ` (${maskPhoneNumber(transaction.recipientPhoneNumber)})`
                              : ''
                          }`}
                        </Text>
                      ) : null}

                      {transaction.reason ? (
                        <Text style={styles.transactionDetail}>{transaction.reason}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
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
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7f5ef',
    gap: 14,
  },
  summaryCard: {
    backgroundColor: '#0f766e',
    borderRadius: 20,
    padding: 20,
  },
  summaryLabel: {
    color: '#d1fae5',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryAmount: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 8,
  },
  summaryBreakdown: {
    gap: 10,
    marginTop: 16,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryRowLabel: {
    color: '#d1fae5',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  summaryRowValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  groupTitle: {
    color: '#132238',
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  groupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  groupActionButton: {
    alignItems: 'center',
    backgroundColor: '#edf4f2',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  groupActionButtonDisabled: {
    opacity: 0.6,
  },
  groupActionButtonText: {
    color: '#132238',
    fontSize: 13,
    fontWeight: '700',
  },
  transactionList: {
    gap: 10,
  },
  transactionRow: {
    backgroundColor: '#f7f5ef',
    borderRadius: 16,
    gap: 6,
    padding: 14,
  },
  transactionPrimary: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  transactionSecondary: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '700',
  },
  transactionTime: {
    color: '#6b7280',
    fontSize: 13,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  transactionStatus: {
    color: '#6b7280',
    fontSize: 13,
  },
  transactionDetail: {
    color: '#132238',
    fontSize: 13,
    lineHeight: 19,
  },
  depositText: {
    color: '#0f766e',
  },
  withdrawalText: {
    color: '#132238',
  },
  pendingText: {
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#132238',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: 18,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

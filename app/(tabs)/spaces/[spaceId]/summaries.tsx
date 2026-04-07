import { Ionicons } from '@expo/vector-icons';
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
import { getSpace, getSpaceSummary } from '../../../../services/spaceService';
import { ApiError } from '../../../../utils/api';

type StatementTransaction = Transaction & {
  displayDate: string;
  displayTime: string;
  membership: 'Member' | 'Non-member';
  monthDate: Date;
  monthKey: string;
  shortId: string;
};

type MonthStatementGroup = {
  label: string;
  monthDate: Date;
  transactions: StatementTransaction[];
};

const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'KES 0';
  }

  return `KES ${amount.toLocaleString()}`;
};

const formatSignedAmount = (transaction: Transaction): string => {
  const sign = transaction.type === TransactionType.DEPOSIT ? '+' : '-';
  return `${sign}KES ${transaction.amount.toLocaleString()}`;
};

const formatStatus = (status: TransactionStatus): string => {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatType = (type: TransactionType): string => {
  if (type === TransactionType.DEPOSIT) {
    return 'Deposit';
  }

  if (type === TransactionType.WITHDRAWAL) {
    return 'Withdrawal';
  }

  return 'Fee';
};

const buildStatementContent = (
  spaceName: string,
  monthLabel: string,
  transactions: StatementTransaction[],
): string => {
  const header =
    'TxID | Date | Time | Type | Amount | Status | Initiator | Membership | Balance';
  const separator = '-'.repeat(header.length);
  const rows = transactions.map((transaction) => {
    return [
      transaction.shortId,
      transaction.displayDate,
      transaction.displayTime,
      formatType(transaction.type),
      formatSignedAmount(transaction),
      formatStatus(transaction.status).toLowerCase(),
      transaction.initiatorName,
      transaction.membership,
      `KES ${(transaction.runningBalance ?? 0).toLocaleString()}`,
    ].join(' | ');
  });

  return [
    'Akiba Statement',
    `Space: ${spaceName}`,
    `Period: ${monthLabel}`,
    '',
    header,
    separator,
    ...rows,
  ].join('\n');
};

export default function SpaceSummariesScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Group | null>(null);
  const [data, setData] = useState<GetSpaceSummaryResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningMonth, setActioningMonth] = useState<string | null>(null);

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

  const monthlyGroups = useMemo<MonthStatementGroup[]>(() => {
    const sortedTransactions = [...(data?.transactions ?? [])].sort((left, right) => {
      return (
        parseISO(left.createdAt).getTime() - parseISO(right.createdAt).getTime()
      );
    });

    const enriched = sortedTransactions.map<StatementTransaction>((transaction) => {
      const createdAtDate = parseISO(transaction.createdAt);

      return {
        ...transaction,
        displayDate: format(createdAtDate, 'dd MMM'),
        displayTime: format(createdAtDate, 'HH:mm'),
        membership: transaction.userId ? 'Member' : 'Non-member',
        monthDate: createdAtDate,
        monthKey: format(createdAtDate, 'MMMM yyyy'),
        shortId: transaction.id.slice(0, 8),
      };
    });

    const groups = enriched.reduce<Map<string, MonthStatementGroup>>((map, transaction) => {
      const existing = map.get(transaction.monthKey);

      if (existing) {
        existing.transactions.push(transaction);
        return map;
      }

      map.set(transaction.monthKey, {
        label: transaction.monthKey,
        monthDate: transaction.monthDate,
        transactions: [transaction],
      });
      return map;
    }, new Map());

    return Array.from(groups.values()).sort((left, right) => {
      return right.monthDate.getTime() - left.monthDate.getTime();
    });
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

  const handleShareMonth = useCallback(async (group: MonthStatementGroup) => {
    if (!space) {
      return;
    }

    setActioningMonth(group.label);

    try {
      const content = buildStatementContent(space.name, group.label, group.transactions);
      const fileUri = await writeStatementFile(
        content,
        `akiba-statement-${group.label.replace(/\s+/g, '-').toLowerCase()}.txt`,
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
      setActioningMonth(null);
    }
  }, [space, writeStatementFile]);

  const handleDownloadMonth = useCallback(async (group: MonthStatementGroup) => {
    if (!space) {
      return;
    }

    setActioningMonth(group.label);

    try {
      const content = buildStatementContent(space.name, group.label, group.transactions);
      const statementsDirectory = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}akiba-statements/`;
      const fileUri = await writeStatementFile(
        content,
        `statement-${group.label.replace(/\s+/g, '-').toLowerCase()}.txt`,
        statementsDirectory,
      );

      Alert.alert('Saved', `Statement saved to:\n${fileUri}`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to download statement.';
      Alert.alert('Download failed', message);
    } finally {
      setActioningMonth(null);
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

        {monthlyGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          monthlyGroups.map((group) => (
            <View key={group.label} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>{group.label}</Text>
                <View style={styles.monthActions}>
                  <Pressable
                    accessibilityLabel={`Share ${group.label} statement`}
                    disabled={actioningMonth === group.label}
                    onPress={() => { void handleShareMonth(group); }}
                    style={[
                      styles.monthActionButton,
                      actioningMonth === group.label ? styles.monthActionButtonDisabled : null,
                    ]}>
                    <Ionicons color="#132238" name="share-social-outline" size={18} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Download ${group.label} statement`}
                    disabled={actioningMonth === group.label}
                    onPress={() => { void handleDownloadMonth(group); }}
                    style={[
                      styles.monthActionButton,
                      actioningMonth === group.label ? styles.monthActionButtonDisabled : null,
                    ]}>
                    <Ionicons color="#132238" name="download-outline" size={18} />
                  </Pressable>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.headerCell, styles.cellId]}>TxID</Text>
                    <Text style={[styles.headerCell, styles.cellDate]}>Date</Text>
                    <Text style={[styles.headerCell, styles.cellTime]}>Time</Text>
                    <Text style={[styles.headerCell, styles.cellType]}>Type</Text>
                    <Text style={[styles.headerCell, styles.cellAmount]}>Amount</Text>
                    <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
                    <Text style={[styles.headerCell, styles.cellInitiator]}>Initiator</Text>
                    <Text style={[styles.headerCell, styles.cellMembership]}>Membership</Text>
                    <Text style={[styles.headerCell, styles.cellBalance]}>Balance</Text>
                  </View>

                  {group.transactions.length === 0 ? (
                    <View style={styles.emptyTableRow}>
                      <Text style={styles.emptyTableText}>No transactions yet</Text>
                    </View>
                  ) : (
                    group.transactions.map((transaction) => {
                      const isDeposit = transaction.type === TransactionType.DEPOSIT;
                      const isPending =
                        transaction.status !== TransactionStatus.COMPLETED &&
                        transaction.status !== TransactionStatus.FAILED &&
                        transaction.status !== TransactionStatus.REJECTED;

                      return (
                        <View key={transaction.id} style={styles.tableRow}>
                          <Text style={[styles.bodyCell, styles.cellId]}>{transaction.shortId}</Text>
                          <Text style={[styles.bodyCell, styles.cellDate]}>
                            {transaction.displayDate}
                          </Text>
                          <Text style={[styles.bodyCell, styles.cellTime]}>
                            {transaction.displayTime}
                          </Text>
                          <Text
                            style={[
                              styles.bodyCell,
                              styles.cellType,
                              isDeposit ? styles.depositText : styles.withdrawalText,
                            ]}>
                            {formatType(transaction.type)}
                          </Text>
                          <Text
                            style={[
                              styles.bodyCell,
                              styles.cellAmount,
                              isDeposit ? styles.depositText : styles.withdrawalText,
                            ]}>
                            {formatSignedAmount(transaction)}
                          </Text>
                          <Text
                            style={[
                              styles.bodyCell,
                              styles.cellStatus,
                              isPending ? styles.pendingText : null,
                            ]}>
                            {formatStatus(transaction.status)}
                          </Text>
                          <Text style={[styles.bodyCell, styles.cellInitiator]} numberOfLines={2}>
                            {transaction.initiatorName}
                          </Text>
                          <Text style={[styles.bodyCell, styles.cellMembership]}>
                            {transaction.membership}
                          </Text>
                          <Text style={[styles.bodyCell, styles.cellBalance]}>
                            {formatCurrency(transaction.runningBalance ?? 0)}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
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
  monthSection: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthTitle: {
    color: '#132238',
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  monthActions: {
    flexDirection: 'row',
    gap: 8,
  },
  monthActionButton: {
    alignItems: 'center',
    backgroundColor: '#edf4f2',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
  },
  monthActionButtonDisabled: {
    opacity: 0.6,
  },
  table: {
    minWidth: 980,
  },
  tableHeaderRow: {
    backgroundColor: '#edf4f2',
  },
  tableRow: {
    alignItems: 'flex-start',
    borderBottomColor: '#e7dfd1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerCell: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '700',
  },
  bodyCell: {
    color: '#132238',
    fontSize: 12,
    lineHeight: 18,
  },
  cellId: {
    width: 70,
  },
  cellDate: {
    width: 72,
  },
  cellTime: {
    width: 56,
  },
  cellType: {
    width: 84,
  },
  cellAmount: {
    width: 100,
  },
  cellStatus: {
    width: 120,
  },
  cellInitiator: {
    width: 120,
  },
  cellMembership: {
    width: 92,
  },
  cellBalance: {
    width: 110,
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
  emptyTableRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  emptyTableText: {
    color: '#6b7280',
    fontSize: 13,
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

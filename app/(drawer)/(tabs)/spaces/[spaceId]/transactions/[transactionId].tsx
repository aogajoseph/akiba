import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Transaction, TransactionType } from '@shared/contracts';
import { maskPhoneNumber } from '@shared/phone';
import { getSpaceSummary } from '../../../../../../services/spaceService';
import { ApiError } from '../../../../../../utils/api';

const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'KES 0';
  }

  return `KES ${amount.toLocaleString()}`;
};

const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatType = (type: Transaction['type']): string => {
  if (type === TransactionType.DEPOSIT) {
    return 'Deposit';
  }

  if (type === TransactionType.WITHDRAWAL) {
    return 'Withdrawal';
  }

  return 'Fee';
};

export default function TransactionDetailScreen() {
  const { spaceId, transactionId } = useLocalSearchParams<{
    spaceId: string;
    transactionId: string;
  }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransaction = async () => {
      if (!spaceId || !transactionId) {
        setError('Missing transaction details.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getSpaceSummary(spaceId);
        const matchedTransaction =
          response.transactions.find((item) => item.id === transactionId) ?? null;

        if (!matchedTransaction) {
          setError('Transaction not found.');
          setTransaction(null);
          return;
        }

        setTransaction(matchedTransaction);
      } catch (caughtError) {
        const apiError = caughtError as ApiError;
        setError(apiError.error ?? 'Unable to load transaction.');
      } finally {
        setLoading(false);
      }
    };

    void loadTransaction();
  }, [spaceId, transactionId]);

  const createdAtLabel = useMemo(() => {
    if (!transaction?.createdAt) {
      return '';
    }

    return new Date(transaction.createdAt).toLocaleString();
  }, [transaction?.createdAt]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Transaction' }} />

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? <ActivityIndicator color="#0f766e" style={styles.loader} /> : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error && transaction ? (
          <View style={styles.card}>
            <Text style={styles.title}>{formatType(transaction.type)}</Text>
            <Text style={styles.amount}>{formatCurrency(transaction.amount)}</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{formatStatus(transaction.status)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Reference</Text>
              <Text style={styles.value}>{transaction.reference}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Initiator</Text>
              <Text style={styles.value}>{transaction.initiatorName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Created</Text>
              <Text style={styles.value}>{createdAtLabel}</Text>
            </View>

            {transaction.phoneNumber ? (
              <View style={styles.row}>
                <Text style={styles.label}>Phone</Text>
                <Text style={styles.value}>{maskPhoneNumber(transaction.phoneNumber)}</Text>
              </View>
            ) : null}

            {transaction.recipientName ? (
              <View style={styles.row}>
                <Text style={styles.label}>Recipient</Text>
                <Text style={styles.value}>{transaction.recipientName}</Text>
              </View>
            ) : null}

            {transaction.recipientPhoneNumber ? (
              <View style={styles.row}>
                <Text style={styles.label}>Recipient Phone</Text>
                <Text style={styles.value}>
                  {maskPhoneNumber(transaction.recipientPhoneNumber)}
                </Text>
              </View>
            ) : null}

            {transaction.reason ? (
              <View style={styles.reasonBlock}>
                <Text style={styles.label}>Reason</Text>
                <Text style={styles.reasonText}>{transaction.reason}</Text>
              </View>
            ) : null}
          </View>
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
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  title: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
  },
  amount: {
    color: '#0f766e',
    fontSize: 28,
    fontWeight: '800',
  },
  row: {
    gap: 4,
  },
  label: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    color: '#132238',
    fontSize: 15,
  },
  reasonBlock: {
    gap: 6,
  },
  reasonText: {
    color: '#132238',
    fontSize: 15,
    lineHeight: 22,
  },
});

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { normalizePhoneNumber } from '../../../../utils/phone';
import { createWithdrawal } from '../../../../services/spaceService';
import { ApiError } from '../../../../utils/api';

export default function WithdrawScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [amount, setAmount] = useState('');
  const [recipientPhoneNumber, setRecipientPhoneNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsedAmount = Number(amount.trim());
    let normalizedPhoneNumber = '';
    const normalizedRecipientName = recipientName.trim();
    const normalizedReason = reason.trim();

    if (!spaceId) {
      setError('Missing space id.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid withdrawal amount.');
      return;
    }

    try {
      normalizedPhoneNumber = normalizePhoneNumber(recipientPhoneNumber);
    } catch {
      setError('Enter a valid recipient phone number.');
      return;
    }

    if (!normalizedRecipientName) {
      setError('Enter the recipient name.');
      return;
    }

    if (!normalizedReason) {
      setError('Enter the withdrawal reason.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createWithdrawal(
        spaceId,
        parsedAmount,
        normalizedPhoneNumber,
        normalizedRecipientName,
        normalizedReason,
      );
      Alert.alert('Success', 'Withdrawal request submitted successfully.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Withdraw',
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Request Withdrawal</Text>
        <Text style={styles.subtitle}>Request to move funds from this space</Text>

        <View style={styles.form}>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setAmount}
            placeholder="Enter amount (KES)"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={amount}
          />

          <TextInput
            keyboardType="phone-pad"
            onChangeText={setRecipientPhoneNumber}
            placeholder="Recipient's Mpesa Number"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={recipientPhoneNumber}
          />

          <TextInput
            onChangeText={setRecipientName}
            placeholder="Recipient's Name"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={recipientName}
          />

          <TextInput
            multiline
            onChangeText={setReason}
            placeholder="Reason e.g., Deposit, Rent etc."
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.reasonInput]}
            textAlignVertical="top"
            value={reason}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            disabled={loading}
            onPress={() => { void handleSubmit(); }}
            style={[styles.button, loading ? styles.buttonDisabled : null]}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Submit Request</Text>
            )}
          </Pressable>
        </View>
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
    padding: 24,
    paddingTop: 32,
  },
  form: {
    gap: 14,
    marginTop: 24,
  },
  title: {
    color: '#132238',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d7dedb',
    borderRadius: 16,
    borderWidth: 1,
    color: '#132238',
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reasonInput: {
    minHeight: 112,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#132238',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

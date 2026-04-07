import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TransactionSource } from '@shared/contracts';
import { normalizePhoneNumber } from '../../../../utils/phone';
import { createDeposit } from '../../../../services/spaceService';
import { ApiError, getAuthSession } from '../../../../utils/api';

type PaymentState =
  | 'idle'
  | 'initiating'
  | 'stk_pending'
  | 'success'
  | 'failed';

export default function DepositScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [paymentMethod, setPaymentMethod] = useState<TransactionSource>(
    TransactionSource.MPESA,
  );
  const [phoneNumber, setPhoneNumber] = useState(
    getAuthSession()?.user.phoneNumber ?? '',
  );
  const [amount, setAmount] = useState('');
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSelectPaymentMethod = (method: TransactionSource) => {
    setPaymentMethod(method);
    setError(null);
  };

  useEffect(() => {
    if (paymentState !== 'stk_pending') {
      return;
    }

    const timeout = setTimeout(() => {
      const wasSuccessful = Math.random() < 0.9;
      setPaymentState(wasSuccessful ? 'success' : 'failed');
    }, 2800);

    return () => clearTimeout(timeout);
  }, [paymentState]);

  const handleSubmit = async () => {
    const parsedAmount = Number(amount.trim());
    let normalizedPhoneNumber = '';

    if (!spaceId) {
      setError('Missing space id.');
      return;
    }

    if (paymentMethod !== TransactionSource.MPESA) {
      setError('Card payments coming soon.');
      return;
    }

    try {
      normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    } catch {
      setError('Enter a valid M-Pesa phone number.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid deposit amount.');
      return;
    }

    setPaymentState('initiating');
    setError(null);

    try {
      await createDeposit(spaceId, parsedAmount, {
        phoneNumber: normalizedPhoneNumber,
        source: paymentMethod,
      });
      setPaymentState('stk_pending');
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to complete deposit.');
      setPaymentState('idle');
    }
  };

  const closeSuccessFlow = () => {
    setPaymentState('idle');
    router.back();
  };

  const resetPaymentFlow = () => {
    setPaymentState('idle');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Deposit',
        }}
      />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
        <Text style={styles.title}>Deposit</Text>
        <Text style={styles.subtitle}>Add funds to this space</Text>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodSelector}>
              <Pressable
                onPress={() => handleSelectPaymentMethod(TransactionSource.MPESA)}
                style={[
                  styles.methodOption,
                  paymentMethod === TransactionSource.MPESA ? styles.methodOptionActive : null,
                ]}>
                <Text
                  style={[
                    styles.methodOptionText,
                    paymentMethod === TransactionSource.MPESA
                      ? styles.methodOptionTextActive
                      : null,
                  ]}>
                  Mpesa
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSelectPaymentMethod(TransactionSource.CARD)}
                style={[
                  styles.methodOption,
                  styles.methodOptionDisabled,
                  paymentMethod === TransactionSource.CARD ? styles.methodOptionActive : null,
                ]}>
                <Text
                  style={[
                    styles.methodOptionText,
                    paymentMethod === TransactionSource.CARD
                      ? styles.methodOptionTextActive
                      : null,
                  ]}>
                  Credit Card
                </Text>
                <Text style={styles.methodOptionCaption}>(Coming soon)</Text>
              </Pressable>
            </View>
          </View>

          {paymentMethod === TransactionSource.MPESA ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>M-Pesa Phone Number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="07XXXXXXXX"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={phoneNumber}
              />
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>Credit Card</Text>
              <Text style={styles.placeholderText}>Credit card payments coming soon</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setAmount}
              placeholder="Enter amount (KES)"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={amount}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            disabled={paymentState !== 'idle' || paymentMethod !== TransactionSource.MPESA}
            onPress={() => { void handleSubmit(); }}
            style={[
              styles.button,
              paymentState !== 'idle' || paymentMethod !== TransactionSource.MPESA
                ? styles.buttonDisabled
                : null,
            ]}>
            <Text style={styles.buttonText}>Confirm Deposit</Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={paymentState !== 'idle'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {paymentState === 'initiating' ? (
              <>
                <ActivityIndicator color="#0f766e" />
                <Text style={styles.modalTitle}>Sending request...</Text>
              </>
            ) : null}

            {paymentState === 'stk_pending' ? (
              <>
                <ActivityIndicator color="#0f766e" />
                <Text style={styles.modalTitle}>M-Pesa Payment Request Sent</Text>
                <Text style={styles.modalText}>
                  Check your phone and enter your M-Pesa PIN to complete the payment.
                </Text>
              </>
            ) : null}

            {paymentState === 'success' ? (
              <>
                <Text style={styles.modalTitle}>Payment Successful</Text>
                <Text style={styles.modalText}>Your deposit has been received.</Text>
                <Pressable onPress={closeSuccessFlow} style={styles.button}>
                  <Text style={styles.buttonText}>Done</Text>
                </Pressable>
              </>
            ) : null}

            {paymentState === 'failed' ? (
              <>
                <Text style={styles.modalTitle}>Payment Failed</Text>
                <Text style={styles.modalText}>The transaction was not completed.</Text>
                <View style={styles.modalActions}>
                  <Pressable onPress={resetPaymentFlow} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Try Again</Text>
                  </Pressable>
                  <Pressable onPress={resetPaymentFlow} style={styles.button}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
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
  contentContainer: {
    flexGrow: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 32,
  },
  form: {
    gap: 14,
    marginTop: 24,
  },
  fieldGroup: {
    gap: 8,
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
  label: {
    color: '#132238',
    fontSize: 14,
    fontWeight: '600',
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  methodOption: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d7dedb',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    gap: 2,
    paddingHorizontal: 16,
  },
  methodOptionActive: {
    borderColor: '#0f766e',
    backgroundColor: '#eefaf8',
  },
  methodOptionDisabled: {
    opacity: 0.55,
  },
  methodOptionText: {
    color: '#132238',
    fontSize: 14,
    fontWeight: '600',
  },
  methodOptionTextActive: {
    color: '#0f766e',
  },
  methodOptionCaption: {
    color: '#6b7280',
    fontSize: 12,
  },
  placeholderCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d7dedb',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    minHeight: 96,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  placeholderTitle: {
    color: '#132238',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 14,
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
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(19, 34, 56, 0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    gap: 14,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    color: '#132238',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalActions: {
    gap: 12,
    width: '100%',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e7dfd1',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '700',
  },
});

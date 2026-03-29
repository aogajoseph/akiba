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

import { createDeposit } from '../../../../services/spaceService';
import { ApiError } from '../../../../utils/api';

export default function DepositScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsedAmount = Number(amount.trim());

    if (!spaceId) {
      setError('Missing space id.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid deposit amount.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createDeposit(spaceId, parsedAmount);
      setSubmitted(true);
      Alert.alert('Deposit started', 'Pending deposit confirmation. This may take a few seconds.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to complete deposit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Deposit',
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Deposit</Text>
        <Text style={styles.subtitle}>Add funds to this space</Text>

        <View style={styles.form}>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setAmount}
            placeholder="Enter amount (KES)"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={amount}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            disabled={loading || submitted}
            onPress={() => { void handleSubmit(); }}
            style={[styles.button, loading || submitted ? styles.buttonDisabled : null]}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                {submitted ? 'Awaiting Confirmation...' : 'Confirm Deposit'}
              </Text>
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

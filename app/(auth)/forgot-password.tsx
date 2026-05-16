import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AuthBrand from '../../src/components/auth/AuthBrand';
import { requestPasswordReset } from '../../services/authService';
import { ApiError } from '../../utils/api';

const RESEND_COOLDOWN_SECONDS = 30;

export default function ForgotPasswordScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [cooldown]);

  const handleSubmit = async () => {
    if (cooldown > 0 || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await requestPasswordReset({
        phoneNumber: phoneNumber.trim(),
      });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      router.push({
        pathname: '/(auth)/reset-password',
        params: {
          phoneNumber: phoneNumber.trim(),
        },
      });
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to send a reset code right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.container}>
        <View style={styles.card}>
          <AuthBrand color="#0f766e" />
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your phone number and we&apos;ll send you a verification code on WhatsApp.
          </Text>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="+254700000000"
                placeholderTextColor="#7c8b9b"
                style={styles.input}
                value={phoneNumber}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              disabled={loading || cooldown > 0}
              onPress={() => {
                void handleSubmit();
              }}
              style={({ pressed }) => [
                styles.button,
                pressed && !loading && cooldown === 0 ? styles.buttonPressed : null,
                loading || cooldown > 0 ? styles.buttonDisabled : null,
              ]}>
              {loading ? (
                <ActivityIndicator color="#f7f3ea" />
              ) : (
                <Text style={styles.buttonText}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send OTP'}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remembered your password?</Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Log in
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef4f0',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  title: {
    color: '#132238',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 10,
  },
  subtitle: {
    color: '#526172',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    gap: 16,
    marginTop: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#132238',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#edf3ef',
    borderColor: '#d6e2db',
    borderRadius: 16,
    borderWidth: 1,
    color: '#132238',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#f7fffd',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#526172',
    fontSize: 14,
  },
  footerLink: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '700',
  },
});

import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { requestPasswordReset, verifyPasswordReset } from '../../services/authService';
import { ApiError } from '../../utils/api';

const RESEND_COOLDOWN_SECONDS = 30;

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ phoneNumber?: string }>();
  const [phoneNumber, setPhoneNumber] = useState(params.phoneNumber ?? '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [cooldown]);

  const passwordsMatch = useMemo(() => {
    return confirmPassword.length > 0 && confirmPassword === newPassword;
  }, [confirmPassword, newPassword]);

  const handleResend = async () => {
    if (!phoneNumber.trim() || cooldown > 0 || resending) {
      return;
    }

    setResending(true);
    setError(null);

    try {
      await requestPasswordReset({
        phoneNumber: phoneNumber.trim(),
      });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to resend the reset code.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await verifyPasswordReset({
        newPassword,
        otp: otp.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      setSuccess('Password updated. You can log in now.');
      router.replace('/(auth)/login');
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to reset your password right now.');
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
          <Text style={styles.title}>Enter your reset code</Text>
          <Text style={styles.subtitle}>
            Confirm the WhatsApp OTP and choose a new password.
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

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>OTP code</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setOtp}
                placeholder="6-digit code"
                placeholderTextColor="#7c8b9b"
                style={styles.input}
                value={otp}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New password</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                placeholderTextColor="#7c8b9b"
                secureTextEntry
                style={styles.input}
                value={newPassword}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                placeholderTextColor="#7c8b9b"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
              />
              {confirmPassword.length > 0 && !passwordsMatch ? (
                <Text style={styles.errorText}>Passwords do not match.</Text>
              ) : null}
            </View>

            <View style={styles.inlineActionRow}>
              <Pressable disabled={cooldown > 0 || resending} onPress={() => { void handleResend(); }}>
                <Text style={[styles.inlineActionLink, cooldown > 0 || resending ? styles.inlineActionDisabled : null]}>
                  {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <Pressable
              disabled={loading}
              onPress={() => {
                void handleSubmit();
              }}
              style={({ pressed }) => [
                styles.button,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}>
              {loading ? (
                <ActivityIndicator color="#f7f3ea" />
              ) : (
                <Text style={styles.buttonText}>Reset password</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Need to go back?</Text>
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
  inlineActionRow: {
    alignItems: 'flex-end',
  },
  inlineActionLink: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineActionDisabled: {
    opacity: 0.55,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: '#0f766e',
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

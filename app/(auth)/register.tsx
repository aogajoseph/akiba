import { Link, router } from 'expo-router';
import { useState } from 'react';
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

import { RegisterRequestDto } from '../../../shared/contracts';
import { register } from '../../services/authService';
import { ApiError } from '../../utils/api';

export default function RegisterScreen() {
  const [form, setForm] = useState<RegisterRequestDto>({
    name: '',
    phoneNumber: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof RegisterRequestDto, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await register({
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
      });
      router.replace('/spaces');
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to register right now.');
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
          <Text style={styles.eyebrow}>Akiba</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start saving together in shared spaces.</Text>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={(value) => handleChange('name', value)}
                placeholder="Jane Doe"
                placeholderTextColor="#7c8b9b"
                style={styles.input}
                value={form.name}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={(value) => handleChange('phoneNumber', value)}
                placeholder="+254700000000"
                placeholderTextColor="#7c8b9b"
                style={styles.input}
                value={form.phoneNumber}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              disabled={loading}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.button,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}>
              {loading ? (
                <ActivityIndicator color="#f7f3ea" />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
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
    backgroundColor: '#f4efe6',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fffaf1',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#1f2937',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  eyebrow: {
    color: '#9a5d22',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: '#132238',
    fontSize: 30,
    fontWeight: '800',
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
    backgroundColor: '#f5ede0',
    borderColor: '#eadbc4',
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
    backgroundColor: '#164e63',
    borderRadius: 16,
    minHeight: 52,
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#f7f3ea',
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
    color: '#164e63',
    fontSize: 14,
    fontWeight: '700',
  },
});

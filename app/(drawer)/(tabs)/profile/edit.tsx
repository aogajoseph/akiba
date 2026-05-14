import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { updateProfile } from '@/services/authService';
import { useAuthStore } from '@/src/store/authStore';
import { ApiError } from '@/utils/api';

export default function EditProfileScreen() {
  const sessionUser = useAuthStore((state) => state.session?.user ?? null);
  const [name, setName] = useState(sessionUser?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    setName(sessionUser?.name ?? '');
  }, [sessionUser?.name]);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const canSave = trimmedName.length > 0 && !saving && trimmedName !== (sessionUser?.name ?? '');

  const handleSave = async () => {
    if (!canSave) {
      if (!trimmedName) {
        setError('Display name is required.');
      }
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({
        name: trimmedName,
      });
      setSuccess('Profile updated successfully.');
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>
            Update the display name shown to members across your spaces.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setName}
              placeholder="Jane Doe"
              placeholderTextColor="#94a3b8"
              ref={inputRef}
              style={styles.input}
              value={name}
            />
          </View>

          <View style={styles.readOnlyCard}>
            <Text style={styles.readOnlyLabel}>Phone Number</Text>
            <Text style={styles.readOnlyValue}>{sessionUser?.phoneNumber ?? 'Not available'}</Text>
            <Text style={styles.readOnlyHint}>Phone number changes are not available yet.</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          <Pressable
            disabled={!canSave}
            onPress={() => {
              void handleSave();
            }}
            style={({ pressed }) => [
              styles.button,
              pressed && canSave ? styles.buttonPressed : null,
              !canSave ? styles.buttonDisabled : null,
            ]}>
            {saving ? (
              <ActivityIndicator color="#f7fffd" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    padding: 20,
  },
  title: {
    color: '#132238',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#526172',
    fontSize: 14,
    lineHeight: 21,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#132238',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f5f7fa',
    borderColor: '#d8e1ea',
    borderRadius: 16,
    borderWidth: 1,
    color: '#132238',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readOnlyCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  readOnlyLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  readOnlyValue: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '700',
  },
  readOnlyHint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '600',
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
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#f7fffd',
    fontSize: 16,
    fontWeight: '700',
  },
});

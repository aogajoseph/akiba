import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { updateProfile } from '@/services/authService';
import AppAvatar from '@/src/components/identity/AppAvatar';
import AvatarViewerModal from '@/src/components/identity/AvatarViewerModal';
import { useUsernameAvailability } from '@/src/hooks/useUsernameAvailability';
import { uploadImageToCloudinary } from '@/src/services/cloudinary';
import { useAuthStore } from '@/src/store/authStore';
import { ApiError } from '@/utils/api';

export default function EditProfileScreen() {
  const sessionUser = useAuthStore((state) => state.session?.user ?? null);
  const [username, setUsername] = useState(sessionUser?.username ?? '');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(sessionUser?.avatarUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const availability = useUsernameAvailability(username, {
    initialUsername: sessionUser?.username,
  });

  useEffect(() => {
    setUsername(sessionUser?.username ?? '');
    setAvatarUrl(sessionUser?.avatarUrl ?? null);
    setLocalAvatarUri(null);
  }, [sessionUser?.avatarUrl, sessionUser?.username]);

  const trimmedUsername = useMemo(() => username.trim().toLowerCase(), [username]);
  const normalizedUsername = trimmedUsername || sessionUser?.username || 'username';
  const displayAvatarUri = localAvatarUri ?? avatarUrl;
  const avatarChanged = displayAvatarUri !== (sessionUser?.avatarUrl ?? null);
  const hasPendingImageUpload =
    localAvatarUri !== null && !/^https?:\/\//i.test(localAvatarUri);
  const canSave =
    trimmedUsername.length > 0 &&
    !saving &&
    (trimmedUsername !== (sessionUser?.username ?? '') || avatarChanged);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to choose a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'] as const,
      quality: 1,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setLocalAvatarUri(result.assets[0].uri);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (availability.validationError) {
      setError(availability.validationError);
      return;
    }

    if (availability.available === false) {
      setError('That username is already taken.');
      return;
    }

    if (!canSave) {
      if (!trimmedUsername) {
        setError('Username is required.');
      }
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let finalAvatarUrl = avatarUrl;

      if (localAvatarUri && !/^https?:\/\//i.test(localAvatarUri)) {
        finalAvatarUrl = await uploadImageToCloudinary(localAvatarUri);
      } else if (localAvatarUri) {
        finalAvatarUrl = localAvatarUri;
      }

      await updateProfile({
        username: trimmedUsername,
        avatarUrl: finalAvatarUrl,
      });
      setAvatarUrl(finalAvatarUrl ?? null);
      setLocalAvatarUri(null);
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
            Update how people see you on Akiba.
          </Text>

          <View style={styles.avatarSection}>
            <Pressable
              onPress={() => {
                if (displayAvatarUri) {
                  setAvatarViewerVisible(true);
                } else {
                  void handlePickAvatar();
                }
              }}
              style={styles.avatarButton}>
              {displayAvatarUri ? (
                <Image source={{ uri: displayAvatarUri }} style={styles.avatarImage} />
              ) : (
                <AppAvatar size="xlarge" username={normalizedUsername} />
              )}
            </Pressable>
            <Text style={styles.avatarTitle}>Profile picture</Text>
            <Text style={styles.avatarHint}>
              A profile photo helps other users recognize you more easily in spaces and chats.
            </Text>
            <Pressable
              onPress={() => {
                void handlePickAvatar();
              }}
              style={styles.avatarAction}>
              <Text style={styles.avatarActionText}>
                {displayAvatarUri ? 'Update profile picture' : 'Upload Image'}
              </Text>
            </Pressable>
            {hasPendingImageUpload ? (
              <Text style={styles.neutralText}>Selected image will upload when you save.</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Current username</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setUsername}
              placeholder="jane.doe"
              placeholderTextColor="#94a3b8"
              ref={inputRef}
              style={styles.input}
              value={username}
            />
            <Text style={styles.readOnlyHint}>
              This is the name people see across spaces and chats. Use 3-20 lowercase letters, numbers, underscores or periods.
            </Text>
            {availability.validationError ? (
              <Text style={styles.errorText}>{availability.validationError}</Text>
            ) : availability.checking ? (
              <Text style={styles.neutralText}>Checking username...</Text>
            ) : availability.available === true && trimmedUsername !== (sessionUser?.username ?? '') ? (
              <Text style={styles.successText}>Username available.</Text>
            ) : availability.available === false ? (
              <>
                <Text style={styles.errorText}>That username is already taken.</Text>
                {availability.suggestions.length > 0 ? (
                  <View style={styles.suggestionsRow}>
                    {availability.suggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        onPress={() => setUsername(suggestion)}
                        style={styles.suggestionChip}>
                        <Text style={styles.suggestionChipText}>@{suggestion}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
            {availability.error ? <Text style={styles.errorText}>{availability.error}</Text> : null}
          </View>

          <View style={styles.readOnlyCard}>
            <Text style={styles.readOnlyLabel}>Phone Number</Text>
            <Text style={styles.readOnlyValue}>{sessionUser?.phoneNumber ?? 'Not available'}</Text>
            <Text style={styles.readOnlyHint}>Phone number change functionality coming soon.</Text>
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

      <AvatarViewerModal
        avatarUrl={displayAvatarUri}
        onClose={() => setAvatarViewerVisible(false)}
        username={normalizedUsername}
        visible={avatarViewerVisible}
      />
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
  avatarSection: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
  },
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  avatarEditOverlay: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    bottom: -2,
    elevation: 2,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    shadowColor: '#132238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    width: 32,
  },
  avatarTitle: {
    color: '#132238',
    fontSize: 16,
    fontWeight: '700',
  },
  avatarHint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  avatarAction: {
    backgroundColor: '#edf7f5',
    borderColor: '#cde8e3',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  avatarActionText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
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
  neutralText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  suggestionChip: {
    backgroundColor: '#edf7f5',
    borderColor: '#cde8e3',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionChipText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
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

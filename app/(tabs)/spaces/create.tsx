import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createSpace } from '../../../services/spaceService';
import { ApiError } from '../../../utils/api';

export default function CreateSpaceScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [approvalThreshold, setApprovalThreshold] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = name.trim().length > 0 && !loading;

  const avatarInitials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to choose a space image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setSelectedImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createSpace({
        name: name.trim(),
        description: description.trim() || undefined,
        image: selectedImageUri ?? undefined,
        approvalThreshold: Number(approvalThreshold || 1),
      });

      const nextSpace = response.space ?? response.group;
      router.replace(`/(tabs)/spaces/${nextSpace.id}`);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to create this space.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        style={styles.container}>
        <Text style={styles.title}>Create Space</Text>
        <Text style={styles.subtitle}>Set up a new savings space for your people.</Text>

        <View style={styles.avatarSection}>
          <Pressable onPress={() => { void handlePickAvatar(); }} style={styles.avatarButton}>
            {selectedImageUri ? (
              <ExpoImage
                contentFit="cover"
                source={{ uri: selectedImageUri }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                {avatarInitials ? (
                  <Text style={styles.avatarInitials}>{avatarInitials}</Text>
                ) : (
                  <Ionicons color="#0f766e" name="image-outline" size={28} />
                )}
              </View>
            )}
          </Pressable>
          <Text style={styles.avatarHint}>Tap to add a space image</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Space Name</Text>
            <TextInput
              onChangeText={setName}
              placeholder="Weekend Chama"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={name}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Space Description</Text>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={setDescription}
              placeholder="What is this space about?"
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={description}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Admins to Approve</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setApprovalThreshold}
              placeholder="2 or 3"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={approvalThreshold}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.button, !canSubmit ? styles.buttonDisabled : null]}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Create Space</Text>
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
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    color: '#132238',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 6,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
  },
  avatarButton: {
    alignItems: 'center',
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    borderColor: '#b7e4d7',
    borderRadius: 48,
    borderWidth: 1,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  avatarImage: {
    borderRadius: 48,
    height: '100%',
    width: '100%',
  },
  avatarInitials: {
    color: '#0f766e',
    fontSize: 28,
    fontWeight: '700',
  },
  avatarHint: {
    color: '#6b7280',
    fontSize: 13,
  },
  form: {
    gap: 18,
    marginTop: 28,
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
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 16,
    borderWidth: 1,
    color: '#132238',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
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
    opacity: 0.55,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Group } from '@shared/contracts';
import { deleteSpace, getSpace, updateSpace } from '../../../../../services/spaceService';
import { ApiError, getAuthSession } from '../../../../../utils/api';

const isPersistableImageUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

export default function SpaceSettingsScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [persistedImageUrl, setPersistedImageUrl] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeletingSpace, setIsDeletingSpace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = getAuthSession()?.user.id ?? null;
  const nameInputRef = useRef<TextInput | null>(null);
  const descriptionInputRef = useRef<TextInput | null>(null);
  const targetAmountInputRef = useRef<TextInput | null>(null);
  const canSubmit = name.trim().length > 0 && !loading && !saving;
  const isCreator = currentUserId !== null && currentUserId === space?.createdByUserId;
  const formattedDeadline = deadlineDate
    ? deadlineDate.toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const avatarInitials = useMemo(() => {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }, [name]);
  const hasLocalPreviewImage = selectedImageUri?.startsWith('file://') ?? false;

  const applySpaceToForm = (nextSpace: Group) => {
    setSpace(nextSpace);
    setName(nextSpace.name);
    setDescription(nextSpace.description ?? '');
    setTargetAmount(nextSpace.targetAmount !== undefined ? String(nextSpace.targetAmount) : '');
    setDeadlineDate(nextSpace.deadline ? new Date(nextSpace.deadline) : null);
    setSelectedImageUri(nextSpace.imageUrl ?? null);
    setPersistedImageUrl(nextSpace.imageUrl ?? null);
  };

  const loadSpace = async () => {
    if (!spaceId) {
      setError('Missing space id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getSpace(spaceId);
      const nextSpace = response.space ?? response.group;
      applySpaceToForm(nextSpace);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to load this space.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSpace();
  }, [spaceId]);

  useEffect(() => {
    if (!loading && space && !isCreator) {
      router.replace(`/spaces/${spaceId}`);
    }
  }, [isCreator, loading, space, spaceId]);

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

  const handleSave = async () => {
    if (!spaceId || !canSubmit) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedTargetAmount = targetAmount.trim();
    const parsedTargetAmount = trimmedTargetAmount ? Number(trimmedTargetAmount) : undefined;

    if (!trimmedName) {
      setError('Space name is required.');
      return;
    }

    if (
      trimmedTargetAmount &&
      (!Number.isFinite(parsedTargetAmount) || (parsedTargetAmount ?? 0) <= 0)
    ) {
      setError('Target amount must be a positive number.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const nextImageUrl =
        selectedImageUri && isPersistableImageUrl(selectedImageUri)
          ? selectedImageUri
          : undefined;
      const response = await updateSpace(spaceId, {
        name: trimmedName,
        description: trimmedDescription || undefined,
        targetAmount: parsedTargetAmount,
        deadline: deadlineDate ? deadlineDate.toISOString() : undefined,
        imageUrl: nextImageUrl,
      });
      const updatedSpace = response.space ?? response.group;

      applySpaceToForm(updatedSpace);

      router.back();
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to update space.');
    } finally {
      setSaving(false);
    }
  };

  const performDeleteSpace = async () => {
    if (!spaceId) {
      return;
    }

    setIsDeletingSpace(true);
    setError(null);

    try {
      const response = await deleteSpace(spaceId);

      if (response.success) {
        Alert.alert('Success', 'Space deleted successfully');

        setTimeout(() => {
          router.replace('/spaces');
        }, 500);
      }
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.error ?? 'Unable to delete this space.');
    } finally {
      setIsDeletingSpace(false);
    }
  };

  const confirmDeleteSpace = () => {
    if (!spaceId || isDeletingSpace) {
      return;
    }

    Alert.alert(
      'Delete Space',
      'This action cannot be undone. Are you sure you want to delete this space?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void performDeleteSpace();
          },
        },
      ],
    );
  };

  if (!loading && space && !isCreator) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Space Settings',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        style={styles.container}>
        <Text style={styles.title}>Space Settings</Text>
        <Text style={styles.subtitle}>Update your space details</Text>

        {loading ? <ActivityIndicator color="#0f766e" style={styles.loader} /> : null}

        {!loading ? (
          <>
            <View style={styles.avatarSection}>
              <Pressable onPress={() => { void handlePickAvatar(); }} style={styles.avatarButton}>
                <View style={styles.avatarContainer}>
                  {selectedImageUri ? (
                    <Image source={{ uri: selectedImageUri }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      {avatarInitials ? (
                        <Text style={styles.avatarInitials}>{avatarInitials}</Text>
                      ) : (
                        <Ionicons color="#0f766e" name="image-outline" size={28} />
                      )}
                    </View>
                  )}

                  <Pressable
                    onPress={() => { void handlePickAvatar(); }}
                    style={styles.avatarEditOverlay}>
                    <Feather color="#132238" name="edit-2" size={14} />
                  </Pressable>
                </View>
              </Pressable>
              <Text style={styles.avatarHint}>Tap to update the space image</Text>
              {hasLocalPreviewImage ? (
                <Text style={styles.helperText}>
                  Preview only - image upload coming soon
                </Text>
              ) : null}
              {hasLocalPreviewImage ? (
                <Text style={styles.helperText}>
                  Image upload not supported yet. Current image will remain unchanged.
                </Text>
              ) : null}
              <Text style={styles.helperText}>
                Withdrawal governance is system-managed and unlocks after 3 admins are assigned.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Space Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={nameInputRef}
                    onChangeText={setName}
                    placeholder="Weekend Chama"
                    placeholderTextColor="#94a3b8"
                    style={[styles.input, styles.inputWithIcon]}
                    value={name}
                  />
                  <Pressable
                    onPress={() => nameInputRef.current?.focus()}
                    style={styles.inputIcon}>
                    <Feather color="#6b7280" name="edit-2" size={16} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Space Description</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    multiline
                    numberOfLines={3}
                    onChangeText={setDescription}
                    placeholder="What is this space about?"
                    placeholderTextColor="#94a3b8"
                    ref={descriptionInputRef}
                    style={[styles.input, styles.inputWithIcon, styles.textArea]}
                    textAlignVertical="top"
                    value={description}
                  />
                  <Pressable
                    onPress={() => descriptionInputRef.current?.focus()}
                    style={styles.inputIcon}>
                    <Feather color="#6b7280" name="edit-2" size={16} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Target Amount</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputWithPrefix}>
                    <Text style={styles.inputPrefix}>KES</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => {
                        setTargetAmount(value.replace(/[^\d]/g, ''));
                      }}
                      placeholder="50,000"
                      placeholderTextColor="#94a3b8"
                      ref={targetAmountInputRef}
                      style={styles.prefixedInput}
                      value={targetAmount}
                    />
                  </View>
                  <Pressable
                    onPress={() => targetAmountInputRef.current?.focus()}
                    style={styles.inputIcon}>
                    <Feather color="#6b7280" name="edit-2" size={16} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Deadline</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.inputWrapper, styles.input, styles.dateInputButton]}>
                  <Text
                    style={[
                      styles.dateInputText,
                      formattedDeadline ? styles.dateInputValue : styles.dateInputPlaceholder,
                    ]}>
                    {formattedDeadline ?? 'Select deadline (optional)'}
                  </Text>
                  <View style={styles.inputIcon}>
                    <Feather color="#6b7280" name="edit-2" size={16} />
                  </View>
                </Pressable>

                {deadlineDate ? (
                  <Pressable onPress={() => setDeadlineDate(null)}>
                    <Text style={styles.clearText}>Remove deadline</Text>
                  </Pressable>
                ) : null}
              </View>

              {showDatePicker ? (
                <DateTimePicker
                  display="default"
                  minimumDate={new Date()}
                  mode="date"
                  onChange={(_event, selectedDate) => {
                    setShowDatePicker(false);

                    if (selectedDate) {
                      setDeadlineDate(selectedDate);
                    }
                  }}
                  value={deadlineDate ?? new Date()}
                />
              ) : null}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                disabled={!canSubmit}
                onPress={() => {
                  void handleSave();
                }}
                style={[styles.button, !canSubmit ? styles.buttonDisabled : null]}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </Pressable>

              {isCreator ? (
                <Pressable
                  disabled={isDeletingSpace}
                  onPress={confirmDeleteSpace}
                  style={[styles.deleteButton, isDeletingSpace ? styles.buttonDisabled : null]}>
                  <Text style={styles.deleteButtonText}>
                    {isDeletingSpace ? 'Deleting...' : 'Delete Space'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
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
  loader: {
    marginTop: 24,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
  },
  avatarContainer: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  avatarButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    borderColor: '#b7e4d7',
    borderRadius: 999,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarImage: {
    borderRadius: 999,
    height: 72,
    width: 72,
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
  helperText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },
  avatarEditOverlay: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 0,
    padding: 6,
    position: 'absolute',
    right: 0,
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
  inputWrapper: {
    justifyContent: 'center',
    position: 'relative',
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
  inputWithIcon: {
    paddingRight: 44,
  },
  inputWithPrefix: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 40,
  },
  inputPrefix: {
    color: '#132238',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
  prefixedInput: {
    color: '#132238',
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  inputIcon: {
    height: '100%',
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  dateInputButton: {
    justifyContent: 'center',
    minHeight: 52,
  },
  dateInputText: {
    paddingRight: 28,
    fontSize: 16,
  },
  dateInputValue: {
    color: '#132238',
  },
  dateInputPlaceholder: {
    color: '#94a3b8',
  },
  clearText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '600',
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
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#b42318',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

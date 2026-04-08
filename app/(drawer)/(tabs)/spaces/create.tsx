import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CreateGroupRequestDto } from '../../../../../shared/contracts';
import { createSpace } from '../../../../services/spaceService';
import { ApiError } from '../../../../utils/api';

export default function CreateSpaceScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [approvalThreshold, setApprovalThreshold] = useState('');
  const [hasGoal, setHasGoal] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = name.trim().length > 0 && !loading;
  const formattedDeadline = deadlineDate
    ? deadlineDate.toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

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
      const payload: CreateGroupRequestDto = {
        name: name.trim(),
        description: description.trim() || undefined,
        image: selectedImageUri ?? undefined,
        approvalThreshold: Number(approvalThreshold || 1),
      };

      if (hasGoal) {
        const normalizedTargetAmount = targetAmount.trim();

        if (normalizedTargetAmount) {
          payload.targetAmount = Number(normalizedTargetAmount);
        }

        if (deadlineDate) {
          payload.deadline = deadlineDate.toISOString();
        }
      }

      const response = await createSpace(payload);

      const nextSpace = response.space ?? response.group;
      router.replace(`/spaces/${nextSpace.id}`);
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
        <Text style={styles.subtitle}>Spaces bring people together to save for events, needs and shared goals.</Text>

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
          <Text style={styles.avatarHint}>Add an image for the Space</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Space Name</Text>
            <TextInput
              onChangeText={setName}
              placeholder="eg., John’s Wedding"
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
              placeholder="eg., We are coming together to support John and Susan in their wedding."
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={description}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Admins (To approve withdrawals)</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setApprovalThreshold}
              placeholder="2 or 3"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={approvalThreshold}
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.goalToggleRow}>
              <View style={styles.goalToggleText}>
                <Text style={styles.label}>Set goals for this space (optional)</Text>
                <Text style={styles.helperText}>
                  Useful for events (weddings, trips, fundraisers etc.,)
                </Text>
              </View>

              <Switch
                onValueChange={setHasGoal}
                thumbColor="#ffffff"
                trackColor={{ false: '#d1d5db', true: '#0f766e' }}
                value={hasGoal}
              />
            </View>
          </View>

          {hasGoal ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Target Amount</Text>
                <View style={styles.inputWithPrefix}>
                  <Text style={styles.inputPrefix}>KES</Text>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={(value) => {
                      setTargetAmount(value.replace(/[^\d]/g, ''));
                    }}
                    placeholder="50,000"
                    placeholderTextColor="#94a3b8"
                    style={styles.prefixedInput}
                    value={targetAmount}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Deadline</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, styles.dateInputButton]}>
                  <Text
                    style={[
                      styles.dateInputText,
                      formattedDeadline ? styles.dateInputValue : styles.dateInputPlaceholder,
                    ]}>
                    {formattedDeadline ?? 'Select deadline (optional)'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

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
  goalToggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalToggleText: {
    flex: 1,
    paddingRight: 12,
  },
  helperText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
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
  inputWithPrefix: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 10,
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
  dateInputButton: {
    justifyContent: 'center',
    minHeight: 52,
  },
  dateInputText: {
    fontSize: 16,
  },
  dateInputValue: {
    color: '#132238',
  },
  dateInputPlaceholder: {
    color: '#94a3b8',
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

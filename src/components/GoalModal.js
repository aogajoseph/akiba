// src/components/GoalModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function GoalModal({ visible, onClose, onSave }) {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [raised, setRaised] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [avatar, setAvatar] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const resetForm = () => {
    setName('');
    setBudget('');
    setRaised('');
    setDeadline(new Date());
    setAvatar('');
  };

  const handleSave = () => {
    if (!name || !budget || !deadline) return;
    onSave({
      name,
      budget: parseFloat(budget),
      raised: parseFloat(raised) || 0,
      deadline: deadline.toISOString().split('T')[0],
      avatar: avatar ? { uri: avatar } : require('../../assets/cover.jpg')
    });
    resetForm();
    onClose();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access gallery is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create New Goal</Text>

          <TextInput
            placeholder="Goal Name (Choose a name everyone agrees on)"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            placeholder="Budget Amount"
            style={styles.input}
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Raised Amount (optional)"
            style={styles.input}
            value={raised}
            onChangeText={setRaised}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>
              Deadline: {deadline.toDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={deadline}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDeadline(selectedDate);
              }}
            />
          )}

          <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
            <Text style={styles.avatarButtonText}>
              {avatar ? 'Change Avatar' : 'Add Goal Image (Optional)'}
            </Text>
          </TouchableOpacity>

          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{ width: 60, height: 60, borderRadius: 30, marginTop: 8 }}
            />
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#2270EE'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  datePickerButton: {
    backgroundColor: '#F7C50E',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  datePickerText: {
    color: '#fff',
    fontWeight: '600'
  },
  avatarButton: {
    backgroundColor: '#1C8A27',
    padding: 10,
    borderRadius: 8,
    marginTop: 5
  },
  avatarButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8
  },
  cancelButton: {
    backgroundColor: '#bbb'
  },
  saveButton: {
    backgroundColor: '#1C8A27'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  }
});

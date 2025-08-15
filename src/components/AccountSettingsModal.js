// src/components/AccountSettingsModal.js
import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

// Default cover image
import defaultCover from '../../assets/cover.jpg';

export default function AccountSettingsModal({ visible, onClose }) {
  const navigation = useNavigation();

  // States for account data
  const [accountName, setAccountName] = useState("John Doe's Family");
  const [about, setAbout] = useState(
    'This account was created to manage shared goals for John’s Family in a transparent and organized space.'
  );
  const [coverPhoto, setCoverPhoto] = useState(defaultCover);

  // Pick new cover image
  const pickCoverPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setCoverPhoto({ uri: result.assets[0].uri });
    }
  };

  // Save changes (for now just closes modal)
  const saveChanges = () => {
    // Integrate with your state management / backend here
    onClose();
  };

  // Handle account deletion
  const deleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete this account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => console.log("Account deleted") },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Account Settings</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-outline" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Cover Image */}
            <Text style={styles.label}>Cover Image</Text>
            <TouchableOpacity onPress={pickCoverPhoto} style={styles.coverContainer}>
              <Image source={coverPhoto} style={styles.coverImage} />
              <View style={styles.coverButtons}>
                <Ionicons name="camera-outline" size={20} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Account Name */}
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Account Name"
              placeholderTextColor="#999"
            />

            {/* About Account */}
            <Text style={styles.label}>About Account</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              value={about}
              onChangeText={setAbout}
              multiline
              placeholder="Describe this account..."
              placeholderTextColor="#999"
            />

            {/* Buttons */}
            <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newAccountButton}
              onPress={() => {
                onClose();
                navigation.navigate('AccountSetupScreen');
              }}
            >
              <Text style={styles.newAccountButtonText}>Create New Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={deleteAccount}>
              <Text style={styles.deleteButtonText}>Delete this Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    color: '#333',
  },
  coverContainer: {
    marginBottom: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  coverButtons: {
    position: 'absolute',
    flexDirection: 'row',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 20,
  },
  saveButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  newAccountButton: {
    backgroundColor: '#fbbc04',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  newAccountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#F24C4C',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F24C4C',
    fontSize: 16,
    fontWeight: '700',
  },
});

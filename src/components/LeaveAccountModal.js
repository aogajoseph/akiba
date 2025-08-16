// src/components/LeaveAccountModal.js
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

export default function LeaveAccountModal({ visible, onClose }) {
  const handleLeave = () => {
    // 👇 Placeholder logic for leaving the account
    console.log("User has requested to leave the account");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Leave this Account</Text>
          <Text style={styles.message}>
            Are you sure you want to leave this account?{"\n\n"}
            Participants can leave freely. Officials will need to follow the set protocol before leaving.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.leaveButton]}
              onPress={handleLeave}
            >
              <Text style={styles.leaveText}>Leave Account</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center'
  },
  message: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: 'transparent'
  },
  leaveButton: {
    backgroundColor: '#ea4335'
  },
  cancelText: {
    color: '#555',
    fontWeight: '600'
  },
  leaveText: {
    color: '#fff',
    fontWeight: '600'
  }
});

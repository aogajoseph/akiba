// src/components/PledgeModal.js
import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function PledgeModal({ visible, onClose }) {
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleAddPledge = () => {
    // Assuming user's profile is automatically linked
    console.log(`Adding pledge - Amount: KSh ${amount}, Deadline: ${deadline}`);
    setAmount('');
    setDeadline('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Add Your Pledge</Text>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Deadline</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter deadline (DD/MM/YYYY)"
            value={deadline}
            onChangeText={setDeadline}
          />

          <TouchableOpacity style={styles.button} onPress={handleAddPledge}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, color: '#555', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, fontSize: 14 },
  button: { backgroundColor: '#F7C50E', paddingVertical: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#000' },
  cancelButton: { marginTop: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, color: '#2270EE', fontWeight: '600' },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function NominateSubAdminModal({ visible, onClose }) {
  const [selected, setSelected] = useState([]);

  // Demo participants
  const participants = [
    { id: 'p1', name: 'Mary Doe' },
    { id: 'p2', name: 'James Doe' },
    { id: 'p3', name: 'Sophia Doe' },
    { id: 'p4', name: 'Kevin Doe' }
  ];

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const confirmNomination = () => {
    console.log('Nominated:', selected); // 🔹 For now, just logs
    setSelected([]);
    onClose();
  };

  const renderItem = ({ item }) => {
    const isSelected = selected.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.participantRow}
        onPress={() => toggleSelect(item.id)}
      >
        <Ionicons
          name={isSelected ? 'checkbox-outline' : 'square-outline'}
          size={20}
          color={isSelected ? '#34a853' : '#999'}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.participantName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Nominate Sub-Admin</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select one or more participants to nominate.
          </Text>

          {/* List */}
          <FlatList
            data={participants}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={confirmNomination}
            >
              <Text style={styles.confirmText}>Confirm</Text>
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
    justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333'
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  participantName: {
    fontSize: 14,
    color: '#333'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
    marginRight: 8
  },
  cancelText: {
    color: '#333',
    fontWeight: '600'
  },
  confirmButton: {
    backgroundColor: '#34a853'
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600'
  }
});

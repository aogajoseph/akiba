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

export default function InviteMembersModal({ visible, onClose }) {
  const [selected, setSelected] = useState([]);

  // Demo contacts
  const contacts = [
    { id: 'c1', name: 'Alice Wanjiku', phone: '+254 700 123456' },
    { id: 'c2', name: 'Brian Otieno', phone: '+254 711 987654' },
    { id: 'c3', name: 'Clara Muthoni', phone: '+254 722 456789' },
    { id: 'c4', name: 'Daniel Mwangi', phone: '+254 733 111222' }
  ];

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const confirmInvite = () => {
    const invited = contacts.filter((c) => selected.includes(c.id));
    console.log('Invited:', invited); // 🔹 Replace later with API call
    setSelected([]);
    onClose();
  };

  const renderItem = ({ item }) => {
    const isSelected = selected.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.contactRow}
        onPress={() => toggleSelect(item.id)}
      >
        <Ionicons
          name={isSelected ? 'checkbox-outline' : 'square-outline'}
          size={20}
          color={isSelected ? '#4285f4' : '#999'}
          style={{ marginRight: 8 }}
        />
        <View>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{item.phone}</Text>
        </View>
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
            <Text style={styles.title}>Invite Members</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select contacts to invite to this group account.
          </Text>

          {/* List */}
          <FlatList
            data={contacts}
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
              style={[styles.button, styles.inviteButton]}
              onPress={confirmInvite}
            >
              <Text style={styles.inviteText}>Invite</Text>
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  contactPhone: {
    fontSize: 12,
    color: '#666'
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
  inviteButton: {
    backgroundColor: '#4285f4'
  },
  inviteText: {
    color: '#fff',
    fontWeight: '600'
  }
});

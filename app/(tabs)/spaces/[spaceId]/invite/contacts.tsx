import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type InviteContact = {
  id: string;
  name: string;
};

const INITIAL_CONTACTS: InviteContact[] = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Mary Wanjiku' },
  { id: '3', name: 'Peter Otieno' },
  { id: '4', name: 'Faith Achieng' },
];

export default function InviteFromContactsScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [contacts] = useState(INITIAL_CONTACTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const inviteLink = `https://akiba.app/spaces/${spaceId}/join`;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(contacts.map((contact) => contact.id));
  };

  const handleSendInvites = async () => {
    await Clipboard.setStringAsync(inviteLink);

    Alert.alert(
      'Invite Ready',
      `Link copied. Share it with ${selectedIds.length} contact(s).`,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Invite From Contacts</Text>
        <Text style={styles.subtitle}>Select contacts to invite to this space.</Text>

        <Pressable onPress={handleSelectAll}>
          <Text style={styles.selectAll}>
            {selectedIds.length === contacts.length ? 'Deselect All' : 'Select All'}
          </Text>
        </Pressable>

        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item.id);

            return (
              <Pressable
                style={styles.contactRow}
                onPress={() => toggleSelect(item.id)}
              >
                <Text style={styles.contactName}>{item.name}</Text>

                <View style={[styles.checkbox, selected ? styles.checkboxSelected : null]} />
              </Pressable>
            );
          }}
          style={styles.list}
        />

        <Pressable
          style={[styles.inviteButton, selectedIds.length === 0 ? styles.inviteButtonDisabled : null]}
          disabled={selectedIds.length === 0}
          onPress={() => {
            void handleSendInvites();
          }}
        >
          <Text style={styles.inviteButtonText}>Send Invite ({selectedIds.length})</Text>
        </Pressable>
      </View>
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
    padding: 20,
  },
  title: {
    color: '#132238',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 20,
  },
  selectAll: {
    color: '#0f766e',
    fontWeight: '600',
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  contactName: {
    fontSize: 16,
    color: '#132238',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  checkboxSelected: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  inviteButton: {
    backgroundColor: '#0f766e',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  inviteButtonDisabled: {
    opacity: 0.55,
  },
  inviteButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

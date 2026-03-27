import * as Clipboard from 'expo-clipboard';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type InviteContact = {
  id: string;
  name: string;
  phone?: string;
};

export default function InviteFromContactsScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [contacts, setContacts] = useState<InviteContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const inviteLink = `https://akiba.app/spaces/${spaceId}/join`;

  useEffect(() => {
    const loadContacts = async () => {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please allow access to contacts to invite people.',
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      const formatted = data
        .filter((contact) => contact.name)
        .map((contact) => ({
          id: contact.id,
          name: contact.name ?? 'Unnamed',
          phone: contact.phoneNumbers?.[0]?.number,
        }));

      setContacts(formatted);
    };

    void loadContacts();
  }, []);

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
    if (!spaceId) {
      return;
    }

    try {
      await Share.share({
        message: `Join our Akiba Space:\n${inviteLink}`,
      });
    } catch {
      await Clipboard.setStringAsync(inviteLink);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Invite from Contacts',
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Invite From Contacts</Text>
        <Text style={styles.subtitle}>Select contacts to invite to this space</Text>

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
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactSub}>
                    {item.phone ?? 'No number'}
                  </Text>
                </View>

                <View style={[styles.checkbox, selected ? styles.checkboxSelected : null]}>
                  {selected ? (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  ) : null}
                </View>
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
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  contactInfo: {
    flex: 1,
    paddingRight: 12,
  },
  contactName: {
    fontSize: 16,
    color: '#132238',
  },
  contactSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
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

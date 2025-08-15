import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Default avatar to use as a fallback if the participant's avatar is missing
const defaultAvatar = require('../../../assets/profile.png');

const participantsData = [
  {
    id: '1',
    name: 'John Michael',
    role: 'Main Admin',
    phone: '+254 721 465 221',
    email: 'johnmichael@gmail.com',
    status: 'Online',
    dateJoined: 'Apr 23, 2018',
    avatar: require('../../../assets/profile.png'),
  },
  {
    id: '2',
    name: 'Alexa Liras',
    role: 'Member',
    phone: '+263 726 857 512',
    email: 'alexaliras@gmail.com',
    status: 'Offline',
    dateJoined: 'Jan 11, 2019',
    avatar: require('../../../assets/profile.png'),
  }
];

// Helper function to render text with highlighting
const highlightText = (text, query) => {
  if (!query || query.length === 0) {
    return <Text>{text}</Text>;
  }

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <Text>
      {parts.map((part, index) => (
        <Text key={index} style={part.toLowerCase() === query.toLowerCase() ? styles.highlight : null}>
          {part}
        </Text>
      ))}
    </Text>
  );
};

export default function ParticipantsScreen() {
  const [search, setSearch] = useState('');
  const navigation = useNavigation();

  const filteredData = participantsData.filter(p => {
    const query = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.role.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.status.toLowerCase().includes(query) ||
      p.dateJoined.toLowerCase().includes(query)
    );
  });

  const renderItem = ({ item }) => {
    if (!item || !item.name) {
      console.warn("An item in the FlatList is invalid and will not be rendered.");
      return null;
    }

    const participantAvatar = item.avatar ? item.avatar : defaultAvatar;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={participantAvatar} style={styles.avatar} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.name}>{highlightText(item.name, search)}</Text>
            <Text style={styles.role}>{highlightText(item.role, search)}</Text>
          </View>
          <TouchableOpacity
            style={styles.connectButton}
          >
            <Text style={styles.connectText}>Connect</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#444" style={styles.icon} />
            <Text style={styles.detailText}>{highlightText(item.phone, search)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color="#444" style={styles.icon} />
            <Text style={styles.detailText}>{highlightText(item.email, search)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status: </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'Online' ? '#1C8A27' : '#555' }
              ]}
            >
              <Text style={styles.statusText}>{highlightText(item.status, search)}</Text>
            </View>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Date Joined: </Text>
            <Text style={styles.dateText}>{highlightText(item.dateJoined, search)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Participants</Text>
      <Text style={styles.subtitle}>
        Meet the participants saving together in this account.
      </Text>

      {/* New "5 Online" label */}
      <Text style={styles.onlineStatus}>
        5 Online
      </Text>

      {/* Search/Filter */}
      <TextInput
        placeholder="Search by names, role, phone, email, status or date joined."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        placeholderTextColor="#888"
      />

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>Not found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f0f2f5' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 14 },
  onlineStatus: { // New style for the online label
    fontSize: 13,
    color: '#28a745',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#fff'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginRight: 12 
  },
  name: { 
    fontWeight: '700', 
    color: '#000', 
    fontSize: 16 
  },
  role: { 
    fontSize: 13, 
    color: '#777', 
    marginTop: 2 
  },
  connectButton: {
    backgroundColor: '#1A73E8',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connectText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  cardBody: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#444',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { 
    fontSize: 11, 
    color: '#fff', 
    fontWeight: '600' 
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 13,
    color: '#666',
  },
  dateText: { 
    fontSize: 13, 
    color: '#444', 
    fontWeight: '500' 
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  highlight: {
    backgroundColor: 'yellow',
    fontWeight: 'bold',
  }
});
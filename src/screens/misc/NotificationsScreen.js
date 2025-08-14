import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function NotificationsScreen() {
  const notifications = [
    {
      id: '1',
      type: 'deposit',
      title: 'Deposit Received',
      description: 'You deposited KSh 1,500 to this account.',
      time: '10:15 AM',
      dateGroup: 'Today'
    },
    {
      id: '2',
      type: 'goal',
      title: 'Goal Achieved!',
      description: 'This account achieved the KSh 150,000 target for “Graduation” 🎉',
      time: '09:00 AM',
      dateGroup: 'Today'
    },
    {
      id: '3',
      type: 'member',
      title: 'New Member Added',
      description: 'Faith Wambui was added by Kelly X',
      time: 'Yesterday',
      dateGroup: 'This Week'
    },
    {
      id: '4',
      type: 'withdrawal',
      title: 'Transfer Initiated',
      description: 'KES 5,000 transfer to Gikomora Hardware for paint fwas initiated by Main Admin, pending 2 approvals',
      time: 'Mon, 4:45 PM',
      dateGroup: 'Earlier'
    }
  ];

  const groupedData = notifications.reduce((acc, item) => {
    if (!acc[item.dateGroup]) {
      acc[item.dateGroup] = [];
    }
    acc[item.dateGroup].push(item);
    return acc;
  }, {});

  const renderIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <Ionicons name="arrow-down-circle" size={28} color="#25D366" />;
      case 'withdrawal':
        return <Ionicons name="arrow-up-circle" size={28} color="#FF5733" />;
      case 'goal':
        return <Ionicons name="trophy" size={28} color="#FFD700" />;
      case 'member':
        return <Ionicons name="person-add" size={28} color="#007AFF" />;
      default:
        return <Ionicons name="notifications" size={28} color="#999" />;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.iconContainer}>
        {renderIcon(item.type)}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
      <Text style={styles.time}>{item.time}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          Stay updated on group activities and your savings progress.
        </Text>
      </View>

      <FlatList
        data={Object.entries(groupedData)}
        keyExtractor={([group]) => group}
        renderItem={({ item: [group, groupItems] }) => (
          <View>
            <Text style={styles.groupHeader}>{group}</Text>
            {groupItems.map((notif) => (
              <View key={notif.id}>
                {renderItem({ item: notif })}
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  groupHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 6
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  iconContainer: {
    marginRight: 12
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333'
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  time: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8
  }
});

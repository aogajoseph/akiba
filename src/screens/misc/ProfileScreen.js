import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  Switch,
  ScrollView,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import EditProfileModal from '../../components/EditProfileModal'; // import the modal

export default function ProfileScreen({ route }) {
  const [privacySettings, setPrivacySettings] = useState({
    hidePhone: false,
    hideEmail: false,
    hideLocation: false
  });
  const [isModalVisible, setModalVisible] = useState(false);

  // Simulate logged-in user ID and profile owner ID
  const loggedInUserId = 'user123';
  const profileOwnerId = route?.params?.userId || 'user123'; // default to logged-in user
  const isOwner = loggedInUserId === profileOwnerId;

  const connectedAccounts = [
    { id: 'acc1', name: "John Doe's Church", accountId: '#AKB-JDC-425' },
    { id: 'acc2', name: "John Doe's Workplace", accountId: '#AKB-JDW-117' }
  ];

  const togglePrivacy = (key) => {
    setPrivacySettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderConnectedAccount = ({ item }) => (
    <View style={styles.accountItem}>
      <Image
        source={require('../../../assets/cover.jpg')}
        style={styles.accountAvatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.accountName}>{item.name}</Text>
        <Text style={styles.accountId}>{item.accountId}</Text>
      </View>
      <Ionicons
        name="swap-horizontal"
        size={22}
        color="#007AFF"
        style={{ marginRight: 4 }}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Screen Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.screenTitle}>My Profile</Text>
          <Text style={styles.screenSubtitle}>
            View and manage your personal profile
          </Text>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={require('../../../assets/profile.png')}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.fullName}>John Doe</Text>
            <Text style={styles.role}>Main Admin</Text>
          </View>

          {/* Edit Button for Owner Only */}
          {isOwner && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioTitle}>Bio</Text>
          <Text style={styles.bio}>
            Hi there, I'm John Doe, I'm here to save, connect and achieve shared
            goals with the Akiba family.
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>John Doe</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Mobile:</Text>
            <Text style={styles.value}>0712 345 678</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>johndoe@gmail.com</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>Kenya</Text>
          </View>
        </View>

        {/* Connected Accounts */}
        <Text style={styles.sectionTitle}>Connected Accounts</Text>
        <FlatList
          data={connectedAccounts}
          renderItem={renderConnectedAccount}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ marginBottom: 16 }}
        />

        {/* Privacy Settings */}
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Hide Phone Number</Text>
          <Switch
            value={privacySettings.hidePhone}
            onValueChange={() => togglePrivacy('hidePhone')}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Hide Email Address</Text>
          <Switch
            value={privacySettings.hideEmail}
            onValueChange={() => togglePrivacy('hideEmail')}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Hide Location</Text>
          <Switch
            value={privacySettings.hideLocation}
            onValueChange={() => togglePrivacy('hideLocation')}
          />
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal */}
      <EditProfileModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        initialData={{
          fullName: 'John Doe',
          bio: "Hi there, I'm John Doe, I'm here to save, connect and achieve shared goals with the Akiba family.",
          email: 'johndoe@gmail.com',
          mobile: '0712 345 678',
          location: 'Kenya'
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333'
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 2
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  role: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600'
  },
  bioContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 10
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  bio: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20
  },
  infoCard: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  label: {
    fontWeight: '600',
    color: '#333',
    width: 100
  },
  value: {
    color: '#666'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  accountId: {
    fontSize: 12,
    color: '#666'
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  settingLabel: {
    fontSize: 14,
    color: '#333'
  }
});

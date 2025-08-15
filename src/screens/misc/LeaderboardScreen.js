// src/screens/misc/LeaderboardScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ScrollView
} from 'react-native';

const leaderboardData = {
  topContributors: [
    { id: '1', name: 'John Michael', role: 'Main Admin', contributions: 25, lastActive: '2 mins ago', amount: 50000, avatar: require('../../../assets/profile.png') },
    { id: '2', name: 'Alexa Liras', role: 'Sub Admin', contributions: 22, lastActive: '5 mins ago', amount: 42000, avatar: require('../../../assets/profile.png') },
    { id: '3', name: 'David Kim', role: 'Member', contributions: 20, lastActive: '10 mins ago', amount: 39000, avatar: require('../../../assets/profile.png') },
    { id: '4', name: 'Maria Lopez', role: 'Member', contributions: 18, lastActive: '30 mins ago', amount: 35000, avatar: require('../../../assets/profile.png') },
    { id: '5', name: 'Samson Lee', role: 'Member', contributions: 15, lastActive: '1 hour ago', amount: 30000, avatar: require('../../../assets/profile.png') },
  ],
  regularContributors: [
    { id: '6', name: 'Chris Evans', role: 'Member', contributions: 12, lastActive: '3 days ago', avatar: require('../../../assets/profile.png') }
  ],
  activeParticipants: [
    { id: '7', name: 'Natalie Brooks', role: 'Member', lastActive: '5 mins ago', avatar: require('../../../assets/profile.png') },
    { id: '8', name: 'Elijah Moore', role: 'Member', lastActive: '15 mins ago', avatar: require('../../../assets/profile.png') }
  ]
};

const COLORS = {
  gold: '#F7C50E',
  green: '#1C8A27',
  blue: '#2270EE',
  grayText: '#555',
  separatorOpacity: '33' // ~20% opacity in hex
};

export default function LeaderboardScreen() {
  const renderTopContributor = ({ item }) => (
    <View style={styles.topContributorContainer}>
      <Image source={item.avatar} style={styles.topAvatar} />
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.role}>{item.role}</Text>
      <Text style={styles.stats}>Contributions: {item.contributions}</Text>
      <Text style={styles.stats}>Last active: {item.lastActive}</Text>
      <Text style={[styles.amount, { color: COLORS.gold }]}>Amount: KSh {item.amount.toLocaleString()}</Text>
    </View>
  );

  const renderRegularContributor = ({ item }) => (
    <View style={styles.regularContributorContainer}>
      <Image source={item.avatar} style={styles.avatar} />
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.role}>{item.role}</Text>
      <Text style={styles.stats}>Contributions: {item.contributions}</Text>
      <Text style={styles.stats}>Last active: {item.lastActive}</Text>
    </View>
  );

  const renderActiveParticipant = ({ item }) => (
    <View style={styles.activeParticipantContainer}>
      <Image source={item.avatar} style={styles.avatar} />
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.role}>{item.role}</Text>
      <Text style={styles.stats}>Last active: {item.lastActive}</Text>
    </View>
  );

  const renderCategory = (title, data, renderItem, borderColor) => (
    <View style={[styles.category, { borderTopColor: borderColor }]}>
      <Text style={[styles.categoryTitle, { color: borderColor }]}>
        {title} ({data.length})
      </Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>
        Join fellow participants in driving shared success through collective effort.
      </Text>

      {renderCategory('Top Contributors', leaderboardData.topContributors, renderTopContributor, COLORS.gold)}
      {renderCategory('Regular Contributors', leaderboardData.regularContributors, renderRegularContributor, COLORS.green)}
      {renderCategory('Active Participants', leaderboardData.activeParticipants, renderActiveParticipant, COLORS.blue)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 16 },

  category: { 
    marginBottom: 20, 
    borderTopWidth: 2, 
    paddingTop: 12 
  },
  categoryTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },

  topContributorContainer: { alignItems: 'center', marginRight: 16, width: 110 },
  regularContributorContainer: { alignItems: 'center', marginRight: 16, width: 90 },
  activeParticipantContainer: { alignItems: 'center', marginRight: 16, width: 80 },

  avatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 4 },
  topAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 4 },

  name: { fontSize: 14, fontWeight: '700', textAlign: 'center', color: '#000' },
  role: { fontSize: 12, color: COLORS.grayText, textAlign: 'center', marginBottom: 4 },
  stats: { fontSize: 12, color: '#333', textAlign: 'center' },
  amount: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 2 }
});

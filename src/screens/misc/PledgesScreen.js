// src/screens/misc/PledgesScreen.js
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Animated } from 'react-native';
import PledgeModal from '../../components/PledgeModal';

const pledgesData = [
  { id: '1', name: 'John Michael', role: 'Main Admin', amount: 25000, status: 'active', deadline: '2025-08-20', avatar: require('../../../assets/profile.png') },
  { id: '2', name: 'Alexa Liras', role: 'Sub Admin', amount: 20000, status: 'completed', deadline: '2025-08-17', avatar: require('../../../assets/profile.png') },
  { id: '3', name: 'David Kim', role: 'Member', amount: 15000, status: 'overdue', deadline: '2025-08-15', avatar: require('../../../assets/profile.png') },
  { id: '4', name: 'Maria Lopez', role: 'Member', amount: 18000, status: 'active', deadline: '2025-08-20', avatar: require('../../../assets/profile.png') },
];

const totalGoal = 100000;
const STATUS_COLORS = { active: '#2270EE', completed: '#1C8A27', overdue: '#F24C4C' };

export default function PledgesScreen() {
  const [modalVisible, setModalVisible] = React.useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const completedPledged = pledgesData
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const completedPercentage = Math.min((completedPledged / totalGoal) * 100, 100);

  const getProgressBarColor = () => {
    if (completedPercentage < 30) return '#F24C4C';
    if (completedPercentage < 75) return '#2270EE';
    return '#1C8A27';
  };

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completedPercentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [completedPercentage]);

  const renderPledgeCard = (pledge) => (
    <View key={pledge.id} style={[styles.card, { borderLeftColor: STATUS_COLORS[pledge.status] }]}>
      <Image source={pledge.avatar} style={styles.avatar} />
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{pledge.name}</Text>
        <Text style={styles.role}>{pledge.role}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Amount Pledged: </Text>
          <Text style={[styles.amount, { color: STATUS_COLORS[pledge.status] }]}>
            KSh {pledge.amount.toLocaleString()}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Deadline: </Text>
          <Text style={styles.lastActivity}>{pledge.deadline}</Text>
        </View>
      </View>
      <View style={styles.statusBadgeContainer}>
        <Text style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[pledge.status] }]}>
          {pledge.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  const progressBarWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Pledges</Text>
        <Text style={styles.subtitle}>View pledges made by other participants or add yours.</Text>

        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Pledges Tracking</Text>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressBarWidth, backgroundColor: getProgressBarColor() },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            KSh {completedPledged.toLocaleString()} / KSh {totalGoal.toLocaleString()}
          </Text>
        </View>

        {pledgesData.map(renderPledgeCard)}

        <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
          <Text style={styles.buttonText}>Pledge Now</Text>
        </TouchableOpacity>
      </ScrollView>

      {modalVisible && <PledgeModal visible={modalVisible} onClose={() => setModalVisible(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 16 },

  progressContainer: { marginBottom: 20 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  progressBarBackground: { height: 12, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: 12, borderRadius: 6 },
  progressText: { fontSize: 12, color: '#555', marginTop: 4 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 6,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  infoContainer: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: '#000' },
  role: { fontSize: 12, color: '#555', marginBottom: 4 },
  label: { fontSize: 12, color: '#777', fontWeight: '600' },
  amount: { fontSize: 14, fontWeight: '700' },
  lastActivity: { fontSize: 12, color: '#777' },

  statusBadgeContainer: { marginLeft: 8 },
  statusBadge: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },

  button: {
    backgroundColor: '#F7C50E',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#000' },
});

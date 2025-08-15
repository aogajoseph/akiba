// src/screens/misc/SavingGoalsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView
} from 'react-native';
import ProgressBar from 'react-native-progress/Bar';
import GoalModal from '../../components/GoalModal'; // assuming your modal file is here

export default function SavingGoalsScreen() {
  const [goals, setGoals] = useState([
    {
      id: '1',
      name: 'Land Puchase',
      avatar: require('../../../assets/cover.jpg'),
      budget: 400000,
      raised: 290000,
      deadline: '2025-12-31'
    },
    {
      id: '2',
      name: 'Emergency Fund',
      avatar: require('../../../assets/cover.jpg'),
      budget: 50000,
      raised: 10000,
      deadline: '2025-09-30'
    }
  ]);

  const [modalVisible, setModalVisible] = useState(false);

  const userRole = 'Main Admin'; // Replace with actual logged-in user's role

  const renderGoalItem = ({ item }) => {
    const completion = (item.raised / item.budget) * 100;
    let progressColor = '#FF4D4D'; // Red
    if (completion >= 75) progressColor = '#1C8A27'; // Green
    else if (completion >= 30) progressColor = '#2270EE'; // Blue

    const isClosed = completion >= 100;

    return (
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Image source={item.avatar} style={styles.avatar} />
          <Text style={styles.goalName}>{item.name}</Text>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.label}>Budget:</Text>
          <Text style={styles.value}>Ksh {item.budget.toLocaleString()}</Text>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.label}>Raised:</Text>
          <Text style={styles.value}>Ksh {item.raised.toLocaleString()}</Text>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.label}>Deadline:</Text>
          <Text style={styles.value}>
            {new Date(item.deadline).toLocaleDateString()}
          </Text>
        </View>
        <View style={{ marginVertical: 8 }}>
          <ProgressBar
            progress={completion / 100}
            color={progressColor}
            width={null}
            height={8}
            borderRadius={4}
          />
          <Text style={styles.progressText}>{completion.toFixed(0)}%</Text>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { fontWeight: '700' }]}>
            {isClosed ? 'Closed' : 'Open'}
          </Text>
        </View>
      </View>
    );
  };

  const addGoal = (newGoal) => {
    setGoals((prev) => [...prev, { id: Date.now().toString(), ...newGoal }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Saving Goals</Text>
          <Text style={styles.subtitle}>
            Track the progress of your shared financial goals in this account.
          </Text>
        </View>

        {/* Goal List */}
        <FlatList
          data={goals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />

        {/* Create Goal Button - Only for Main Admin */}
        {userRole === 'Main Admin' && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.createButtonText}>+ Create Goal</Text>
          </TouchableOpacity>
        )}

        {/* Modal */}
        <GoalModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={addGoal}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333'
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 2
  },
  goalCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333'
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  label: {
    fontWeight: '600',
    color: '#333'
  },
  value: {
    color: '#666'
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right'
  },
  createButton: {
    backgroundColor: '#F7C50E',
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    alignItems: 'center'
  },
  createButtonText: {
    fontWeight: '700',
    color: '#fff'
  }
});

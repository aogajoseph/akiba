import { Stack } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import AppHeader from '../../../components/AppHeader';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ zIndex: 1000, elevation: 10 }}>
        <AppHeader />
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.placeholder}>No Recent Activity</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#132238',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  placeholder: {
    color: '#7b8794',
    fontSize: 16,
  },
});

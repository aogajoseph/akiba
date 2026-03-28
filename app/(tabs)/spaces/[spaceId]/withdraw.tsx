import { Stack } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function WithdrawScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Withdraw',
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Withdraw flow coming soon</Text>
        <Text style={styles.subtitle}>
          This route is ready for the transactions actions.
        </Text>
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
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#132238',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

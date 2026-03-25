import { SafeAreaView, StyleSheet, Text } from 'react-native';

export default function InviteFromContactsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Contacts list coming soon</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
  },
});

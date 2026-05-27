import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeleteAccountScreen() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Delete Account</Text>
          <Text style={styles.body}>
            Account deletion support is coming soon. If you need immediate assistance, please contact us for help.
          </Text>
          <Text style={styles.helper}>
            The account deletion flow is already taking shape. However safety and security issues are still under review.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  title: {
    color: '#132238',
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    color: '#526172',
    fontSize: 15,
    lineHeight: 23,
  },
  helper: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
  },
});

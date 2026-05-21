import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LongFormSection from '@/src/components/settings/LongFormSection';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <LongFormSection title="Information We Collect">
          <Text style={styles.bodyText}>
            We collect the basics needed to help you use Akiba, including your account details,
            phone number, username, profile photo if you add one, and activity inside the spaces
            you join.
          </Text>
        </LongFormSection>

        <LongFormSection title="How Akiba Uses Information">
          <Text style={styles.bodyText}>
            We use your information to help you sign in, keep spaces working, show shared activity,
            support deposits and withdrawals, and make the app easier to use.
          </Text>
        </LongFormSection>

        <LongFormSection title="Notifications & Communication">
          <Text style={styles.bodyText}>
            Akiba may send alerts about activity in your spaces, approvals, messages, or account
            recovery. You can control many of these alerts in your notification settings.
          </Text>
        </LongFormSection>

        <LongFormSection title="Security & Account Protection">
          <Text style={styles.bodyText}>
            We use account authentication, protected sessions, and verification checks to help keep
            your account safe. You are still responsible for protecting your device and sharing
            access carefully.
          </Text>
        </LongFormSection>

        <LongFormSection title="Communities & Shared Spaces">
          <Text style={styles.bodyText}>
            Some information you share, like your username, avatar, and activity inside a space,
            is visible to other members of that space so the group can collaborate clearly.
          </Text>
        </LongFormSection>

        <LongFormSection title="Data Storage">
          <Text style={styles.bodyText}>
            We store account and activity data so your spaces, balances, chat history, and group
            actions stay available when you return.
          </Text>
        </LongFormSection>

        <LongFormSection title="Contact Information">
          <Text style={styles.bodyText}>
            If you have questions about privacy, you can contact Akiba support at
            {' '}support@akiba.app or +254 700 000 000.
          </Text>
        </LongFormSection>
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
    gap: 18,
    padding: 20,
    paddingBottom: 32,
  },
  bodyText: {
    color: '#526172',
    fontSize: 14,
    lineHeight: 22,
  },
});

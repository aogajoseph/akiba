import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LongFormSection from '@/src/components/settings/LongFormSection';

export default function TermsScreen() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <LongFormSection title="Using Akiba Responsibly">
          <Text style={styles.bodyText}>
            Akiba is designed to help friends, families and other groups of people save money transparently for events and shared goals. Please use it honestly and respectfully.
          </Text>
        </LongFormSection>

        <LongFormSection title="Shared Spaces & Contributions">
          <Text style={styles.bodyText}>
            Activity inside a space affects other members. Before joining, contributing or requesting withdrawals, make sure you understand the purpose and expectations of that
            community.
          </Text>
        </LongFormSection>

        <LongFormSection title="Account Responsibility">
          <Text style={styles.bodyText}>
            You are responsible for keeping your device secure, using accurate details and protecting access to your Akiba account.
          </Text>
        </LongFormSection>

        <LongFormSection title="Community Conduct">
          <Text style={styles.bodyText}>
            Harassment, fraud, impersonation or harmful behavior inside spaces is not acceptable. We may restrict access when needed to protect the community.
          </Text>
        </LongFormSection>

        <LongFormSection title="Service Availability">
          <Text style={styles.bodyText}>
            We work to keep Akiba reliable, but some parts of the service may occasionally change, pause or require maintenance.
          </Text>
        </LongFormSection>

        <LongFormSection title="Changes & Improvements">
          <Text style={styles.bodyText}>
            Akiba will continue improving over time. Some features, policies and settings may be updated as the product grows.
          </Text>
        </LongFormSection>

        <LongFormSection title="Contact Support">
          <Text style={styles.bodyText}>
            If you feel stuck or something seems unclear, mail us at help@akiba.com or call +254 725 406 004.
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

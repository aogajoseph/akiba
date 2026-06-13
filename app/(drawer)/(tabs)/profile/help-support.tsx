import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileSection from '@/src/components/profile/ProfileSection';

const SUPPORT_PHONE = '+254 725 406 004';
const SUPPORT_EMAIL = 'help@akiba.com';

const openLink = async (url: string) => {
  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    return;
  }

  await Linking.openURL(url);
};

export default function HelpSupportScreen() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>
            Need help with your spaces or Akiba account? Let us know.
          </Text>
        </View>

        <ProfileSection title="Contact Support">
          <Pressable onPress={() => void openLink(`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`)} style={styles.row}>
            <View style={styles.body}>
              <Text style={styles.rowTitle}>Support Phone</Text>
              <Text style={styles.rowValue}>{SUPPORT_PHONE}</Text>
              <Text style={styles.rowHint}>Tap to call us</Text>
            </View>
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => void openLink(`mailto:${SUPPORT_EMAIL}`)} style={styles.row}>
            <View style={styles.body}>
              <Text style={styles.rowTitle}>Support Email</Text>
              <Text style={styles.rowValue}>{SUPPORT_EMAIL}</Text>
              <Text style={styles.rowHint}>Tap to mail us</Text>
            </View>
          </Pressable>
        </ProfileSection>

        <ProfileSection title="Frequently Asked Questions">
          <View style={styles.textCard}>
            <Text style={styles.question}>
              I contributed money to the wrong space. What should I do?
            </Text>
            <Text style={styles.answer}>
              This is the first version of Akiba, so all contributions are currently irreversible. Please always double-check the space name, purpose and members before contributing. In future versions, we plan to introduce safer recovery and reversal mechanisms for such cases. For urgent situations, you can contact our support team via call or email and we’ll do our best to assist where possible.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.textCard}>
            <Text style={styles.question}>
              How do I know a space won’t misuse or take my money?
            </Text>
            <Text style={styles.answer}>
              Akiba is built on transparency within each space, but responsibility is shared. Before contributing, ensure you verify the space creator, admins and members, understand the group’s objective, and actively follow conversations in the chat. Contributions should only be made to spaces you trust and clearly understand.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.textCard}>
            <Text style={styles.question}>
              Can I leave a space if I’m no longer interested?
            </Text>
            <Text style={styles.answer}>
              Yes, but it depends on your role. Members can leave a space at any time. Admins must first transfer or step down from their role before leaving. Creators cannot directly leave a space, but they can delete it once all protocols are met (No pending transactions and all funds being fully withdrawn).
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.textCard}>
            <Text style={styles.question}>
              Why am I not receiving every notification?
            </Text>
            <Text style={styles.answer}>
              Check your device push notification permissions, in-app notification settings and whether the space has been muted. Some updates may also be delayed due to network or background app restrictions.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.textCard}>
            <Text style={styles.question}>
              Can support help with account recovery?
            </Text>
            <Text style={styles.answer}>
              Yes. If you are locked out or need help regaining access, contact support and we’ll guide you through the recovery process step by step.
            </Text>
          </View>
        </ProfileSection>

        <ProfileSection title="Response Expectations">
          <View style={styles.textCard}>
            <Text style={styles.answer}>
              Akiba Group Ltd responds as soon as possible. For urgent space and account issues, calling us is
              usually the best option.
            </Text>
          </View>
        </ProfileSection>
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
  heroCard: {
    backgroundColor: '#132238',
    borderRadius: 24,
    gap: 10,
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#d7e3f1',
    fontSize: 14,
    lineHeight: 21,
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  body: {
    gap: 4,
  },
  rowTitle: {
    color: '#132238',
    fontSize: 15,
    fontWeight: '700',
  },
  rowValue: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '700',
  },
  rowHint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  textCard: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  question: {
    color: '#132238',
    fontSize: 15,
    fontWeight: '700',
  },
  answer: {
    color: '#526172',
    fontSize: 14,
    lineHeight: 21,
  },
  divider: {
    backgroundColor: '#eef2f6',
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});

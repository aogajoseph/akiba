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
            <Text style={styles.question}>I joined the wrong space. What should I do?</Text>
            <Text style={styles.answer}>
              Open the space, check the members area and tap the leave option.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.textCard}>
            <Text style={styles.question}>Why am I not receiving every notification?</Text>
            <Text style={styles.answer}>
              Check your device push permissions, your notification settings and whether the space
              itself has been muted.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.textCard}>
            <Text style={styles.question}>Can support help with account recovery?</Text>
            <Text style={styles.answer}>
              Yes. If you are locked out or need help resetting access, contact us and we will
              guide you through the next steps.
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

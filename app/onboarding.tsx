import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import AuthBrand from '../src/components/auth/AuthBrand';
import { useAuthStore } from '../src/store/authStore';
import { getPendingInviteState } from '../src/services/pendingInvite';
import { useOnboardingStore } from '../src/store/onboardingStore';

type Slide = {
  body: string;
  title: string;
};

const slides: Slide[] = [
  {
    title: 'Welcome to Akiba',
    body: 'Save money with friends, family and communities in shared spaces.',
  },
  {
    title: 'Manage Goals as a Team',
    body: 'Secure contributions, controlled withdrawals and transparent tracking, keeping everyone informed.',
  },
  {
    title: 'Do More Together',
    body: 'Turn shared goals into shared success.',
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const authStatus = useAuthStore((state) => state.status);
  const markComplete = useOnboardingStore((state) => state.markComplete);
  const isLastSlide = index === slides.length - 1;
  const currentSlide = useMemo(() => slides[index], [index]);

  const completeOnboarding = async () => {
    await markComplete();
    const pendingInvite = getPendingInviteState();

    if (pendingInvite && authStatus === 'authenticated') {
      router.replace({
        pathname: '/invite',
        params: {
          spaceId: pendingInvite.spaceId,
          ...(pendingInvite.spaceName ? { spaceName: pendingInvite.spaceName } : {}),
        },
      });
      return;
    }

    router.replace(authStatus === 'authenticated' ? '/home' : '/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AuthBrand color="#0f766e" />
          <Pressable onPress={() => {
            void completeOnboarding();
          }}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.slideCard}>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.body}>{currentSlide.body}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {slides.map((_, slideIndex) => (
              <View
                key={slideIndex}
                style={[styles.dot, slideIndex === index ? styles.dotActive : null]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            {!isLastSlide ? (
              <Pressable onPress={() => setIndex((current) => Math.min(current + 1, slides.length - 1))}>
                <Text style={styles.secondaryAction}>Next</Text>
              </Pressable>
            ) : null}
            {isLastSlide ? (
              <Pressable
                onPress={() => {
                  void completeOnboarding();
                }}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f7f3ea',
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skip: {
    color: '#526172',
    fontSize: 14,
    fontWeight: '700',
  },
  slideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    elevation: 4,
    flex: 1,
    justifyContent: 'center',
    marginVertical: 28,
    padding: 28,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  title: {
    color: '#132238',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  body: {
    color: '#526172',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  footer: {
    gap: 18,
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    backgroundColor: '#cbd5e1',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: '#0f766e',
    width: 22,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'flex-end',
  },
  secondaryAction: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: '#f7fffd',
    fontSize: 16,
    fontWeight: '700',
  },
});

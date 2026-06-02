import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type LaunchSplashProps = {
  dark: boolean;
};

export default function LaunchSplash({ dark }: LaunchSplashProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dark ? '#111827' : '#F7F3EA' }]}>
      <View style={styles.hero}>
        <View style={[styles.logoWrap, dark ? styles.logoWrapDark : null]}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
        </View>
      </View>

      <Text style={[styles.tagline, { color: dark ? '#E5E7EB' : '#526172' }]}>
        Save money with others in shared spaces
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F7F3EA',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    elevation: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    padding: 18,
  },
  logoWrapDark: {
    backgroundColor: '#0B1220',
  },
  logo: {
    height: 140,
    width: 140,
  },
  tagline: {
    color: '#526172',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationsStore } from '@/src/store/notificationsStore';

export default function AppHeader() {
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const fetchNotifications = useNotificationsStore((state) => state.fetchNotifications);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.side}>
          <Pressable onPress={() => navigation.openDrawer()} style={styles.iconButton}>
            <Ionicons color="#132238" name="menu-outline" size={24} />
          </Pressable>
        </View>

        <View pointerEvents="none" style={styles.centerWrap}>
          <View style={styles.brand}>
            <Image
              resizeMode="contain"
              source={require('../assets/images/logo.png')}
              style={styles.logo}
            />
            <Text style={styles.brandText}>Akiba</Text>
          </View>
        </View>

        <View style={[styles.side, styles.sideRight]}>
          <Pressable style={styles.iconButton}>
            <View style={styles.notificationWrap}>
              <Ionicons color="#132238" name="notifications-outline" size={24} />

              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 60,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'relative',
  },
  side: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 44,
    zIndex: 1,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  notificationWrap: {
    position: 'relative',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: 'red',
    borderRadius: 10,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
  },
  centerWrap: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 60,
    position: 'absolute',
    right: 60,
    top: 0,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  logo: {
    height: 24,
    width: 24,
  },
  brandText: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '600',
  },
});

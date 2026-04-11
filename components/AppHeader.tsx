import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationsStore } from '@/src/store/notificationsStore';
import { timeAgo } from '@/src/utils/timeAgo';

export default function AppHeader() {
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotificationsStore();

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.headerWrapper}>
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
            <Pressable onPress={() => setOpen((prev) => !prev)} style={styles.iconButton}>
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

        {open ? (
          <View style={styles.overlay}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setOpen(false)}
              style={styles.overlayBackground}
            />

            <View style={styles.dropdown}>
              {notifications.slice(0, 5).length > 0 ? (
                notifications.slice(0, 5).map((notification, index) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    key={notification.cursorId}
                    onPress={() => {
                      if (!notification.isRead) {
                        void markAsRead(notification.id);
                      }

                      setOpen(false);

                      if (notification.spaceId && notification.transactionId) {
                        router.push({
                          pathname: '/spaces/[spaceId]/transactions/[transactionId]',
                          params: {
                            spaceId: notification.spaceId,
                            transactionId: notification.transactionId,
                          },
                        });
                        return;
                      }

                      if (notification.spaceId) {
                        router.push(`/spaces/${notification.spaceId}`);
                        return;
                      }

                      router.push('/notifications');
                    }}>
                    <View
                      style={[
                        styles.dropdownItem,
                        !notification.isRead ? styles.dropdownItemUnread : null,
                        index < Math.min(notifications.length, 5) - 1
                          ? styles.dropdownItemDivider
                          : null,
                      ]}>
                      <View style={styles.dropdownTitleRow}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.dropdownTitle,
                            !notification.isRead ? styles.dropdownTitleUnread : null,
                          ]}>
                          {notification.title}
                        </Text>

                        {!notification.isRead ? <View style={styles.unreadDot} /> : null}
                      </View>

                      <Text numberOfLines={2} style={styles.dropdownBody}>
                        {notification.body}
                      </Text>

                      <Text style={styles.dropdownTime}>{timeAgo(notification.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No notifications</Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setOpen(false);
                  console.log('Navigating to notifications');
                  router.push('/notifications');
                }}
                style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
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
  headerWrapper: {
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 50,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
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
  dropdown: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    position: 'absolute',
    top: 50,
    right: 25,
    width: 300,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 50,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemUnread: {
    backgroundColor: '#f8fbff',
  },
  dropdownItemDivider: {
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  dropdownTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  dropdownTitle: {
    color: '#132238',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownTitleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    backgroundColor: '#0f766e',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dropdownBody: {
    color: '#475467',
    fontSize: 12,
    marginTop: 4,
  },
  dropdownTime: {
    color: '#888888',
    fontSize: 11,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  emptyStateText: {
    color: '#888888',
    fontSize: 13,
    fontStyle: 'italic',
  },
  viewAllButton: {
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  viewAllText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
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

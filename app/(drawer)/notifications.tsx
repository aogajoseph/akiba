import { useEffect } from 'react';
import { FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

import {
  type Notification as AppNotification,
} from '@/src/hooks/useNotifications';
import { useNotificationsStore } from '@/src/store/notificationsStore';
import { timeAgo } from '@/src/utils/timeAgo';

export default function NotificationsScreen() {
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
  } = useNotificationsStore();

  useEffect(() => {
    void fetchNotifications();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity activeOpacity={0.7} onPress={() => { void markAsRead(item.id); }}>
      <View
        style={{
          padding: 16,
          backgroundColor: item.isRead ? '#fff' : '#eef6ff',
          borderBottomWidth: 1,
          borderColor: '#eee',
        }}>
        <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          {timeAgo(item.createdAt)}
        </Text>
        <Text>{item.body}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Text style={{ padding: 20 }}>Loading...</Text>;
  }

  if (!loading && (notifications?.length ?? 0) === 0) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Text style={{ fontStyle: 'italic', color: '#888' }}>
          No notifications
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.cursorId}
      onRefresh={fetchNotifications}
      renderItem={renderItem}
      refreshing={loading}
    />
  );
}

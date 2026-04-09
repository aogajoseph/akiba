import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

type Notification = {
  id: string;
  cursorId: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://192.168.0.102:4000/notifications');
      const data = await res.json().catch(() => null);

      const list = Array.isArray(data?.notifications)
        ? data.notifications
        : [];

      setNotifications(list);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    if (notifications.find((n) => n.id === id)?.isRead) return;

    try {
      await fetch(`http://192.168.0.102:4000/notifications/${id}/read`, {
        method: 'PATCH',
      });

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity activeOpacity={0.7} onPress={() => { void markAsRead(item.id); }}>
      <View
        style={{
          padding: 16,
          backgroundColor: item.isRead ? '#fff' : '#eef6ff',
          borderBottomWidth: 1,
          borderColor: '#eee',
        }}>
        <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
        <Text>{item.body}</Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
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
          No notifications yet
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

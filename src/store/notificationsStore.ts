import { create } from 'zustand';

import { NotificationDTO } from '../../../shared/contracts';
import { getAuthSession } from '../../utils/api';
import { API_BASE_URL } from '@/src/config/api';

export type Notification = NotificationDTO;

type NotificationsState = {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
};

const getNotificationHeaders = (): HeadersInit => {
  const accessToken = getAuthSession()?.accessToken;

  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  loading: false,
  unreadCount: 0,

  addNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.some((item) => item.id === notification.id);

      if (exists) {
        return state;
      }

      const updated = [notification, ...state.notifications];

      return {
        notifications: updated,
        unreadCount: updated.filter((item) => !item.isRead).length,
      };
    });
  },

  fetchNotifications: async () => {
    try {
      set({ loading: true });

      if (!API_BASE_URL || !getAuthSession()?.accessToken) {
        set({ notifications: [], unreadCount: 0 });
        return;
      }

      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: getNotificationHeaders(),
      });
      const data = await res.json().catch(() => null);

      const list = Array.isArray(data?.data?.notifications)
        ? data.data.notifications
        : Array.isArray(data?.notifications)
          ? data.notifications
          : [];

      set({
        notifications: list,
        unreadCount: list.filter((notification: Notification) => !notification.isRead).length,
      });
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      set({ notifications: [], unreadCount: 0 });
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    const prev = get().notifications;

    if (prev.find((notification) => notification.id === id)?.isRead) {
      return;
    }

    const updated = prev.map((notification) =>
      notification.id === id ? { ...notification, isRead: true } : notification,
    );

    set({
      notifications: updated,
      unreadCount: updated.filter((notification) => !notification.isRead).length,
    });

    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getNotificationHeaders(),
      });
    } catch (err) {
      console.error('Failed to mark as read', err);
      set({
        notifications: prev,
        unreadCount: prev.filter((notification) => !notification.isRead).length,
      });
    }
  },
}));

import { useState, useCallback, useEffect } from 'react';
import type { Notification } from '@/shared/schema';

export interface GroupedNotifications {
  groupId: string;
  count: number;
  unreadCount: number;
  notifications: Notification[];
}

export interface UseNotificationsGroupedOptions {
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Hook pour gérer les notifications groupées par projet/offre
 *
 * Utilisation:
 * ```
 * const { allNotifications, groupedByProject, unreadCount, loading } = useNotificationsGrouped({
 *   userId: 'user-123',
 *   autoRefresh: true,
 *   refreshInterval: 30000
 * });
 * ```
 */
export const useNotificationsGrouped = (
  options: UseNotificationsGroupedOptions = {}
) => {
  const {
    userId,
    autoRefresh = true,
    refreshInterval = 30000,
  } = options;

  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [groupedByProject, setGroupedByProject] = useState<GroupedNotifications[]>([]);
  const [groupedByOffer, setGroupedByOffer] = useState<GroupedNotifications[]>([]);
  const [groupedByEntity, setGroupedByEntity] = useState<GroupedNotifications[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch('/api/notifications?limit=100');

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setAllNotifications(data.notifications);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch grouped notifications
  const fetchGroupedNotifications = useCallback(
    async (groupBy: 'project' | 'offer' | 'entity') => {
      if (!userId) return;

      try {
        const response = await fetch(
          `/api/notifications/grouped?by=${groupBy}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ${groupBy} notifications`);
        }

        const data: GroupedNotifications[] = await response.json();

        if (groupBy === 'project') {
          setGroupedByProject(data);
        } else if (groupBy === 'offer') {
          setGroupedByOffer(data);
        } else if (groupBy === 'entity') {
          setGroupedByEntity(data);
        }
      } catch (err) {
        console.error(`Error fetching ${groupBy} notifications:`, err);
      }
    },
    [userId]
  );

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/notifications/unread');

      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }

      const data = await response.json();
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [userId]);

  // Refresh all notifications
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchNotifications(),
      fetchGroupedNotifications('project'),
      fetchGroupedNotifications('offer'),
      fetchGroupedNotifications('entity'),
      fetchUnreadCount(),
    ]);
  }, [fetchNotifications, fetchGroupedNotifications, fetchUnreadCount]);

  // Initial load
  useEffect(() => {
    if (userId) {
      refresh();
    }
  }, [userId, refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, userId, refresh]);

  // Mark as read
  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });

        if (response.ok) {
          setAllNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            )
          );
          await fetchUnreadCount();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error marking notification as read:', err);
        return false;
      }
    },
    [fetchUnreadCount]
  );

  // Mark multiple as read
  const markMultipleAsRead = useCallback(
    async (notificationIds: string[]): Promise<number> => {
      try {
        const response = await fetch('/api/notifications/read-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: notificationIds }),
        });

        if (response.ok) {
          const data = await response.json();
          setAllNotifications((prev) =>
            prev.map((n) =>
              notificationIds.includes(n.id) ? { ...n, isRead: true } : n
            )
          );
          await fetchUnreadCount();
          return data.marked;
        }
        return 0;
      } catch (err) {
        console.error('Error marking notifications as read:', err);
        return 0;
      }
    },
    [fetchUnreadCount]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setAllNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
        return data.marked;
      }
      return 0;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return 0;
    }
  }, []);

  // Mark project as read
  const markProjectAsRead = useCallback(
    async (projectId: string): Promise<number> => {
      try {
        const response = await fetch(
          `/api/notifications/project/${projectId}/read`,
          {
            method: 'PUT',
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAllNotifications((prev) =>
            prev.map((n) =>
              (n.metadata as unknown as {projectId?: string})?.projectId === projectId
                ? { ...n, isRead: true }
                : n
            )
          );
          await fetchUnreadCount();
          return data.marked;
        }
        return 0;
      } catch (err) {
        console.error('Error marking project notifications as read:', err);
        return 0;
      }
    },
    [fetchUnreadCount]
  );

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setAllNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
          await fetchUnreadCount();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error deleting notification:', err);
        return false;
      }
    },
    [fetchUnreadCount]
  );

  // Search notifications
  const search = useCallback(
    async (filters: {
      type?: string;
      isRead?: boolean;
      projectId?: string;
      offerId?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }) => {
      if (!userId) return { notifications: [], total: 0 };

      try {
        const params = new URLSearchParams();

        if (filters.type) params.append('type', filters.type);
        if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
        if (filters.projectId) params.append('projectId', filters.projectId);
        if (filters.offerId) params.append('offerId', filters.offerId);
        if (filters.entityType) params.append('entityType', filters.entityType);
        if (filters.limit) params.append('limit', String(filters.limit));
        if (filters.offset) params.append('offset', String(filters.offset));

        const response = await fetch(
          `/api/notifications/search?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to search notifications');
        }

        return await response.json();
      } catch (err) {
        console.error('Error searching notifications:', err);
        return { notifications: [], total: 0 };
      }
    },
    [userId]
  );

  return {
    allNotifications,
    groupedByProject,
    groupedByOffer,
    groupedByEntity,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    markProjectAsRead,
    deleteNotification,
    search,
  };
};

export default useNotificationsGrouped;

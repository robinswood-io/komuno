import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { Notification } from '@/shared/schema';

interface GroupedNotifications {
  groupId: string;
  count: number;
  unreadCount: number;
  notifications: Notification[];
}

interface NotificationsCenterProps {
  userId: string;
  onNotificationRead?: (notificationId: string) => void;
  refreshInterval?: number; // in milliseconds, default 30000
}

/**
 * NotificationsCenter Component
 *
 * Displays notifications grouped by project, offer, or entity with:
 * - Tab navigation (All, By Project, By Offer)
 * - Accordion-style collapsible groups
 * - Unread count badges
 * - Mark as read/unread functionality
 * - Delete functionality
 */
export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  userId,
  onNotificationRead,
  refreshInterval = 30000,
}) => {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [groupedByProject, setGroupedByProject] = useState<GroupedNotifications[]>([]);
  const [groupedByOffer, setGroupedByOffer] = useState<GroupedNotifications[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch all notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setAllNotifications(data.notifications);

      // Fetch unread count
      const countResponse = await fetch(`/api/notifications/unread`);
      const countData = await countResponse.json();
      setUnreadCount(countData.unreadCount);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch grouped notifications
  const fetchGroupedNotifications = async (groupBy: 'project' | 'offer') => {
    try {
      const response = await fetch(
        `/api/notifications/grouped?by=${groupBy}`
      );
      if (!response.ok) throw new Error(`Failed to fetch ${groupBy} notifications`);

      const data = await response.json();

      if (groupBy === 'project') {
        setGroupedByProject(data);
      } else {
        setGroupedByOffer(data);
      }
    } catch (err) {
      console.error(`Error fetching ${groupBy} notifications:`, err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchNotifications();
    fetchGroupedNotifications('project');
    fetchGroupedNotifications('offer');
  }, [userId]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !isRead }),
      });

      if (response.ok) {
        // Update local state
        setAllNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: !isRead } : n
          )
        );
        onNotificationRead?.(notificationId);
      }
    } catch (err) {
      console.error('Error updating notification:', err);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAllNotifications((prev) =>
          prev.filter((n) => n.id !== notificationId)
        );
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch(`/api/notifications/read-all`, {
        method: 'POST',
      });

      if (response.ok) {
        setAllNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Toggle group expansion
  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Chargement des notifications...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Vous avez {unreadCount} notification(s) non lue(s)
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              Tous
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects">
              Par Projet
              {groupedByProject.reduce((sum, g) => sum + g.unreadCount, 0) > 0 && (
                <Badge className="ml-2 bg-blue-500">
                  {groupedByProject.reduce((sum, g) => sum + g.unreadCount, 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="offers">
              Par Offre
              {groupedByOffer.reduce((sum, g) => sum + g.unreadCount, 0) > 0 && (
                <Badge className="ml-2 bg-green-500">
                  {groupedByOffer.reduce((sum, g) => sum + g.unreadCount, 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Notifications Tab */}
          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {allNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune notification
                </div>
              ) : (
                <div className="space-y-2">
                  {allNotifications.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Grouped by Project Tab */}
          <TabsContent value="projects" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {groupedByProject.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune notification par projet
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedByProject.map((group) => (
                    <NotificationGroup
                      key={group.groupId}
                      group={group}
                      isExpanded={expandedGroups.has(group.groupId)}
                      onToggleExpand={() => toggleGroupExpanded(group.groupId)}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Grouped by Offer Tab */}
          <TabsContent value="offers" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {groupedByOffer.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune notification par offre
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedByOffer.map((group) => (
                    <NotificationGroup
                      key={group.groupId}
                      group={group}
                      isExpanded={expandedGroups.has(group.groupId)}
                      onToggleExpand={() => toggleGroupExpanded(group.groupId)}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

/**
 * NotificationGroup Component
 * Displays a collapsible group of notifications
 */
interface NotificationGroupProps {
  group: GroupedNotifications;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMarkAsRead: (notificationId: string, isRead: boolean) => void;
  onDelete: (notificationId: string) => void;
}

const NotificationGroup: React.FC<NotificationGroupProps> = ({
  group,
  isExpanded,
  onToggleExpand,
  onMarkAsRead,
  onDelete,
}) => {
  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">{group.groupId}</span>
          <Badge variant="outline">{group.count}</Badge>
          {group.unreadCount > 0 && (
            <Badge variant="default" className="bg-red-500">
              {group.unreadCount} non lu(s)
            </Badge>
          )}
        </div>
        <div className="text-gray-500">
          {isExpanded ? '▼' : '▶'}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t p-3 space-y-2">
          {group.notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * NotificationItem Component
 * Individual notification display
 */
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string, isRead: boolean) => void;
  onDelete: (notificationId: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  return (
    <div
      className={`p-3 rounded border ${
        notification.isRead
          ? 'bg-white border-gray-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            {!notification.isRead && (
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">{notification.body}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {notification.type}
            </span>
            {(notification.metadata as unknown as {projectId?: string})?.projectId && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                Projet: {(notification.metadata as unknown as {projectId: string}).projectId}
              </span>
            )}
            {(notification.metadata as unknown as {offerId?: string})?.offerId && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Offre: {(notification.metadata as unknown as {offerId: string}).offerId}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onMarkAsRead(notification.id, notification.isRead)}
            className="p-1.5 hover:bg-gray-100 rounded transition"
            title={notification.isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
          >
            {notification.isRead ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-blue-500" />
            )}
          </button>
          <button
            onClick={() => onDelete(notification.id)}
            className="p-1.5 hover:bg-red-50 rounded transition"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {new Date(notification.createdAt).toLocaleString('fr-FR')}
      </p>
    </div>
  );
};

export default NotificationsCenter;

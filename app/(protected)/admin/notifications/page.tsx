'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  Filter,
  Calendar,
  AlertCircle,
  Info,
  Lightbulb,
  UserCheck,
  Package
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  icon?: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  relatedProjectId?: string;
  relatedOfferId?: string;
  createdAt: string;
  updatedAt: string;
}

const NOTIFICATION_TYPES = {
  'idea_update': { label: 'Idée', icon: Lightbulb, color: 'text-yellow-600' },
  'event_update': { label: 'Événement', icon: Calendar, color: 'text-blue-600' },
  'loan_update': { label: 'Prêt', icon: Package, color: 'text-success' },
  'member_update': { label: 'Membre', icon: UserCheck, color: 'text-purple-600' },
  'task_reminder': { label: 'Tâche', icon: AlertCircle, color: 'text-orange-600' },
  'system': { label: 'Système', icon: Info, color: 'text-gray-600' },
};

function getNotificationIcon(type: string) {
  const config = NOTIFICATION_TYPES[type as keyof typeof NOTIFICATION_TYPES];
  return config || { label: 'Info', icon: Info, color: 'text-gray-600' };
}

/**
 * Page Centre de Notifications Admin
 * Gestion centralisée des notifications (tâches, échéances, alertes)
 */
export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Query pour récupérer les notifications
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', filter, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit: '50',
        offset: '0',
      };

      if (filter === 'unread') {
        params.isRead = 'false';
      } else if (filter === 'read') {
        params.isRead = 'true';
      }

      if (typeFilter) {
        params.type = typeFilter;
      }

      const response = await api.get<{ notifications: Notification[]; total: number }>(
        '/api/notifications',
        params
      );

      return response;
    },
  });

  // Query pour le compteur de notifications non lues
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get<{ unreadCount: number }>('/api/notifications/unread');
      return response.unreadCount;
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  // Mutation pour marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Notification marquée comme lue',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour tout marquer comme lu
  const markAllAsReadMutation = useMutation<{ marked: number }, Error, void>({
    mutationFn: async () => {
      return api.post<{ marked: number }>('/api/notifications/read-all', {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Notifications marquées',
        description: `${data.marked} notification(s) marquée(s) comme lue(s)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour supprimer une notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Notification supprimée',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteNotificationMutation.mutate(id);
  };

  const notifications = data?.notifications || [];
  const total = data?.total || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>Impossible de charger les notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Centre de Notifications
          </h1>
          <p className="text-muted-foreground">
            Gérez vos alertes, tâches et échéances
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount && unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Non lues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unreadCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {total - (unreadCount || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter(n => {
                const today = new Date();
                const notifDate = new Date(n.createdAt);
                return notifDate.toDateString() === today.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtres</CardTitle>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Type
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrer par type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter(null)}>
                    Tous les types
                  </DropdownMenuItem>
                  {Object.entries(NOTIFICATION_TYPES).map(([type, config]) => (
                    <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                      <config.icon className={`h-4 w-4 mr-2 ${config.color}`} />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Toutes
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Non lues
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('read')}
            >
              Lues
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            {notifications.length} notification(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const iconConfig = getNotificationIcon(notification.type);
                const Icon = iconConfig.icon;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.isRead
                        ? 'bg-background border-border'
                        : 'bg-accent/50 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 ${iconConfig.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {notification.title}
                              </h3>
                              {!notification.isRead && (
                                <Badge variant="default" className="text-xs">
                                  Nouveau
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {iconConfig.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.body}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                disabled={markAsReadMutation.isPending}
                                title="Marquer comme lu"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(notification.id)}
                              disabled={deleteNotificationMutation.isPending}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

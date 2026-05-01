'use client';

import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Lightbulb, Calendar, TrendingUp } from 'lucide-react';

interface AdminStats {
  data: {
    members: {
      total: number;
      active: number;
      proposed: number;
      recentActivity: number;
    };
    ideas: {
      total: number;
      pending: number;
      approved: number;
    };
    events: {
      total: number;
      upcoming: number;
    };
    patrons: {
      total: number;
      active: number;
      proposed: number;
    };
  };
}

/**
 * Page Dashboard Admin
 * Affiche les statistiques principales de l'application
 */
export default function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => api.get<AdminStats>('/api/admin/stats'),
  });

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
            <CardDescription>Impossible de charger les statistiques</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground">Vue d'ensemble de l'application Réseau Entreprendre Picardie</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Statistiques Membres */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membres Totaux</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.data?.members?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.data?.members?.active || 0} actifs
            </p>
          </CardContent>
        </Card>

        {/* Statistiques Idées */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idées Proposées</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.data?.ideas?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.data?.ideas?.pending || 0} en attente
            </p>
          </CardContent>
        </Card>

        {/* Statistiques Événements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.data?.events?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.data?.events?.upcoming || 0} à venir
            </p>
          </CardContent>
        </Card>

        {/* Statistiques Sponsors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sponsors</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.data?.patrons?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.data?.patrons?.active || 0} actifs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section Résumé */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé des statistiques</CardTitle>
          <CardDescription>
            Vue d'ensemble de l'activité de l'association
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Membres</h3>
              <p className="text-sm text-muted-foreground">
                {stats?.data?.members?.proposed || 0} proposés • {' '}
                {stats?.data?.members?.recentActivity || 0} activités récentes
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Idées</h3>
              <p className="text-sm text-muted-foreground">
                {stats?.data?.ideas?.approved || 0} approuvées
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Événements</h3>
              <p className="text-sm text-muted-foreground">
                {stats?.data?.events?.upcoming || 0} à venir
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Sponsors</h3>
              <p className="text-sm text-muted-foreground">
                {stats?.data?.patrons?.proposed || 0} proposés
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

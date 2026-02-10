'use client';

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Database,
  Mail,
  Bell,
  MemoryStick,
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatusResponse } from "@/shared/schema";

export default function StatusPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<StatusResponse>({
    queryKey: ['/api/status/all'],
    refetchInterval: 30000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-6 h-6 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      case 'unhealthy':
        return <XCircle className="w-6 h-6 text-danger" />;
      default:
        return <HelpCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      healthy: 'default',
      warning: 'secondary',
      unhealthy: 'destructive',
      unknown: 'outline'
    };

    const labels: Record<string, string> = {
      healthy: 'Opérationnel',
      warning: 'Avertissement',
      unhealthy: 'Indisponible',
      unknown: 'Inconnu'
    };

    return (
      <Badge variant={variants[status] || 'outline'} data-testid={`badge-status-${status}`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getCheckIcon = (checkKey: string) => {
    const icons: Record<string, any> = {
      application: <Server className="w-5 h-5" />,
      database: <Database className="w-5 h-5" />,
      databasePool: <Activity className="w-5 h-5" />,
      memory: <MemoryStick className="w-5 h-5" />,
      email: <Mail className="w-5 h-5" />,
      pushNotifications: <Bell className="w-5 h-5" />
    };
    return icons[checkKey] || <Activity className="w-5 h-5" />;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-info-light dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-primary dark:text-primary-light mb-2" data-testid="heading-status">
                État du Système
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Surveillance en temps réel des services CJD Amiens
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="outline"
              size="lg"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data ? (
          <>
            {/* Overall Status Card */}
            <Card className="mb-8 border-2 shadow-lg" data-testid="card-overall-status">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(data.overallStatus)}
                    <div>
                      <CardTitle className="text-2xl">Statut Général</CardTitle>
                      <CardDescription>
                        Dernière vérification : {new Date(data.timestamp).toLocaleString('fr-FR')}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(data.overallStatus)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-gradient-to-r from-primary-light to-primary/10 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Uptime</div>
                    <div className="text-2xl font-bold text-primary dark:text-primary-light" data-testid="text-uptime">
                      {formatUptime(data.uptime)}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-info-light to-info/10 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Environnement</div>
                    <div className="text-2xl font-bold text-info dark:text-info-light capitalize" data-testid="text-environment">
                      {data.environment}
                    </div>
                  </div>
                  <div className="bg-success/10 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Services actifs</div>
                    <div className="text-2xl font-bold text-success dark:text-success-light" data-testid="text-active-services">
                      {Object.values(data.checks).filter(c => c.status === 'healthy').length} / {Object.keys(data.checks).length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Service Checks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(data.checks).map(([key, check]) => (
                <Card
                  key={key}
                  className={`border-l-4 ${
                    check.status === 'healthy' ? 'border-l-success' :
                    check.status === 'warning' ? 'border-l-warning' :
                    check.status === 'unhealthy' ? 'border-l-danger' :
                    'border-l-gray-400'
                  } shadow-md hover:shadow-lg transition-shadow`}
                  data-testid={`card-check-${key}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          check.status === 'healthy' ? 'bg-success/10 text-success' :
                          check.status === 'warning' ? 'bg-warning/10 text-warning' :
                          check.status === 'unhealthy' ? 'bg-danger/10 text-danger' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {getCheckIcon(key)}
                        </div>
                        <CardTitle className="text-lg">{check.name}</CardTitle>
                      </div>
                      {getStatusBadge(check.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 mb-3" data-testid={`text-message-${key}`}>
                      {check.message}
                    </p>

                    {check.responseTime !== undefined && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <Activity className="w-4 h-4" />
                        <span>Temps de réponse : {check.responseTime}ms</span>
                      </div>
                    )}

                    {check.error && (
                      <div className="bg-danger/10 text-danger rounded-lg p-3 text-sm mt-2" data-testid={`error-${key}`}>
                        <strong>Erreur :</strong> {check.error}
                      </div>
                    )}

                    {check.details && (
                      <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Détails :</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(check.details).map(([detailKey, detailValue]) => (
                            <div key={detailKey} className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400 capitalize">
                                {detailKey.replace(/([A-Z])/g, ' $1').trim()} :
                              </span>
                              <span className="font-mono text-gray-800 dark:text-gray-200">
                                {typeof detailValue === 'object' ? JSON.stringify(detailValue) : String(detailValue)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Footer Info */}
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Les données sont actualisées automatiquement toutes les 30 secondes</p>
              <p className="mt-1">
                Pour une surveillance en temps réel, consultez les logs du serveur
              </p>
            </div>
          </>
        ) : (
          <Card className="border-2 border-danger">
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-danger mx-auto mb-4" />
              <h3 className="text-xl font-bold text-danger mb-2">Impossible de charger les données</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Une erreur s'est produite lors de la récupération du statut des services
              </p>
              <Button onClick={() => refetch()} variant="outline" data-testid="button-retry">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

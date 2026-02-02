'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, type ApiResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

type EntityType = 'member' | 'patron';
type MetricType = 'status_change' | 'engagement' | 'contact' | 'conversion' | 'activity';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
type AlertType = 'stale' | 'high_potential' | 'needs_followup' | 'conversion_opportunity';

interface TrackingDashboard {
  memberCount: number;
  patronCount: number;
  averageEngagement: number;
  inactiveMembers: number;
}

interface TrackingMetric {
  id: string;
  entityType: EntityType;
  metricType: MetricType;
  metricValue?: number | null;
  description?: string | null;
  recordedAt?: string;
}

interface TrackingAlert {
  id: string;
  entityType: EntityType;
  entityEmail?: string | null;
  alertType: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  isResolved: boolean;
  isRead: boolean;
  createdAt?: string;
}

interface MetricFormState {
  name: string;
  entityType: EntityType;
  entityId: string;
  entityEmail: string;
  metricType: MetricType;
  metricValue: string;
}

interface AlertFormState {
  title: string;
  message: string;
  entityType: EntityType;
  entityId: string;
  entityEmail: string;
  alertType: AlertType;
  severity: AlertSeverity;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatMetricType(metricType: MetricType): string {
  switch (metricType) {
    case 'status_change':
      return 'Changement de statut';
    case 'engagement':
      return 'Engagement';
    case 'contact':
      return 'Contact';
    case 'conversion':
      return 'Conversion';
    case 'activity':
      return 'Activité';
    default:
      return metricType;
  }
}

export default function AdminTrackingPage() {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<TrackingDashboard | null>(null);
  const [metrics, setMetrics] = useState<TrackingMetric[]>([]);
  const [alerts, setAlerts] = useState<TrackingAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entityType, setEntityType] = useState<EntityType>('member');
  const [metricType, setMetricType] = useState<MetricType>('engagement');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<AlertSeverity | 'all'>('high');
  const [alertResolvedFilter, setAlertResolvedFilter] = useState<'true' | 'false' | 'all'>('false');
  const [isMetricDialogOpen, setIsMetricDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isSubmittingMetric, setIsSubmittingMetric] = useState(false);
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);
  const [isGeneratingAlerts, setIsGeneratingAlerts] = useState(false);

  const [metricForm, setMetricForm] = useState<MetricFormState>({
    name: '',
    entityType: 'member',
    entityId: '',
    entityEmail: '',
    metricType: 'engagement',
    metricValue: '',
  });

  const [alertForm, setAlertForm] = useState<AlertFormState>({
    title: '',
    message: '',
    entityType: 'member',
    entityId: '',
    entityEmail: '',
    alertType: 'stale',
    severity: 'medium',
  });

  const normalizedDashboard = useMemo(() => {
    return dashboard ?? {
      memberCount: 0,
      patronCount: 0,
      averageEngagement: 0,
      inactiveMembers: 0,
    };
  }, [dashboard]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get<ApiResponse<Record<string, unknown>>>('/api/tracking/dashboard');
        if (!isMounted || !response.success || !isRecord(response.data)) return;

        setDashboard({
          memberCount: toNumber(response.data.memberCount),
          patronCount: toNumber(response.data.patronCount),
          averageEngagement: toNumber(response.data.averageEngagement),
          inactiveMembers: toNumber(response.data.inactiveMembers),
        });
      } catch {
        if (isMounted) {
          setDashboard(null);
        }
      }
    };

    const loadMetrics = async () => {
      try {
        const response = await api.get<ApiResponse<TrackingMetric[]>>('/api/tracking/metrics', {
          entityType,
          metricType,
        });
        if (!isMounted || !response.success || !Array.isArray(response.data)) return;
        setMetrics(response.data);
      } catch {
        if (isMounted) {
          setMetrics([]);
        }
      }
    };

    const loadAlerts = async () => {
      try {
        const response = await api.get<ApiResponse<TrackingAlert[]>>('/api/tracking/alerts', {
          severity: alertSeverityFilter === 'all' ? undefined : alertSeverityFilter,
          isResolved: alertResolvedFilter === 'all' ? undefined : alertResolvedFilter === 'true',
        });
        if (!isMounted || !response.success || !Array.isArray(response.data)) return;
        setAlerts(response.data);
      } catch {
        if (isMounted) {
          setAlerts([]);
        }
      }
    };

    setIsLoading(true);
    void Promise.all([loadDashboard(), loadMetrics(), loadAlerts()]).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [entityType, metricType, alertSeverityFilter, alertResolvedFilter]);

  const resetMetricForm = () => {
    setMetricForm({
      name: '',
      entityType: 'member',
      entityId: '',
      entityEmail: '',
      metricType: 'engagement',
      metricValue: '',
    });
  };

  const resetAlertForm = () => {
    setAlertForm({
      title: '',
      message: '',
      entityType: 'member',
      entityId: '',
      entityEmail: '',
      alertType: 'stale',
      severity: 'medium',
    });
  };

  const handleCreateMetric = async () => {
    if (!metricForm.entityId.trim() || !metricForm.entityEmail.trim()) {
      toast({
        title: 'Champs manquants',
        description: 'Merci de préciser l\'ID et l\'email de l\'entité.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingMetric(true);
    try {
      const metricValue = metricForm.metricValue.trim() ? Number(metricForm.metricValue) : undefined;
      const payload = {
        entityType: metricForm.entityType,
        entityId: metricForm.entityId.trim(),
        entityEmail: metricForm.entityEmail.trim(),
        metricType: metricForm.metricType,
        metricValue: Number.isNaN(metricValue) ? undefined : metricValue,
        description: metricForm.name.trim() || undefined,
      };

      const response = await api.post<ApiResponse<TrackingMetric>>('/api/tracking/metrics', payload);
      if (response.success) {
        setMetrics((prev) => [response.data, ...prev]);
        setIsMetricDialogOpen(false);
        resetMetricForm();
        toast({
          title: 'Métrique créée',
          description: 'La métrique a été enregistrée.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de créer la métrique';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingMetric(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!alertForm.title.trim() || !alertForm.message.trim()) {
      toast({
        title: 'Champs manquants',
        description: 'Merci de compléter le titre et le message.',
        variant: 'destructive',
      });
      return;
    }

    if (!alertForm.entityId.trim() || !alertForm.entityEmail.trim()) {
      toast({
        title: 'Champs manquants',
        description: 'Merci de préciser l\'ID et l\'email de l\'entité.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingAlert(true);
    try {
      const payload = {
        title: alertForm.title.trim(),
        message: alertForm.message.trim(),
        entityType: alertForm.entityType,
        entityId: alertForm.entityId.trim(),
        entityEmail: alertForm.entityEmail.trim(),
        alertType: alertForm.alertType,
        severity: alertForm.severity,
      };

      const response = await api.post<ApiResponse<TrackingAlert>>('/api/tracking/alerts', payload);
      if (response.success) {
        setAlerts((prev) => [response.data, ...prev]);
        setIsAlertDialogOpen(false);
        resetAlertForm();
        toast({
          title: 'Alerte créée',
          description: 'L\'alerte a été enregistrée.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de créer l\'alerte';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await api.put<ApiResponse<TrackingAlert>>(`/api/tracking/alerts/${alertId}`, {
        isResolved: true,
      });

      if (response.success) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? { ...alert, isResolved: true }
              : alert
          )
        );
        toast({
          title: 'Alerte résolue',
          description: 'L\'alerte a été marquée comme résolue.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de résoudre l\'alerte';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleGenerateAlerts = async () => {
    setIsGeneratingAlerts(true);
    try {
      const response = await api.post<ApiResponse<{ created: number }>>('/api/tracking/alerts/generate', {});
      if (response.success) {
        toast({
          title: 'Alertes générées',
          description: `${response.data.created ?? 0} alertes générées.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de générer les alertes';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAlerts(false);
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tracking & Métriques</h1>
          <p className="text-muted-foreground">
            Suivi de l&apos;engagement et alertes de la communauté.
          </p>
        </div>
        <Activity className="h-8 w-8 text-primary" />
      </div>

      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        data-testid="tracking-dashboard"
      >
        {[
          { label: 'Membres actifs', value: normalizedDashboard.memberCount },
          { label: 'Mécènes actifs', value: normalizedDashboard.patronCount },
          { label: 'Engagement moyen', value: normalizedDashboard.averageEngagement },
          { label: 'Inactifs 90j', value: normalizedDashboard.inactiveMembers },
        ].map((item) => (
          <Card key={item.label} data-testid="metrics-card">
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Métriques détaillées</CardTitle>
          <CardDescription>Filtrez par type d&apos;entité et métrique.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="grid gap-2">
              <Label htmlFor="entityTypeFilter">Type d&apos;entité</Label>
              <select
                id="entityTypeFilter"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value as EntityType)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm md:w-48"
                data-testid="filter-entity-type"
              >
                <option value="member">Membre</option>
                <option value="patron">Mécène</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="metricTypeFilter">Type de métrique</Label>
              <select
                id="metricTypeFilter"
                value={metricType}
                onChange={(event) => setMetricType(event.target.value as MetricType)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm md:w-56"
                data-testid="filter-metric-type"
              >
                <option value="engagement">Engagement</option>
                <option value="activity">Activité</option>
                <option value="contact">Contact</option>
                <option value="conversion">Conversion</option>
                <option value="status_change">Changement de statut</option>
              </select>
            </div>

            <div className="flex gap-2 md:pt-6">
              <Button variant="outline" onClick={() => setMetricType(metricType)}>
                Rafraîchir
              </Button>
              <Button onClick={() => setIsMetricDialogOpen(true)} data-testid="button-create-metric">
                Nouvelle métrique
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des métriques...
            </div>
          ) : metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune métrique disponible.</p>
          ) : (
            <div className="overflow-auto border rounded-md" data-testid="metrics-list">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Valeur</th>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.id} className="border-t">
                      <td className="px-3 py-2">{metric.description ?? '—'}</td>
                      <td className="px-3 py-2">{formatMetricType(metric.metricType)}</td>
                      <td className="px-3 py-2">{metric.metricValue ?? '—'}</td>
                      <td className="px-3 py-2">{formatDate(metric.recordedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Alertes prioritaires
          </CardTitle>
          <CardDescription>Alertes critiques détectées automatiquement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="severityFilter">Sévérité</Label>
                <select
                  id="severityFilter"
                  value={alertSeverityFilter}
                  onChange={(event) => setAlertSeverityFilter(event.target.value as AlertSeverity | 'all')}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm md:w-48"
                  data-testid="filter-severity"
                >
                  <option value="all">Toutes</option>
                  <option value="critical">Critique</option>
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="resolvedFilter">Statut</Label>
                <select
                  id="resolvedFilter"
                  value={alertResolvedFilter}
                  onChange={(event) => setAlertResolvedFilter(event.target.value as 'true' | 'false' | 'all')}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm md:w-48"
                  data-testid="filter-resolved"
                >
                  <option value="false">Non résolues</option>
                  <option value="true">Résolues</option>
                  <option value="all">Toutes</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void handleGenerateAlerts()}
                data-testid="button-generate-alerts"
                disabled={isGeneratingAlerts}
              >
                {isGeneratingAlerts ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Générer alertes
              </Button>
              <Button onClick={() => setIsAlertDialogOpen(true)} data-testid="button-create-alert">
                Nouvelle alerte
              </Button>
            </div>
          </div>

          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune alerte critique.</p>
          ) : (
            <div className="space-y-3" data-testid="alerts-list">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{alert.title}</p>
                      {alert.isResolved ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Résolue
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(alert.createdAt)} · {alert.entityEmail ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={alert.severity === 'high' || alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                    {!alert.isResolved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleResolveAlert(alert.id)}
                        data-testid="button-resolve"
                      >
                        Résoudre
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isMetricDialogOpen} onOpenChange={setIsMetricDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Nouvelle métrique</DialogTitle>
            <DialogDescription>Ajoutez une métrique manuelle pour un membre ou mécène.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="metricName">Nom</Label>
              <Input
                id="metricName"
                name="name"
                placeholder="Nom"
                value={metricForm.name}
                onChange={(event) => setMetricForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metricEntityType">Type d&apos;entité</Label>
              <select
                id="metricEntityType"
                value={metricForm.entityType}
                onChange={(event) => setMetricForm((prev) => ({ ...prev, entityType: event.target.value as EntityType }))}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="entityType-select"
              >
                <option value="member">Membre</option>
                <option value="patron">Mécène</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metricEntityId">ID entité</Label>
              <Input
                id="metricEntityId"
                value={metricForm.entityId}
                onChange={(event) => setMetricForm((prev) => ({ ...prev, entityId: event.target.value }))}
                placeholder="uuid-..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metricEntityEmail">Email entité</Label>
              <Input
                id="metricEntityEmail"
                value={metricForm.entityEmail}
                onChange={(event) => setMetricForm((prev) => ({ ...prev, entityEmail: event.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metricType">Type de métrique</Label>
              <select
                id="metricType"
                value={metricForm.metricType}
                onChange={(event) => setMetricForm((prev) => ({ ...prev, metricType: event.target.value as MetricType }))}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="engagement">Engagement</option>
                <option value="activity">Activité</option>
                <option value="contact">Contact</option>
                <option value="conversion">Conversion</option>
                <option value="status_change">Changement de statut</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metricValue">Valeur</Label>
              <Input
                id="metricValue"
                type="number"
                value={metricForm.metricValue}
                onChange={(event) => setMetricForm((prev) => ({ ...prev, metricValue: event.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMetricDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreateMetric()} disabled={isSubmittingMetric}>
              {isSubmittingMetric ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Nouvelle alerte</DialogTitle>
            <DialogDescription>Créer une alerte manuelle pour le suivi.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="alertTitle">Titre</Label>
              <Input
                id="alertTitle"
                name="title"
                placeholder="Titre"
                value={alertForm.title}
                onChange={(event) => setAlertForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alertMessage">Description</Label>
              <Textarea
                id="alertMessage"
                name="description"
                placeholder="Description"
                value={alertForm.message}
                onChange={(event) => setAlertForm((prev) => ({ ...prev, message: event.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alertEntityType">Type d&apos;entité</Label>
              <select
                id="alertEntityType"
                value={alertForm.entityType}
                onChange={(event) => setAlertForm((prev) => ({ ...prev, entityType: event.target.value as EntityType }))}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="member">Membre</option>
                <option value="patron">Mécène</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alertEntityId">ID entité</Label>
              <Input
                id="alertEntityId"
                value={alertForm.entityId}
                onChange={(event) => setAlertForm((prev) => ({ ...prev, entityId: event.target.value }))}
                placeholder="uuid-..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alertEntityEmail">Email entité</Label>
              <Input
                id="alertEntityEmail"
                value={alertForm.entityEmail}
                onChange={(event) => setAlertForm((prev) => ({ ...prev, entityEmail: event.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alertType">Type d&apos;alerte</Label>
              <select
                id="alertType"
                value={alertForm.alertType}
                onChange={(event) => setAlertForm((prev) => ({ ...prev, alertType: event.target.value as AlertType }))}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="stale">Inactivité</option>
                <option value="high_potential">Haut potentiel</option>
                <option value="needs_followup">Besoin de suivi</option>
                <option value="conversion_opportunity">Opportunité</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alertSeverity">Sévérité</Label>
              <select
                id="alertSeverity"
                value={alertForm.severity}
                onChange={(event) => setAlertForm((prev) => ({ ...prev, severity: event.target.value as AlertSeverity }))}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="severity-select"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAlertDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreateAlert()} disabled={isSubmittingAlert}>
              {isSubmittingAlert ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

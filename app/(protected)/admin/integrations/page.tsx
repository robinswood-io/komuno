'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Loader2, PlugZap, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';

type Provider = 'helloasso' | 'stripe' | 'brevo' | 'google_calendar' | 'microsoft_calendar' | 'ics' | 'webhook';
type AuthType = 'none' | 'api_key' | 'oauth' | 'webhook_secret';

interface ProviderCatalogItem {
  provider: Provider;
  label: string;
  priority: string;
  authType: AuthType;
  capabilities: string[];
  recommended: boolean;
}

interface IntegrationAccount {
  id: string;
  provider: Provider;
  label: string;
  status: string;
  authType: AuthType;
  scopes: string[];
  settings: Record<string, unknown>;
  secretFingerprint?: string | null;
  secretEncrypted?: boolean;
  hasSecret?: boolean;
  enabled: boolean;
  lastSyncAt?: string | null;
  lastError?: string | null;
  createdAt?: string;
}

interface SyncRun {
  id: string;
  provider: Provider;
  operation: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

interface WebhookDelivery {
  id: string;
  accountId: string;
  eventId: string;
  eventType: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  responseStatus?: number | null;
  error?: string | null;
  createdAt: string;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;
}

const providerLabels: Record<Provider, string> = {
  helloasso: 'HelloAsso',
  stripe: 'Stripe',
  brevo: 'Brevo',
  google_calendar: 'Google Calendar',
  microsoft_calendar: 'Microsoft Calendar',
  ics: 'Calendrier ICS',
  webhook: 'Webhooks sortants',
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'connected' || status === 'success' || status === 'delivered') return 'default';
  if (status === 'error' || status === 'failed') return 'destructive';
  return 'secondary';
}

function parseSettings(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Les réglages doivent être un objet JSON.');
  return parsed as Record<string, unknown>;
}

export default function AdminIntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>('helloasso');
  const [label, setLabel] = useState('HelloAsso');
  const [authType, setAuthType] = useState<AuthType>('oauth');
  const [secret, setSecret] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [settings, setSettings] = useState('{\n  "environment": "sandbox"\n}');

  const providersQuery = useQuery<ApiResponse<ProviderCatalogItem[]>>({
    queryKey: queryKeys.integrations.providers(),
    queryFn: () => api.get('/api/admin/integrations/providers'),
  });
  const accountsQuery = useQuery<ApiResponse<IntegrationAccount[]>>({
    queryKey: queryKeys.integrations.accounts(),
    queryFn: () => api.get('/api/admin/integrations/accounts'),
  });
  const syncRunsQuery = useQuery<ApiResponse<SyncRun[]>>({
    queryKey: queryKeys.integrations.syncRuns(),
    queryFn: () => api.get('/api/admin/integrations/sync-runs'),
  });
  const webhookDeliveriesQuery = useQuery<ApiResponse<WebhookDelivery[]>>({
    queryKey: queryKeys.integrations.webhookDeliveries(),
    queryFn: () => api.get('/api/admin/integrations/webhook-deliveries'),
  });

  const providers = providersQuery.data?.data ?? [];
  const accounts = accountsQuery.data?.data ?? [];
  const syncRuns = syncRunsQuery.data?.data ?? [];
  const webhookDeliveries = webhookDeliveriesQuery.data?.data ?? [];

  const currentProvider = useMemo(() => providers.find((item) => item.provider === provider), [provider, providers]);

  const invalidateIntegrations = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
  };

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/admin/integrations/accounts', {
      provider,
      label,
      authType,
      enabled,
      settings: parseSettings(settings),
      ...(secret ? { secret } : {}),
    }),
    onSuccess: async () => {
      toast({ title: 'Compte créé', description: 'Le secret éventuel a été chiffré et masqué.' });
      setSecret('');
      await invalidateIntegrations();
    },
    onError: (error) => toast({ title: 'Création impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/integrations/accounts/${id}/test`),
    onSuccess: async () => {
      toast({ title: 'Test enregistré', description: 'Consultez le dernier run pour le détail.' });
      await invalidateIntegrations();
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/integrations/accounts/${id}/sync`),
    onSuccess: async () => {
      toast({ title: 'Synchronisation enregistrée', description: 'Aucune donnée personnelle brute n’est stockée par le sync HelloAsso v1.' });
      await invalidateIntegrations();
    },
    onError: (error) => toast({ title: 'Synchronisation impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const webhookTestMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/integrations/accounts/${id}/webhooks/test`),
    onSuccess: async () => {
      toast({ title: 'Webhook de test envoyé', description: 'La delivery signée est visible dans l’onglet deliveries.' });
      await invalidateIntegrations();
    },
    onError: (error) => toast({ title: 'Webhook impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const retryWebhookMutation = useMutation({
    mutationFn: () => api.post('/api/admin/integrations/webhook-deliveries/retry-due'),
    onSuccess: async () => {
      toast({ title: 'Retries lancés', description: 'Les webhooks arrivés à échéance ont été rejoués.' });
      await invalidateIntegrations();
    },
    onError: (error) => toast({ title: 'Retry impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/integrations/accounts/${id}`),
    onSuccess: async () => {
      toast({ title: 'Compte supprimé' });
      await invalidateIntegrations();
    },
  });

  const selectProvider = (nextProvider: Provider) => {
    setProvider(nextProvider);
    const next = providers.find((item) => item.provider === nextProvider);
    setLabel(next?.label ?? providerLabels[nextProvider]);
    setAuthType(next?.authType ?? 'none');
    setSettings(nextProvider === 'helloasso'
      ? '{\n  "environment": "sandbox",\n  "clientId": "votre-client-id",\n  "organizationSlug": "votre-association",\n  "pageSize": 20,\n  "syncOrdersEnabled": false\n}'
      : nextProvider === 'brevo'
        ? '{\n  "baseUrl": "https://api.brevo.com/v3",\n  "senderName": "Komuno",\n  "senderEmail": "notifications@example.org",\n  "pageSize": 50\n}'
        : nextProvider === 'stripe'
          ? '{\n  "baseUrl": "https://api.stripe.com",\n  "mode": "test",\n  "pageSize": 25,\n  "syncProductsEnabled": true,\n  "syncPricesEnabled": true,\n  "syncCustomersEnabled": false\n}'
          : nextProvider === 'webhook'
            ? '{\n  "events": ["member.created", "event.created", "form.response.created", "payment.received"],\n  "timeoutMs": 5000,\n  "maxAttempts": 3\n}'
            : '{}');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <PlugZap className="h-8 w-8 text-primary" /> Intégrations
          </h1>
          <p className="text-muted-foreground">Socle sécurisé pour connecter HelloAsso, calendriers, paiements, notifications et webhooks.</p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/events/calendar.ics" target="_blank" rel="noopener noreferrer"><CalendarDays className="mr-2 h-4 w-4" /> Flux ICS public</a>
        </Button>
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog">Catalogue</TabsTrigger>
          <TabsTrigger value="accounts">Comptes</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {providersQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : providers.map((item) => (
              <Card key={item.provider} className={item.recommended ? 'border-primary/40' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{item.label}</CardTitle>
                      <CardDescription>{item.provider}</CardDescription>
                    </div>
                    <Badge variant={item.recommended ? 'default' : 'secondary'}>{item.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {item.capabilities.map((capability) => <Badge key={capability} variant="secondary">{capability}</Badge>)}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => selectProvider(item.provider)}>Préparer</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Créer un compte</CardTitle>
              <CardDescription>Les secrets sont chiffrés côté serveur et ne sont jamais réaffichés.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Select value={provider} onValueChange={(value) => selectProvider(value as Provider)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(providers.length ? providers : Object.entries(providerLabels).map(([key, label]) => ({ provider: key as Provider, label }))).map((item) => (
                      <SelectItem key={item.provider} value={item.provider}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Libellé</Label>
                <Input value={label} onChange={(event) => setLabel(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type d’authentification</Label>
                <Select value={authType} onValueChange={(value) => setAuthType(value as AuthType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="api_key">API key</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                    <SelectItem value="webhook_secret">Webhook secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secret / token initial</Label>
                <Input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={authType === 'none' ? 'Optionnel' : 'Coller le secret'} />
              </div>
              <div className="space-y-2">
                <Label>Réglages JSON non sensibles</Label>
                <Textarea value={settings} onChange={(event) => setSettings(event.target.value)} className="min-h-28 font-mono text-xs" />
                {provider === 'helloasso' && (
                  <p className="text-xs text-muted-foreground">
                    HelloAsso v1 : stocker le <strong>clientId</strong> ici et coller le <strong>clientSecret</strong> dans le champ secret. Le sync commandes reste en compteur uniquement par défaut.
                  </p>
                )}
                {provider === 'brevo' && (
                  <p className="text-xs text-muted-foreground">
                    Brevo v1 : coller la <strong>clé API</strong> dans le champ secret. Le sync récupère uniquement les métadonnées de listes, jamais les contacts.
                  </p>
                )}
                {provider === 'stripe' && (
                  <p className="text-xs text-muted-foreground">
                    Stripe v1 : coller une <strong>clé secrète/restreinte serveur</strong> sk_/rk_ dans le champ secret. Le sync récupère produits/prix et, si activé, un compteur clients sans payload client.
                  </p>
                )}
                {provider === 'webhook' && (
                  <p className="text-xs text-muted-foreground">
                    Webhook sortant : coller dans le champ secret soit l’URL HTTPS Make/n8n/Zapier, soit un JSON chiffré {`{"targetUrl":"https://...","signingSecret":"..."}`}. Les requêtes sont signées via <code>x-komuno-signature</code>.
                  </p>
                )}
                {currentProvider && <p className="text-xs text-muted-foreground">Recommandé : {currentProvider.capabilities.join(', ')}</p>}
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><Label>Actif</Label><p className="text-xs text-muted-foreground">Désactiver conserve la configuration.</p></div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Créer le compte
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="grid gap-4 xl:grid-cols-2">
          {accountsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : accounts.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucun compte connecté.</CardContent></Card>
          ) : accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{account.label}</CardTitle>
                    <CardDescription>{providerLabels[account.provider]} · {account.authType}</CardDescription>
                  </div>
                  <Badge variant={statusVariant(account.status)}>{account.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Secret</div><div>{account.hasSecret ? 'Chiffré' : 'Absent'}</div></div>
                  <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Fingerprint</div><div>{account.secretFingerprint ?? '—'}</div></div>
                </div>
                {account.lastError && <div className="rounded-lg border border-destructive/40 p-3 text-destructive">{account.lastError}</div>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => testMutation.mutate(account.id)} disabled={testMutation.isPending}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Tester
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => syncMutation.mutate(account.id)} disabled={syncMutation.isPending}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Sync
                  </Button>
                  {account.provider === 'webhook' && (
                    <Button size="sm" variant="outline" onClick={() => webhookTestMutation.mutate(account.id)} disabled={webhookTestMutation.isPending}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Test signé
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(account.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="runs" className="space-y-3">
          {syncRunsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : syncRuns.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucun run enregistré.</CardContent></Card>
          ) : syncRuns.map((run) => (
            <Card key={run.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> {providerLabels[run.provider]} · {run.operation}</div>
                  <div className="text-xs text-muted-foreground">{new Date(run.startedAt).toLocaleString('fr-FR')}</div>
                  {run.error && <div className="text-xs text-destructive">{run.error}</div>}
                </div>
                <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => retryWebhookMutation.mutate()} disabled={retryWebhookMutation.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" /> Rejouer les retries dus
            </Button>
          </div>
          {webhookDeliveriesQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : webhookDeliveries.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune delivery webhook sortant.</CardContent></Card>
          ) : webhookDeliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{delivery.eventType}</div>
                  <div className="text-xs text-muted-foreground">Tentatives {delivery.attemptCount}/{delivery.maxAttempts} · créée {new Date(delivery.createdAt).toLocaleString('fr-FR')}</div>
                  {delivery.responseStatus && <div className="text-xs text-muted-foreground">HTTP {delivery.responseStatus}</div>}
                  {delivery.error && <div className="text-xs text-destructive">{delivery.error}</div>}
                </div>
                <Badge variant={statusVariant(delivery.status)}>{delivery.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

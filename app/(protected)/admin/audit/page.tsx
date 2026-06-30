'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileJson, Loader2, Search, ShieldCheck } from 'lucide-react';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const dynamic = 'force-dynamic';

type AuditLog = {
  id: string;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  organizationId?: string | null;
  relationId?: string | null;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

type AuditResponse = {
  rows: AuditLog[];
  total: number;
  limit: number;
};

const quickActions = [
  'integrations.account.create',
  'integrations.account.update',
  'integrations.account.sync',
  'integrations.webhook.deliver',
  'federation.relation.create',
  'forms.create',
  'forms.publish',
  'forms.responses.export_csv',
];

const entityTypes = [
  'integration_account',
  'integration_outbound_webhook_delivery',
  'organization_relation',
  'survey_form',
  'survey_response',
  'event',
  'member',
];

function compactDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
}

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) query.set(key, value.trim());
  }
  return query.toString();
}

export default function AdminAuditPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState('100');

  const filters = useMemo(() => ({ action, entityType, entityId, actorEmail, from, to, limit }), [action, entityType, entityId, actorEmail, from, to, limit]);
  const auditQuery = useQuery<ApiResponse<AuditResponse>>({
    queryKey: queryKeys.audit.logs(filters),
    queryFn: () => api.get(`/api/admin/audit?${buildQuery(filters)}`),
  });

  const rows = auditQuery.data?.data?.rows ?? [];
  const total = auditQuery.data?.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ShieldCheck className="h-8 w-8 text-primary" /> Audit
          </h1>
          <p className="text-muted-foreground">Journal métier filtrable : action, acteur, entité, période et détail JSON.</p>
        </div>
        <Badge variant="secondary">{total} entrée(s)</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Les filtres sont exact-match côté API. Laissez vide pour inclure toutes les valeurs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={action || 'all'} onValueChange={(value) => setAction(value === 'all' ? '' : value)}>
              <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {quickActions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Ou saisir une action exacte" />
          </div>
          <div className="space-y-2">
            <Label>Entité</Label>
            <Select value={entityType || 'all'} onValueChange={(value) => setEntityType(value === 'all' ? '' : value)}>
              <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {entityTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="ID entité exact" />
          </div>
          <div className="space-y-2">
            <Label>Acteur</Label>
            <Input value={actorEmail} onChange={(event) => setActorEmail(event.target.value)} placeholder="email exact" />
            <Label>Limite</Label>
            <Input value={limit} onChange={(event) => setLimit(event.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-2">
            <Label>Depuis</Label>
            <Input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Label>Jusqu’à</Label>
            <Input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => auditQuery.refetch()} disabled={auditQuery.isFetching}>
              {auditQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Actualiser
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setAction(''); setEntityType(''); setEntityId(''); setActorEmail(''); setFrom(''); setTo(''); setLimit('100'); }}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {auditQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Aucun audit log trouvé.</CardContent></Card>
        ) : rows.map((row) => (
          <Card key={row.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{row.action}</Badge>
                    <Badge variant="secondary">{row.entityType}</Badge>
                    {row.actorEmail && <Badge variant="outline">{row.actorEmail}</Badge>}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {compactDate(row.createdAt)} · entityId {row.entityId ?? '—'} · org {row.organizationId ?? '—'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{row.id}</div>
              </div>
              <details className="rounded-lg border bg-muted/40 p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium"><FileJson className="h-4 w-4" /> Détail JSON</summary>
                <pre className="mt-3 overflow-auto rounded-md bg-background p-3 text-xs">{JSON.stringify(row, null, 2)}</pre>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

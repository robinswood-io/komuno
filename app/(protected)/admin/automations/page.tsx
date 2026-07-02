'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Play, RefreshCw, Send, Workflow } from 'lucide-react';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';

type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
  triggerType: string;
  currentVersion: number;
  draftDefinition: Record<string, unknown>;
  updatedAt: string;
}

interface AutomationRun {
  id: string;
  workflowId: string;
  status: string;
  error?: string | null;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  finishedAt?: string | null;
}

const triggerOptions = [
  { value: 'form.response.created', label: 'Réponse formulaire créée' },
  { value: 'member.created', label: 'Membre créé' },
  { value: 'event.created', label: 'Événement créé' },
];

const defaultDefinition = `{
  "trigger": {
    "type": "form.response.created",
    "config": {}
  },
  "steps": [
    {
      "id": "budget-qualified",
      "type": "condition",
      "config": {
        "all": [
          { "path": "data.answers.budget", "operator": "gte", "value": 30000 }
        ]
      }
    },
    {
      "id": "internal-audit",
      "type": "action.audit.record",
      "config": {
        "action": "automations.lead.qualified",
        "entityType": "survey_response",
        "entityId": "{{data.id}}",
        "metadata": {
          "formSlug": "{{data.formSlug}}",
          "respondentEmail": "{{data.respondentEmail}}"
        }
      }
    }
  ]
}`;

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'active' || status === 'succeeded') return 'default';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Le JSON doit être un objet.');
  return parsed as Record<string, unknown>;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminAutomationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('Qualification formulaire');
  const [description, setDescription] = useState('Workflow brouillon pour qualifier une réponse formulaire.');
  const [triggerType, setTriggerType] = useState('form.response.created');
  const [definition, setDefinition] = useState(defaultDefinition);
  const [testPayload, setTestPayload] = useState(`{
  "id": "test-response",
  "formSlug": "demo",
  "respondentEmail": "demo@example.org",
  "answers": { "budget": 30000 }
}`);

  const workflowsQuery = useQuery<ApiResponse<AutomationWorkflow[]>>({
    queryKey: queryKeys.automations.workflows(),
    queryFn: () => api.get('/api/admin/automations'),
  });

  const runsQuery = useQuery<ApiResponse<AutomationRun[]>>({
    queryKey: queryKeys.automations.runs({ limit: 50 }),
    queryFn: () => api.get('/api/admin/automations/runs', { limit: 50 }),
  });

  const workflows = workflowsQuery.data?.data ?? [];
  const runs = runsQuery.data?.data ?? [];

  const invalidateAutomations = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
  };

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/admin/automations', {
      name,
      description,
      triggerType,
      draftDefinition: parseJsonObject(definition),
    }),
    onSuccess: async () => {
      toast({ title: 'Workflow créé', description: 'Le brouillon a été enregistré.' });
      await invalidateAutomations();
    },
    onError: (error) => toast({ title: 'Création impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/automations/${id}/publish`, {}),
    onSuccess: async () => {
      toast({ title: 'Workflow publié', description: 'Une version immuable a été créée.' });
      await invalidateAutomations();
    },
    onError: (error) => toast({ title: 'Publication impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkflowStatus }) => api.post(`/api/admin/automations/${id}/status`, { status }),
    onSuccess: async () => {
      toast({ title: 'Statut mis à jour' });
      await invalidateAutomations();
    },
    onError: (error) => toast({ title: 'Changement impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/automations/${id}/test`, parseJsonObject(testPayload)),
    onSuccess: async () => {
      toast({ title: 'Test lancé', description: 'Consultez les runs pour le détail.' });
      await invalidateAutomations();
    },
    onError: (error) => toast({ title: 'Test impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const runDueMutation = useMutation({
    mutationFn: () => api.post('/api/admin/automations/run-due'),
    onSuccess: async () => {
      toast({ title: 'Runs relancés', description: 'Les runs arrivés à échéance ont été exécutés.' });
      await invalidateAutomations();
    },
    onError: (error) => toast({ title: 'Relance impossible', description: error instanceof Error ? error.message : 'Erreur inconnue', variant: 'destructive' }),
  });

  const workflowById = useMemo(() => new Map(workflows.map((workflow) => [workflow.id, workflow])), [workflows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Workflow className="h-8 w-8 text-primary" /> Automations
          </h1>
          <p className="text-muted-foreground">Workflows personnalisés versionnés pour relier formulaires, membres, événements, intégrations et actions internes.</p>
        </div>
        <Button variant="outline" onClick={() => runDueMutation.mutate()} disabled={runDueMutation.isPending}>
          {runDueMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Relancer les runs dus
        </Button>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="create">Créer</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {workflowsQuery.isLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Chargement…</CardContent></Card>
          ) : workflows.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun workflow pour le moment.</CardContent></Card>
          ) : workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {workflow.name}
                      <Badge variant={statusVariant(workflow.status)}>{workflow.status}</Badge>
                    </CardTitle>
                    <CardDescription>{workflow.description || '—'}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => publishMutation.mutate(workflow.id)} disabled={publishMutation.isPending}>
                      <Send className="mr-2 h-4 w-4" /> Publier
                    </Button>
                    <Button size="sm" variant={workflow.status === 'active' ? 'secondary' : 'default'} onClick={() => statusMutation.mutate({ id: workflow.id, status: workflow.status === 'active' ? 'paused' : 'active' })} disabled={statusMutation.isPending || (workflow.status !== 'active' && workflow.currentVersion <= 0)}>
                      {workflow.status === 'active' ? 'Mettre en pause' : 'Activer'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => testMutation.mutate(workflow.id)} disabled={testMutation.isPending || workflow.currentVersion <= 0}>
                      <Play className="mr-2 h-4 w-4" /> Tester
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                <div><span className="font-medium text-foreground">Déclencheur :</span> {workflow.triggerType}</div>
                <div><span className="font-medium text-foreground">Version :</span> {workflow.currentVersion || 'brouillon'}</div>
                <div><span className="font-medium text-foreground">MAJ :</span> {formatDate(workflow.updatedAt)}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Nouveau workflow brouillon</CardTitle>
              <CardDescription>Le workflow devra être publié avant activation. Les actions P0 disponibles sont condition, webhook.emit, member_task.create, audit.record et noop.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="automation-name">Nom</Label>
                  <Input id="automation-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Déclencheur</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {triggerOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="automation-description">Description</Label>
                <Input id="automation-description" value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="automation-definition">Définition JSON v1</Label>
                <Textarea id="automation-definition" className="min-h-[360px] font-mono text-xs" value={definition} onChange={(event) => setDefinition(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="automation-test-payload">Payload de test JSON</Label>
                <Textarea id="automation-test-payload" className="min-h-[140px] font-mono text-xs" value={testPayload} onChange={(event) => setTestPayload(event.target.value)} />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le workflow
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>Derniers runs</CardTitle>
              <CardDescription>Historique masqué des exécutions et erreurs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {runs.length === 0 ? <p className="text-sm text-muted-foreground">Aucun run pour le moment.</p> : runs.map((run) => {
                const workflow = workflowById.get(run.workflowId);
                return (
                  <div key={run.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="font-medium">{workflow?.name ?? run.workflowId}</div>
                        <div className="text-muted-foreground">Créé le {formatDate(run.createdAt)} · terminé {formatDate(run.finishedAt)}</div>
                      </div>
                      <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                    </div>
                    {run.error && <p className="mt-2 text-destructive">{run.error}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

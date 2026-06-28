'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowDownToLine, ArrowUpFromLine, Building2, Check, GitBranch, KeyRound, Loader2, Network, Plus, RotateCw, Send, X } from 'lucide-react';

interface OrganizationNetwork {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

interface Organization {
  id: string;
  networkId?: string | null;
  parentOrganizationId?: string | null;
  slug: string;
  name: string;
  type: 'network' | 'region' | 'section' | 'partner' | 'external';
  domain?: string | null;
  instanceUrl?: string | null;
  networkName?: string | null;
  parentName?: string | null;
  isActive: boolean;
}

interface OrganizationRelation {
  id: string;
  fromOrganizationId: string;
  toOrganizationId: string;
  relationType: string;
  status: string;
  permissions?: Record<string, unknown>;
  syncEnabled?: boolean;
  syncStatus?: string;
  lastSyncAt?: string | null;
  hasFederationToken?: boolean;
  hasOutboundFederationToken?: boolean;
  federationTokenFingerprint?: string | null;
  federationTokenRotatedAt?: string | null;
  federationTokenEncryptedAt?: string | null;
  fromName?: string;
  toName?: string;
  fromType?: string;
  toType?: string;
}

interface Syndication {
  id: string;
  eventId: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  direction: 'upward' | 'downward' | 'lateral';
  status: string;
  includeInAgenda: boolean;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string | null;
  sourceName?: string;
  targetName?: string;
  targetInstanceUrl?: string | null;
  remoteEventId?: string | null;
  remoteSyndicationId?: string | null;
  syncStatus?: string;
  syncError?: string | null;
  lastSyncAttemptAt?: string | null;
  syncAttempts?: number;
  createdAt: string;
}

interface EventItem {
  id: string;
  title: string;
  date: string;
  location?: string;
  organizationId?: string | null;
  federationStatus?: string;
  federationVisibility?: string;
}

interface FormItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  version: number;
  organizationId?: string | null;
  responseCount?: number;
  questionCount?: number;
}

interface FormSyndication {
  id: string;
  formId: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  direction: 'upward' | 'downward' | 'lateral';
  status: string;
  includeResponses: boolean;
  collectResponsesLocally: boolean;
  formTitle?: string;
  formSlug?: string;
  formStatus?: string;
  formVersion?: number;
  sourceName?: string;
  targetName?: string;
  targetInstanceUrl?: string | null;
  remoteFormId?: string | null;
  syncStatus?: string;
  syncError?: string | null;
  responseCount?: number;
  lastResponseAt?: string | null;
  createdAt: string;
}

interface OverviewPayload {
  success: boolean;
  data: {
    counts: {
      networks: number;
      organizations: number;
      relations: number;
      pendingUpward: number;
      pendingDownward: number;
      agendaItems: number;
    };
    recentSyndications: Syndication[];
  };
}

const organizationTypes = [
  { value: 'region', label: 'Région' },
  { value: 'section', label: 'Section' },
  { value: 'partner', label: 'Partenaire' },
  { value: 'external', label: 'Externe' },
  { value: 'network', label: 'Réseau' },
];

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  proposed: 'Proposé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  revoked: 'Révoqué',
  auto_accepted: 'Auto-accepté',
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export default function AdminFederationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNetwork, setNewNetwork] = useState({ slug: 'cjd-hauts-de-france', name: 'CJD Hauts-de-France', description: '' });
  const [newOrganization, setNewOrganization] = useState({
    name: '',
    slug: '',
    type: 'section',
    networkId: '',
    parentOrganizationId: '',
    domain: '',
    instanceUrl: '',
  });
  const [newRelation, setNewRelation] = useState({
    fromOrganizationId: '',
    toOrganizationId: '',
    relationType: 'region_section',
    federationToken: '',
    syncEnabled: true,
  });
  const [eventId, setEventId] = useState('');
  const [sourceOrganizationId, setSourceOrganizationId] = useState('');
  const [targetOrganizationId, setTargetOrganizationId] = useState('');
  const [targetOrganizationIds, setTargetOrganizationIds] = useState<string[]>([]);
  const [syndicationFilter, setSyndicationFilter] = useState('all');
  const [syndicationDirectionFilter, setSyndicationDirectionFilter] = useState('all');
  const [syndicationSourceFilter, setSyndicationSourceFilter] = useState('all');
  const [syndicationSyncFilter, setSyndicationSyncFilter] = useState('all');
  const [syndicationAgendaFilter, setSyndicationAgendaFilter] = useState('all');
  const [formId, setFormId] = useState('');
  const [formSourceOrganizationId, setFormSourceOrganizationId] = useState('');
  const [formTargetOrganizationId, setFormTargetOrganizationId] = useState('');
  const [formTargetOrganizationIds, setFormTargetOrganizationIds] = useState<string[]>([]);
  const [includeFormResponses, setIncludeFormResponses] = useState(false);
  const [formSyndicationFilter, setFormSyndicationFilter] = useState('all');
  const [rotatedTokenInfo, setRotatedTokenInfo] = useState<{ relationId: string; fingerprint?: string | null; tokenLength?: number } | null>(null);
  const [relationTokenDrafts, setRelationTokenDrafts] = useState<Record<string, string>>({});

  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewPayload>({
    queryKey: queryKeys.federation.overview(),
    queryFn: () => api.get('/api/admin/federation/overview'),
  });

  const { data: networksResponse } = useQuery<{ success: boolean; data: OrganizationNetwork[] }>({
    queryKey: queryKeys.federation.networks(),
    queryFn: () => api.get('/api/admin/federation/networks'),
  });

  const { data: organizationsResponse } = useQuery<{ success: boolean; data: Organization[] }>({
    queryKey: queryKeys.federation.organizations(),
    queryFn: () => api.get('/api/admin/federation/organizations'),
  });

  const { data: relationsResponse } = useQuery<{ success: boolean; data: OrganizationRelation[] }>({
    queryKey: queryKeys.federation.relations(),
    queryFn: () => api.get('/api/admin/federation/relations'),
  });

  const syndicationQueryParams = {
    status: syndicationFilter,
    direction: syndicationDirectionFilter,
    sourceOrganizationId: syndicationSourceFilter,
    syncStatus: syndicationSyncFilter,
    includeInAgenda: syndicationAgendaFilter,
  };

  const { data: syndicationsResponse } = useQuery<{ success: boolean; data: Syndication[] }>({
    queryKey: queryKeys.federation.syndications(syndicationQueryParams),
    queryFn: () => api.get('/api/admin/federation/syndications', syndicationQueryParams),
  });

  const { data: eventsResponse } = useQuery<PaginatedResponse<EventItem>>({
    queryKey: queryKeys.events.list({ page: 1, limit: 100 }),
    queryFn: () => api.get('/api/admin/events', { page: 1, limit: 100 }),
  });

  const { data: formsResponse } = useQuery<{ success: boolean; data: FormItem[] }>({
    queryKey: queryKeys.forms.list({ status: 'all' }),
    queryFn: () => api.get('/api/admin/forms', { status: 'all' }),
  });

  const formSyndicationQueryParams = { status: formSyndicationFilter };
  const { data: formSyndicationsResponse } = useQuery<{ success: boolean; data: FormSyndication[] }>({
    queryKey: queryKeys.federation.formSyndications(formSyndicationQueryParams),
    queryFn: () => api.get('/api/admin/federation/forms/syndications', formSyndicationQueryParams),
  });

  const networks = networksResponse?.data ?? [];
  const organizations = organizationsResponse?.data ?? [];
  const relations = relationsResponse?.data ?? [];
  const syndications = syndicationsResponse?.data ?? [];
  const events = eventsResponse?.data ?? [];
  const forms = formsResponse?.data ?? [];
  const formSyndications = formSyndicationsResponse?.data ?? [];
  const regions = organizations.filter((org) => org.type === 'region');
  const sections = organizations.filter((org) => org.type === 'section');
  const sourceSections = sections;

  const selectedEvent = useMemo(() => events.find((event) => event.id === eventId), [events, eventId]);
  const selectedForm = useMemo(() => forms.find((form) => form.id === formId), [forms, formId]);
  const selectedTargetsLabel = useMemo(() => targetOrganizationIds
    .map((id) => organizations.find((org) => org.id === id)?.name)
    .filter(Boolean)
    .join(', '), [targetOrganizationIds, organizations]);
  const selectedFormTargetsLabel = useMemo(() => formTargetOrganizationIds
    .map((id) => organizations.find((org) => org.id === id)?.name)
    .filter(Boolean)
    .join(', '), [formTargetOrganizationIds, organizations]);

  const invalidateFederation = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.federation.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
  };

  const createNetworkMutation = useMutation({
    mutationFn: () => api.post('/api/admin/federation/networks', newNetwork),
    onSuccess: () => {
      toast({ title: 'Réseau créé', description: 'Le réseau fédéré a été créé.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const createOrganizationMutation = useMutation({
    mutationFn: () => api.post('/api/admin/federation/organizations', {
      ...newOrganization,
      slug: newOrganization.slug || slugify(newOrganization.name),
      networkId: newOrganization.networkId || null,
      parentOrganizationId: newOrganization.parentOrganizationId || null,
      domain: newOrganization.domain || null,
      instanceUrl: newOrganization.instanceUrl || null,
    }),
    onSuccess: () => {
      toast({ title: 'Organisation créée', description: 'L’organisation a été ajoutée au graphe fédéré.' });
      setNewOrganization({ name: '', slug: '', type: 'section', networkId: '', parentOrganizationId: '', domain: '', instanceUrl: '' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const createRelationMutation = useMutation({
    mutationFn: () => api.post('/api/admin/federation/relations', {
      ...newRelation,
      federationToken: newRelation.federationToken || null,
      permissions: { events: true, syndication: true, interInstanceSync: Boolean(newRelation.federationToken), autoShareEventsToParent: true },
    }),
    onSuccess: () => {
      toast({ title: 'Lien créé', description: 'Le lien mère-fille / partenaire est actif.' });
      setNewRelation({ fromOrganizationId: '', toOrganizationId: '', relationType: 'region_section', federationToken: '', syncEnabled: true });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const proposeUpwardMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/federation/events/${eventId}/propose-upward`, {
      sourceOrganizationId: sourceOrganizationId || selectedEvent?.organizationId,
      targetOrganizationId,
    }),
    onSuccess: () => {
      toast({ title: 'Événement proposé', description: 'La région peut maintenant accepter ou refuser cet événement.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const publishDownwardMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/federation/events/${eventId}/publish-downward`, {
      sourceOrganizationId: sourceOrganizationId || selectedEvent?.organizationId,
      targetOrganizationIds,
      autoAccept: false,
    }),
    onSuccess: () => {
      toast({ title: 'Événement publié', description: 'Les sections ciblées peuvent maintenant l’agréger.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const updateSyndicationMutation = useMutation({
    mutationFn: ({ id, status, includeInAgenda }: { id: string; status: string; includeInAgenda?: boolean }) =>
      api.patch(`/api/admin/federation/syndications/${id}`, { status, includeInAgenda }),
    onSuccess: () => {
      toast({ title: 'Syndication mise à jour', description: 'Le statut fédéré a été enregistré.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const syncSyndicationMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/federation/syndications/${id}/sync`, {}),
    onSuccess: () => {
      toast({ title: 'Synchronisation relancée', description: 'Le statut de synchronisation a été mis à jour.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur sync', description: error.message, variant: 'destructive' }),
  });

  const rotateRelationTokenMutation = useMutation({
    mutationFn: (id: string) => api.post<{ data?: { tokenLength?: number; tokenFingerprint?: string | null; relation?: { id: string } } }>(`/api/admin/federation/relations/${id}/rotate-token`, { federationToken: relationTokenDrafts[id] }),
    onSuccess: (response: { data?: { tokenLength?: number; tokenFingerprint?: string | null; relation?: { id: string } } }) => {
      const relationId = response.data?.relation?.id;
      if (relationId) {
        setRotatedTokenInfo({ relationId, fingerprint: response.data?.tokenFingerprint, tokenLength: response.data?.tokenLength });
        setRelationTokenDrafts((current) => ({ ...current, [relationId]: '' }));
      }
      toast({ title: 'Jeton régénéré', description: `Fingerprint ${response.data?.tokenFingerprint ?? '—'} · longueur ${response.data?.tokenLength ?? '—'}. Le secret brut n’est pas affiché.` });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur rotation', description: error.message, variant: 'destructive' }),
  });

  const proposeFormUpwardMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/federation/forms/${formId}/propose-upward`, {
      sourceOrganizationId: formSourceOrganizationId || selectedForm?.organizationId,
      targetOrganizationId: formTargetOrganizationId,
      includeResponses: includeFormResponses,
    }),
    onSuccess: () => {
      toast({ title: 'Formulaire proposé', description: 'La région peut maintenant accepter ou refuser ce formulaire.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const publishFormDownwardMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/federation/forms/${formId}/publish-downward`, {
      sourceOrganizationId: formSourceOrganizationId || selectedForm?.organizationId,
      targetOrganizationIds: formTargetOrganizationIds,
      autoAccept: false,
      includeResponses: includeFormResponses,
    }),
    onSuccess: () => {
      toast({ title: 'Formulaire publié', description: 'Les sections ciblées peuvent maintenant le recevoir.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const updateFormSyndicationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/admin/federation/forms/syndications/${id}`, { status }),
    onSuccess: () => {
      toast({ title: 'Syndication formulaire mise à jour', description: 'Le statut fédéré a été enregistré.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const syncFormSyndicationMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/federation/forms/syndications/${id}/sync`, {}),
    onSuccess: () => {
      toast({ title: 'Synchronisation formulaire relancée', description: 'Le statut de synchronisation a été mis à jour.' });
      invalidateFederation();
    },
    onError: (error: Error) => toast({ title: 'Erreur sync', description: error.message, variant: 'destructive' }),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Network className="h-8 w-8" />
          Fédération
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les réseaux, régions, sections et la redescente / agrégation d’événements entre organisations liées.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          ['Réseaux', overview?.data.counts.networks],
          ['Organisations', overview?.data.counts.organizations],
          ['Liens actifs', overview?.data.counts.relations],
          ['Propositions sections', overview?.data.counts.pendingUpward],
          ['Publications région', overview?.data.counts.pendingDownward],
          ['Agenda fédéré', overview?.data.counts.agendaItems],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle>{overviewLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : value ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="organizations">Organisations</TabsTrigger>
          <TabsTrigger value="events">Flux événements</TabsTrigger>
          <TabsTrigger value="forms">Flux formulaires</TabsTrigger>
          <TabsTrigger value="syndications">Vue région / demandes</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5" /> Réseau</CardTitle>
                <CardDescription>Ex: CJD, CJD Hauts-de-France, autre réseau futur.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={newNetwork.name} onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value, slug: slugify(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={newNetwork.slug} onChange={(e) => setNewNetwork({ ...newNetwork, slug: e.target.value })} />
                </div>
                <Textarea value={newNetwork.description} onChange={(e) => setNewNetwork({ ...newNetwork, description: e.target.value })} placeholder="Description" />
                <Button onClick={() => createNetworkMutation.mutate()} disabled={createNetworkMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" /> Créer le réseau
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Organisation</CardTitle>
                <CardDescription>Région, section, partenaire ou externe explicitement séparé.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={newOrganization.name} onChange={(e) => setNewOrganization({ ...newOrganization, name: e.target.value, slug: slugify(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={newOrganization.slug} onChange={(e) => setNewOrganization({ ...newOrganization, slug: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newOrganization.type} onValueChange={(value) => setNewOrganization({ ...newOrganization, type: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{organizationTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Réseau</Label>
                    <Select value={newOrganization.networkId || 'none'} onValueChange={(value) => setNewOrganization({ ...newOrganization, networkId: value === 'none' ? '' : value })}>
                      <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun / externe</SelectItem>
                        {networks.map((network) => <SelectItem key={network.id} value={network.id}>{network.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Organisation mère</Label>
                  <Select value={newOrganization.parentOrganizationId || 'none'} onValueChange={(value) => setNewOrganization({ ...newOrganization, parentOrganizationId: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {organizations.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input value={newOrganization.domain} onChange={(e) => setNewOrganization({ ...newOrganization, domain: e.target.value })} placeholder="domaine.fr" />
                <Input value={newOrganization.instanceUrl} onChange={(e) => setNewOrganization({ ...newOrganization, instanceUrl: e.target.value })} placeholder="https://instance.fr" />
                <Button onClick={() => createOrganizationMutation.mutate()} disabled={createOrganizationMutation.isPending || !newOrganization.name.trim()}>
                  <Plus className="h-4 w-4 mr-2" /> Créer l’organisation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" /> Lien mère-fille</CardTitle>
                <CardDescription>La région vers la section, ou un partenariat explicite.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Organisation mère / source</Label>
                  <Select value={newRelation.fromOrganizationId || 'none'} onValueChange={(value) => setNewRelation({ ...newRelation, fromOrganizationId: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sélectionner</SelectItem>
                      {organizations.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Organisation fille / cible</Label>
                  <Select value={newRelation.toOrganizationId || 'none'} onValueChange={(value) => setNewRelation({ ...newRelation, toOrganizationId: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sélectionner</SelectItem>
                      {organizations.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jeton inter-instance partagé</Label>
                  <Input
                    value={newRelation.federationToken}
                    onChange={(e) => setNewRelation({ ...newRelation, federationToken: e.target.value })}
                    placeholder="Jeton déjà partagé avec l’autre instance"
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Requis uniquement si les deux organisations vivent sur deux domaines / instances distincts. Le jeton est stocké chiffré et n’est jamais réaffiché ; vérifiez ensuite longueur/fingerprint.
                  </p>
                </div>
                <Button onClick={() => createRelationMutation.mutate()} disabled={createRelationMutation.isPending || !newRelation.fromOrganizationId || !newRelation.toOrganizationId}>
                  <GitBranch className="h-4 w-4 mr-2" /> Créer le lien
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organisations connues</CardTitle>
              <CardDescription>Seules les organisations reliées explicitement peuvent partager des données.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Organisation</TableHead><TableHead>Type</TableHead><TableHead>Réseau</TableHead><TableHead>Parent</TableHead><TableHead>Domaine</TableHead></TableRow></TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell><div className="font-medium">{org.name}</div><div className="text-xs text-muted-foreground">{org.slug}</div></TableCell>
                      <TableCell><Badge variant="outline">{organizationTypes.find((type) => type.value === org.type)?.label ?? org.type}</Badge></TableCell>
                      <TableCell>{org.networkName ?? '—'}</TableCell>
                      <TableCell>{org.parentName ?? '—'}</TableCell>
                      <TableCell>{org.domain ?? org.instanceUrl ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Liens actifs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {relations.length === 0 ? <p className="text-sm text-muted-foreground">Aucun lien explicite pour le moment.</p> : relations.map((relation) => (
                  <div key={relation.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium">{relation.fromName}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">{relation.toName}</span>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{relation.relationType}</Badge>
                        <Badge variant={relation.hasFederationToken ? 'default' : 'outline'}>
                          {relation.hasFederationToken ? 'Token entrant configuré' : 'Sync locale seulement'}
                        </Badge>
                        <Badge variant={relation.hasOutboundFederationToken ? 'default' : 'outline'}>
                          {relation.hasOutboundFederationToken ? 'Sortant chiffré/legacy OK' : 'Sortant absent'}
                        </Badge>
                        {relation.syncStatus && <Badge variant="outline">Sync {relation.syncStatus}</Badge>}
                        {relation.federationTokenFingerprint && <Badge variant="outline">FP {relation.federationTokenFingerprint}</Badge>}
                        {relation.federationTokenRotatedAt && <span>Rotation {formatDate(relation.federationTokenRotatedAt)}</span>}
                        {relation.federationTokenEncryptedAt && <span>Vault {formatDate(relation.federationTokenEncryptedAt)}</span>}
                      </div>
                      {rotatedTokenInfo?.relationId === relation.id && (
                        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                          <div className="font-medium">Rotation effectuée sans afficher le secret brut</div>
                          <div>Fingerprint : <span className="font-mono">{rotatedTokenInfo.fingerprint ?? '—'}</span></div>
                          <div>Longueur : {rotatedTokenInfo.tokenLength ?? '—'} caractères</div>
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-[280px] flex-col items-end gap-2">
                      <div className="flex w-full gap-2">
                        <Input
                          className="font-mono"
                          type="password"
                          placeholder="Nouveau jeton partagé"
                          value={relationTokenDrafts[relation.id] ?? ''}
                          onChange={(event) => setRelationTokenDrafts((current) => ({ ...current, [relation.id]: event.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rotateRelationTokenMutation.mutate(relation.id)}
                          disabled={rotateRelationTokenMutation.isPending || !(relationTokenDrafts[relation.id] ?? '').trim()}
                        >
                          <KeyRound className="h-4 w-4 mr-1" /> Remplacer
                        </Button>
                      </div>
                      <p className="max-w-[360px] text-right text-xs text-muted-foreground">
                        Le jeton saisi est stocké chiffré et n’est jamais ré-affiché. Vérifiez ensuite longueur/fingerprint sur les deux instances.
                      </p>
                      <Badge>{relation.syncEnabled === false ? 'Sync off' : 'Actif'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partager un événement</CardTitle>
              <CardDescription>Flux montant Section → Région, ou descendant Région → Sections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Événement</Label>
                  <Select value={eventId || 'none'} onValueChange={(value) => setEventId(value === 'none' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un événement" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sélectionner</SelectItem>
                      {events.map((event) => <SelectItem key={event.id} value={event.id}>{event.title} — {formatDate(event.date)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Organisation source</Label>
                  <Select value={sourceOrganizationId || 'auto'} onValueChange={(value) => setSourceOrganizationId(value === 'auto' ? '' : value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Organisation de l’événement</SelectItem>
                      {organizations.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  {selectedEvent ? (
                    <>
                      <div className="font-medium text-foreground">{selectedEvent.title}</div>
                      <div>{formatDate(selectedEvent.date)}</div>
                      <div>{selectedEvent.location ?? 'Lieu non renseigné'}</div>
                    </>
                  ) : 'Choisissez un événement à fédérer.'}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><ArrowUpFromLine className="h-5 w-5" /> Section → Région</CardTitle>
                    <CardDescription>Proposer un événement local à une région mère.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Label>Région cible</Label>
                    <Select value={targetOrganizationId || 'none'} onValueChange={(value) => setTargetOrganizationId(value === 'none' ? '' : value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sélectionner une région</SelectItem>
                        {regions.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => proposeUpwardMutation.mutate()} disabled={!eventId || !targetOrganizationId || proposeUpwardMutation.isPending}>
                      <Send className="h-4 w-4 mr-2" /> Proposer à la région
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><ArrowDownToLine className="h-5 w-5" /> Région → Sections</CardTitle>
                    <CardDescription>Publier un événement régional vers des sections explicitement liées.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Label>Sections cibles</Label>
                    <Select value="add" onValueChange={(value) => {
                      if (value !== 'add' && !targetOrganizationIds.includes(value)) setTargetOrganizationIds([...targetOrganizationIds, value]);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Ajouter une section" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Ajouter une section</SelectItem>
                        {sections.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {targetOrganizationIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {targetOrganizationIds.map((id) => (
                          <Badge key={id} variant="outline" className="gap-1">
                            {organizations.find((org) => org.id === id)?.name}
                            <button type="button" onClick={() => setTargetOrganizationIds(targetOrganizationIds.filter((targetId) => targetId !== id))}>×</button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Button onClick={() => publishDownwardMutation.mutate()} disabled={!eventId || targetOrganizationIds.length === 0 || publishDownwardMutation.isPending}>
                      <Send className="h-4 w-4 mr-2" /> Publier vers {selectedTargetsLabel || 'les sections'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partager un formulaire / sondage</CardTitle>
              <CardDescription>
                Flux montant Section → Région, ou descendant Région → Sections. Les réponses ne sont consolidées qu’en agrégats et seulement si l’option est cochée.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Formulaire</Label>
                  <Select value={formId || 'none'} onValueChange={(value) => setFormId(value === 'none' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un formulaire" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sélectionner</SelectItem>
                      {forms.map((form) => <SelectItem key={form.id} value={form.id}>{form.title} — v{form.version} ({form.status})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Organisation source</Label>
                  <Select value={formSourceOrganizationId || 'auto'} onValueChange={(value) => setFormSourceOrganizationId(value === 'auto' ? '' : value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Organisation du formulaire</SelectItem>
                      {organizations.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  {selectedForm ? (
                    <>
                      <div className="font-medium text-foreground">{selectedForm.title}</div>
                      <div>/{selectedForm.slug} · v{selectedForm.version} · {selectedForm.questionCount ?? 0} questions</div>
                      <div>{selectedForm.responseCount ?? 0} réponses locales</div>
                    </>
                  ) : 'Choisissez un formulaire à fédérer.'}
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={includeFormResponses}
                  onChange={(event) => setIncludeFormResponses(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Inclure la consolidation agrégée des réponses</span>
                  <span className="block text-muted-foreground">Envoie uniquement compteurs/statistiques par question, sans exports CSV ni réponses libres brutes.</span>
                </span>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><ArrowUpFromLine className="h-5 w-5" /> Section → Région</CardTitle>
                    <CardDescription>Proposer un formulaire local à une région mère.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Label>Région cible</Label>
                    <Select value={formTargetOrganizationId || 'none'} onValueChange={(value) => setFormTargetOrganizationId(value === 'none' ? '' : value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sélectionner une région</SelectItem>
                        {regions.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => proposeFormUpwardMutation.mutate()} disabled={!formId || !formTargetOrganizationId || proposeFormUpwardMutation.isPending}>
                      <Send className="h-4 w-4 mr-2" /> Proposer à la région
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><ArrowDownToLine className="h-5 w-5" /> Région → Sections</CardTitle>
                    <CardDescription>Distribuer un formulaire régional vers des sections explicitement liées.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Label>Sections cibles</Label>
                    <Select value="add" onValueChange={(value) => {
                      if (value !== 'add' && !formTargetOrganizationIds.includes(value)) setFormTargetOrganizationIds([...formTargetOrganizationIds, value]);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Ajouter une section" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Ajouter une section</SelectItem>
                        {sections.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {formTargetOrganizationIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formTargetOrganizationIds.map((id) => (
                          <Badge key={id} variant="outline" className="gap-1">
                            {organizations.find((org) => org.id === id)?.name}
                            <button type="button" onClick={() => setFormTargetOrganizationIds(formTargetOrganizationIds.filter((targetId) => targetId !== id))}>×</button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Button onClick={() => publishFormDownwardMutation.mutate()} disabled={!formId || formTargetOrganizationIds.length === 0 || publishFormDownwardMutation.isPending}>
                      <Send className="h-4 w-4 mr-2" /> Publier vers {selectedFormTargetsLabel || 'les sections'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Syndications de formulaires</CardTitle>
                <CardDescription>Copies fédérées, sync inter-instance et agrégats de réponses.</CardDescription>
              </div>
              <Select value={formSyndicationFilter} onValueChange={setFormSyndicationFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="proposed">Proposés</SelectItem>
                  <SelectItem value="accepted">Acceptés</SelectItem>
                  <SelectItem value="rejected">Refusés</SelectItem>
                  <SelectItem value="revoked">Révoqués</SelectItem>
                  <SelectItem value="auto_accepted">Auto-acceptés</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formulaire</TableHead>
                    <TableHead>Flux</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Réponses</TableHead>
                    <TableHead>Sync</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formSyndications.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucune syndication de formulaire.</TableCell></TableRow>
                  ) : formSyndications.map((syndication) => (
                    <TableRow key={syndication.id}>
                      <TableCell>
                        <div className="font-medium">{syndication.formTitle}</div>
                        <div className="text-xs text-muted-foreground">/{syndication.formSlug} · v{syndication.formVersion} · {syndication.formStatus}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{syndication.sourceName} → {syndication.targetName}</div>
                        <Badge variant="outline">{syndication.direction === 'upward' ? 'Section → Région' : 'Région → Section'}</Badge>
                      </TableCell>
                      <TableCell><Badge>{statusLabels[syndication.status] ?? syndication.status}</Badge></TableCell>
                      <TableCell>
                        {syndication.includeResponses ? (
                          <div className="text-sm">
                            <Badge variant="outline">Agrégats activés</Badge>
                            <div className="text-xs text-muted-foreground mt-1">{syndication.responseCount ?? 0} réponses · dernier {formatDate(syndication.lastResponseAt ?? undefined)}</div>
                          </div>
                        ) : <span className="text-muted-foreground">Non consolidées</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={syndication.syncStatus === 'failed' ? 'destructive' : 'outline'}>{syndication.syncStatus ?? 'local'}</Badge>
                          {syndication.targetInstanceUrl && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{syndication.targetInstanceUrl}</span>}
                          {syndication.syncError && <span className="text-xs text-destructive truncate max-w-[220px]" title={syndication.syncError}>{syndication.syncError}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => updateFormSyndicationMutation.mutate({ id: syndication.id, status: 'accepted' })}>
                          <Check className="h-4 w-4 mr-1" /> Accepter
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateFormSyndicationMutation.mutate({ id: syndication.id, status: 'rejected' })}>
                          <X className="h-4 w-4 mr-1" /> Refuser
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => syncFormSyndicationMutation.mutate(syndication.id)} disabled={syncFormSyndicationMutation.isPending}>
                          <RotateCw className="h-4 w-4 mr-1" /> Sync
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="syndications" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Vue région — événements remontés par les sections</CardTitle>
                <CardDescription>
                  Ces événements restent admin-only par défaut : ils ne sont pas affichés sur le front public régional.
                </CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Select value={syndicationFilter} onValueChange={setSyndicationFilter}>
                  <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="proposed">Proposés</SelectItem>
                    <SelectItem value="accepted">Acceptés</SelectItem>
                    <SelectItem value="rejected">Refusés</SelectItem>
                    <SelectItem value="revoked">Révoqués</SelectItem>
                    <SelectItem value="auto_accepted">Auto-acceptés</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={syndicationDirectionFilter} onValueChange={setSyndicationDirectionFilter}>
                  <SelectTrigger><SelectValue placeholder="Flux" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous flux</SelectItem>
                    <SelectItem value="upward">Sections → Région</SelectItem>
                    <SelectItem value="downward">Région → Sections</SelectItem>
                    <SelectItem value="lateral">Latéral</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={syndicationSourceFilter} onValueChange={setSyndicationSourceFilter}>
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes sections</SelectItem>
                    {sourceSections.map((section) => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={syndicationSyncFilter} onValueChange={setSyndicationSyncFilter}>
                  <SelectTrigger><SelectValue placeholder="Sync" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toute sync</SelectItem>
                    <SelectItem value="received">Reçu</SelectItem>
                    <SelectItem value="synced">Synchronisé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échec</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={syndicationAgendaFilter} onValueChange={setSyndicationAgendaFilter}>
                  <SelectTrigger><SelectValue placeholder="Agenda" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout agenda</SelectItem>
                    <SelectItem value="false">Admin-only</SelectItem>
                    <SelectItem value="true">Inclus agenda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Événement</TableHead>
                    <TableHead>Flux</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Agenda</TableHead>
                    <TableHead>Sync</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syndications.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucune demande fédérée.</TableCell></TableRow>
                  ) : syndications.map((syndication) => (
                    <TableRow key={syndication.id}>
                      <TableCell>
                        <div className="font-medium">{syndication.eventTitle}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(syndication.eventDate)} · {syndication.eventLocation ?? 'Lieu non renseigné'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{syndication.sourceName} → {syndication.targetName}</div>
                        <Badge variant="outline">{syndication.direction === 'upward' ? 'Section → Région' : 'Région → Section'}</Badge>
                      </TableCell>
                      <TableCell><Badge>{statusLabels[syndication.status] ?? syndication.status}</Badge></TableCell>
                      <TableCell>{syndication.includeInAgenda ? <Badge variant="outline">Inclus</Badge> : <span className="text-muted-foreground">Non</span>}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={syndication.syncStatus === 'failed' ? 'destructive' : 'outline'}>{syndication.syncStatus ?? 'local'}</Badge>
                          {syndication.targetInstanceUrl && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{syndication.targetInstanceUrl}</span>}
                          {syndication.syncError && <span className="text-xs text-destructive truncate max-w-[220px]" title={syndication.syncError}>{syndication.syncError}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => updateSyndicationMutation.mutate({ id: syndication.id, status: 'accepted', includeInAgenda: true })}>
                          <Check className="h-4 w-4 mr-1" /> Accepter
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateSyndicationMutation.mutate({ id: syndication.id, status: 'rejected', includeInAgenda: false })}>
                          <X className="h-4 w-4 mr-1" /> Refuser
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => syncSyndicationMutation.mutate(syndication.id)} disabled={syncSyndicationMutation.isPending}>
                          <RotateCw className="h-4 w-4 mr-1" /> Sync
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

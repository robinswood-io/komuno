'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Download, GraduationCap, Plus, RefreshCw, Send, Users } from 'lucide-react';
import { api, queryKeys } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
  scheduled: 'Planifiée',
  full: 'Complète',
  cancelled: 'Annulée',
  completed: 'Terminée',
  new: 'Nouveau',
  contacted: 'Contacté',
  confirmed: 'Confirmé',
  declined: 'Décliné',
};

const badgeVariant = (status?: string) => {
  if (status === 'published' || status === 'scheduled' || status === 'confirmed') return 'default' as const;
  if (status === 'archived' || status === 'cancelled' || status === 'declined') return 'destructive' as const;
  return 'secondary' as const;
};

type TrainingSession = {
  id: string;
  trainingId: string;
  startsAt: string;
  endsAt?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  city?: string | null;
  capacity?: number | null;
  status: string;
};

type TrainingProgram = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  category?: string | null;
  audience?: string | null;
  objectives?: string[];
  status: string;
  federationVisibility: string;
  federationStatus: string;
  interestCount: number;
  sessions: TrainingSession[];
  updatedAt: string;
};

type TrainingInterest = {
  id: string;
  createdAt: string;
  status: string;
  respondentName: string;
  respondentEmail: string;
  company?: string | null;
  phone?: string | null;
  message?: string | null;
  consentAccepted: boolean;
  training: TrainingProgram;
  session?: TrainingSession | null;
};

type ApiResponse<T> = { success: boolean; data: T };

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminTrainingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState({
    title: '',
    category: '',
    audience: '',
    description: '',
    objectives: '',
    federationVisibility: 'local',
  });
  const [sessionForm, setSessionForm] = useState({
    startsAt: '',
    endsAt: '',
    locationName: '',
    locationAddress: '',
    city: '',
    capacity: '',
  });

  const trainingsQuery = useQuery({
    queryKey: queryKeys.trainings.list({ includeArchived: true }),
    queryFn: async () => (await api.get<ApiResponse<TrainingProgram[]>>('/api/admin/trainings', { includeArchived: true })).data,
  });

  const activeTrainingId = selectedTrainingId || trainingsQuery.data?.[0]?.id;

  const interestsQuery = useQuery({
    queryKey: queryKeys.trainings.interests({ trainingId: activeTrainingId || undefined }),
    queryFn: async () => (await api.get<ApiResponse<TrainingInterest[]>>('/api/admin/trainings/interests', { trainingId: activeTrainingId || undefined, limit: 300 })).data,
    enabled: !!activeTrainingId,
  });

  const selectedTraining = useMemo(
    () => trainingsQuery.data?.find(training => training.id === activeTrainingId),
    [trainingsQuery.data, activeTrainingId],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trainings.all });
  };

  const createTrainingMutation = useMutation({
    mutationFn: async () => api.post<ApiResponse<TrainingProgram>>('/api/admin/trainings', {
      title: programForm.title,
      category: programForm.category || null,
      audience: programForm.audience || null,
      description: programForm.description || null,
      objectives: programForm.objectives.split('\n').map(item => item.trim()).filter(Boolean),
      federationVisibility: programForm.federationVisibility,
    }),
    onSuccess: response => {
      toast({ title: 'Formation créée', description: response.data.title });
      setProgramForm({ title: '', category: '', audience: '', description: '', objectives: '', federationVisibility: 'local' });
      setSelectedTrainingId(response.data.id);
      invalidate();
    },
    onError: (error: Error) => toast({ title: 'Création impossible', description: error.message, variant: 'destructive' }),
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => api.post<ApiResponse<TrainingProgram>>(`/api/admin/trainings/${id}/publish`),
    onSuccess: () => { toast({ title: 'Formation publiée' }); invalidate(); },
    onError: (error: Error) => toast({ title: 'Publication impossible', description: error.message, variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => api.post<ApiResponse<TrainingProgram>>(`/api/admin/trainings/${id}/archive`),
    onSuccess: () => { toast({ title: 'Formation archivée' }); invalidate(); },
    onError: (error: Error) => toast({ title: 'Archivage impossible', description: error.message, variant: 'destructive' }),
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTraining) throw new Error('Sélectionnez une formation');
      return api.post<ApiResponse<TrainingSession>>(`/api/admin/trainings/${selectedTraining.id}/sessions`, {
        startsAt: new Date(sessionForm.startsAt).toISOString(),
        endsAt: sessionForm.endsAt ? new Date(sessionForm.endsAt).toISOString() : null,
        locationName: sessionForm.locationName || null,
        locationAddress: sessionForm.locationAddress || null,
        city: sessionForm.city || null,
        capacity: sessionForm.capacity ? Number(sessionForm.capacity) : null,
      });
    },
    onSuccess: () => {
      toast({ title: 'Date ajoutée' });
      setSessionForm({ startsAt: '', endsAt: '', locationName: '', locationAddress: '', city: '', capacity: '' });
      invalidate();
    },
    onError: (error: Error) => toast({ title: 'Date impossible', description: error.message, variant: 'destructive' }),
  });

  const updateInterestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => api.patch<ApiResponse<TrainingInterest>>(`/api/admin/trainings/interests/${id}/status`, { status }),
    onSuccess: () => { toast({ title: 'Statut mis à jour' }); invalidate(); },
    onError: (error: Error) => toast({ title: 'Mise à jour impossible', description: error.message, variant: 'destructive' }),
  });

  const exportUrl = selectedTraining ? `/api/admin/trainings/interests/export.csv?trainingId=${encodeURIComponent(selectedTraining.id)}` : '/api/admin/trainings/interests/export.csv';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <GraduationCap className="h-8 w-8" /> Formations
          </h1>
          <p className="text-muted-foreground">
            Catalogue régional/section, dates disponibles, manifestations d’intérêt et exports audités.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => invalidate()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
          <Button variant="outline" onClick={() => { window.location.href = exportUrl; }}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle formation</CardTitle>
              <CardDescription>Créer un programme, puis ajouter une ou plusieurs dates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={programForm.title} onChange={e => setProgramForm({ ...programForm, title: e.target.value })} placeholder="Ex. Prise de parole en public" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Input value={programForm.category} onChange={e => setProgramForm({ ...programForm, category: e.target.value })} placeholder="Leadership" />
                </div>
                <div className="space-y-2">
                  <Label>Visibilité</Label>
                  <select className="h-10 rounded-md border bg-background px-3 text-sm" value={programForm.federationVisibility} onChange={e => setProgramForm({ ...programForm, federationVisibility: e.target.value })}>
                    <option value="local">Locale</option>
                    <option value="child_sections">Région → sections</option>
                    <option value="parent_region">Section → région</option>
                    <option value="network">Réseau</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Public cible</Label>
                <Input value={programForm.audience} onChange={e => setProgramForm({ ...programForm, audience: e.target.value })} placeholder="Membres, bureaux, jeunes dirigeants…" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={programForm.description} onChange={e => setProgramForm({ ...programForm, description: e.target.value })} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Objectifs — un par ligne</Label>
                <Textarea value={programForm.objectives} onChange={e => setProgramForm({ ...programForm, objectives: e.target.value })} rows={3} />
              </div>
              <Button disabled={!programForm.title || createTrainingMutation.isPending} onClick={() => createTrainingMutation.mutate()}>
                <Plus className="mr-2 h-4 w-4" /> Créer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Catalogue</CardTitle>
              <CardDescription>{trainingsQuery.data?.length || 0} formation(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {trainingsQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
              {trainingsQuery.data?.map(training => (
                <button
                  key={training.id}
                  className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted ${selectedTraining?.id === training.id ? 'border-primary bg-muted' : ''}`}
                  onClick={() => setSelectedTrainingId(training.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong>{training.title}</strong>
                    <Badge variant={badgeVariant(training.status)}>{statusLabels[training.status] || training.status}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{training.sessions.length} date(s)</span>
                    <span>{training.interestCount} intérêt(s)</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedTraining ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>{selectedTraining.title}</CardTitle>
                      <CardDescription>{selectedTraining.category || 'Formation'} · {selectedTraining.audience || 'Tous publics'}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={badgeVariant(selectedTraining.status)}>{statusLabels[selectedTraining.status] || selectedTraining.status}</Badge>
                      <Badge variant="outline">{selectedTraining.federationVisibility}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTraining.description && <p className="whitespace-pre-wrap text-sm">{selectedTraining.description}</p>}
                  {!!selectedTraining.objectives?.length && (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {selectedTraining.objectives.map((objective, index) => <li key={index}>{objective}</li>)}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={selectedTraining.status === 'published' || publishMutation.isPending} onClick={() => publishMutation.mutate(selectedTraining.id)}>
                      <Send className="mr-2 h-4 w-4" /> Publier
                    </Button>
                    <Button size="sm" variant="outline" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(selectedTraining.id)}>
                      Archiver
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Dates et lieux</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Début</Label>
                      <Input type="datetime-local" value={sessionForm.startsAt} onChange={e => setSessionForm({ ...sessionForm, startsAt: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fin</Label>
                      <Input type="datetime-local" value={sessionForm.endsAt} onChange={e => setSessionForm({ ...sessionForm, endsAt: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Lieu</Label>
                      <Input value={sessionForm.locationName} onChange={e => setSessionForm({ ...sessionForm, locationName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ville</Label>
                      <Input value={sessionForm.city} onChange={e => setSessionForm({ ...sessionForm, city: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Adresse</Label>
                      <Input value={sessionForm.locationAddress} onChange={e => setSessionForm({ ...sessionForm, locationAddress: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacité</Label>
                      <Input type="number" min="1" value={sessionForm.capacity} onChange={e => setSessionForm({ ...sessionForm, capacity: e.target.value })} />
                    </div>
                  </div>
                  <Button disabled={!sessionForm.startsAt || createSessionMutation.isPending} onClick={() => createSessionMutation.mutate()}>
                    <Plus className="mr-2 h-4 w-4" /> Ajouter une date
                  </Button>

                  <div className="space-y-2">
                    {selectedTraining.sessions.map(session => (
                      <div key={session.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <strong>{formatDate(session.startsAt)}</strong>
                          <Badge variant={badgeVariant(session.status)}>{statusLabels[session.status] || session.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{session.locationName || 'Lieu à préciser'}{session.city ? ` · ${session.city}` : ''}</p>
                        {session.capacity && <p className="text-xs text-muted-foreground">Capacité : {session.capacity}</p>}
                      </div>
                    ))}
                    {selectedTraining.sessions.length === 0 && <p className="text-sm text-muted-foreground">Aucune date pour l’instant.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Manifestations d’intérêt</CardTitle>
                  <CardDescription>{interestsQuery.data?.length || 0} réponse(s) affichée(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {interestsQuery.data?.map(interest => (
                    <div key={interest.id} className="rounded-lg border p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <strong>{interest.respondentName}</strong>
                          <p className="text-sm text-muted-foreground">{interest.respondentEmail}{interest.company ? ` · ${interest.company}` : ''}</p>
                          <p className="text-xs text-muted-foreground">{interest.session ? formatDate(interest.session.startsAt) : 'Intérêt sans date précise'}</p>
                        </div>
                        <select
                          className="h-9 rounded-md border bg-background px-2 text-sm"
                          value={interest.status}
                          onChange={e => updateInterestMutation.mutate({ id: interest.id, status: e.target.value })}
                        >
                          <option value="new">Nouveau</option>
                          <option value="contacted">Contacté</option>
                          <option value="confirmed">Confirmé</option>
                          <option value="declined">Décliné</option>
                          <option value="archived">Archivé</option>
                        </select>
                      </div>
                      {interest.message && <p className="mt-2 whitespace-pre-wrap text-sm">{interest.message}</p>}
                    </div>
                  ))}
                  {!interestsQuery.isLoading && interestsQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucune manifestation d’intérêt pour cette formation.</p>}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">Créez une formation pour commencer.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

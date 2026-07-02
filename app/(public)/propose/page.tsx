'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CheckCircle2, GraduationCap, Lightbulb } from 'lucide-react';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Idea } from '@shared/schema';

interface IdeaFormData {
  title: string;
  description?: string;
  proposedBy: string;
  proposedByEmail: string;
  company?: string;
  phone?: string;
}

type TrainingSession = {
  id: string;
  startsAt: string;
  endsAt?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  city?: string | null;
  status: string;
};

type TrainingProgram = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  audience?: string | null;
  objectives?: string[];
  sessions: TrainingSession[];
};

type TrainingInterestForm = {
  trainingId: string;
  sessionIds: string[];
  interestWithoutSession: boolean;
  respondentName: string;
  respondentEmail: string;
  company: string;
  phone: string;
  message: string;
  consentAccepted: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

export default function ProposePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<'idea' | 'training'>('idea');
  const [ideaForm, setIdeaForm] = useState<IdeaFormData>({
    title: '',
    description: '',
    proposedBy: '',
    proposedByEmail: '',
    company: '',
    phone: '',
  });
  const [trainingForm, setTrainingForm] = useState<TrainingInterestForm>({
    trainingId: '',
    sessionIds: [],
    interestWithoutSession: false,
    respondentName: '',
    respondentEmail: '',
    company: '',
    phone: '',
    message: '',
    consentAccepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const trainingsQuery = useQuery({
    queryKey: queryKeys.trainings.public(),
    queryFn: async () => (await api.get<ApiResponse<TrainingProgram[]>>('/api/trainings/public')).data,
  });

  const selectedTraining = useMemo(() => {
    return trainingsQuery.data?.find(training => training.id === trainingForm.trainingId) || trainingsQuery.data?.[0];
  }, [trainingsQuery.data, trainingForm.trainingId]);

  const createIdeaMutation = useMutation({
    mutationFn: (data: IdeaFormData) => api.post<ApiResponse<Idea>>('/api/ideas', data),
    onSuccess: () => {
      toast({ title: 'Idée soumise', description: 'Votre idée a été envoyée avec succès.' });
      router.push('/');
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const submitTrainingMutation = useMutation({
    mutationFn: (data: TrainingInterestForm) => api.post<ApiResponse<{ created: unknown[]; skipped: unknown[]; duplicate: boolean }>>('/api/trainings/interests', data),
    onSuccess: response => {
      if (response.data.duplicate) {
        toast({ title: 'Déjà enregistré', description: 'Votre intérêt avait déjà été pris en compte pour cette formation.' });
      } else {
        toast({ title: 'Intérêt enregistré', description: 'Merci, votre manifestation d’intérêt a bien été transmise.' });
      }
      router.push('/');
    },
    onError: (error: Error) => toast({ title: 'Envoi impossible', description: error.message, variant: 'destructive' }),
  });

  const validateIdea = () => {
    const next: Record<string, string> = {};
    if (!ideaForm.title || ideaForm.title.trim().length < 3) next.title = 'Le titre doit contenir au moins 3 caractères';
    if (!ideaForm.proposedBy || ideaForm.proposedBy.trim().length < 2) next.proposedBy = 'Le nom doit contenir au moins 2 caractères';
    if (!ideaForm.proposedByEmail || !/^\S+@\S+\.\S+$/.test(ideaForm.proposedByEmail)) next.proposedByEmail = 'Veuillez saisir une adresse email valide';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateTraining = () => {
    const next: Record<string, string> = {};
    if (!selectedTraining) next.trainingId = 'Sélectionnez une formation';
    if (!trainingForm.respondentName || trainingForm.respondentName.trim().length < 2) next.respondentName = 'Le nom est obligatoire';
    if (!trainingForm.respondentEmail || !/^\S+@\S+\.\S+$/.test(trainingForm.respondentEmail)) next.respondentEmail = 'Email invalide';
    if (!trainingForm.interestWithoutSession && trainingForm.sessionIds.length === 0) next.sessionIds = 'Sélectionnez au moins une date ou cochez “sans date précise”';
    if (!trainingForm.consentAccepted) next.consentAccepted = 'Le consentement est obligatoire';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleIdeaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateIdea()) return;
    createIdeaMutation.mutate({
      title: ideaForm.title,
      description: ideaForm.description || undefined,
      proposedBy: ideaForm.proposedBy,
      proposedByEmail: ideaForm.proposedByEmail,
      company: ideaForm.company || undefined,
      phone: ideaForm.phone || undefined,
    });
  };

  const handleTrainingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTraining() || !selectedTraining) return;
    submitTrainingMutation.mutate({
      ...trainingForm,
      trainingId: selectedTraining.id,
      company: trainingForm.company || '',
      phone: trainingForm.phone || '',
      message: trainingForm.message || '',
    });
  };

  const updateIdea = (field: keyof IdeaFormData, value: string) => {
    setIdeaForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const updateTraining = <K extends keyof TrainingInterestForm>(field: K, value: TrainingInterestForm[K]) => {
    setTrainingForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleSession = (sessionId: string) => {
    updateTraining('sessionIds', trainingForm.sessionIds.includes(sessionId)
      ? trainingForm.sessionIds.filter(id => id !== sessionId)
      : [...trainingForm.sessionIds, sessionId]);
    if (trainingForm.interestWithoutSession) updateTraining('interestWithoutSession', false);
  };

  const activeTraining = selectedTraining || trainingsQuery.data?.[0];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à l’accueil
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary p-3">
                  {mode === 'idea' ? <Lightbulb className="h-6 w-6 text-white" /> : <GraduationCap className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <CardTitle className="text-2xl">Proposer / Participer</CardTitle>
                  <p className="mt-1 text-gray-600">Partagez une idée ou manifestez votre intérêt pour une formation.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
                <button className={`rounded-md px-3 py-2 ${mode === 'idea' ? 'bg-background shadow-sm' : ''}`} onClick={() => { setMode('idea'); setErrors({}); }}>
                  Idée
                </button>
                <button className={`rounded-md px-3 py-2 ${mode === 'training' ? 'bg-background shadow-sm' : ''}`} onClick={() => { setMode('training'); setErrors({}); }}>
                  Formation
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {mode === 'idea' ? (
              <form onSubmit={handleIdeaSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium">Titre de l’idée *</label>
                  <Input value={ideaForm.title} onChange={e => updateIdea('title', e.target.value)} placeholder="Ex: Organiser un afterwork mensuel" className={errors.title ? 'border-error' : ''} />
                  {errors.title && <span className="mt-1 block text-sm text-error">{errors.title}</span>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Description</label>
                  <Textarea value={ideaForm.description} onChange={e => updateIdea('description', e.target.value)} placeholder="Décrivez votre idée en détail…" rows={6} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Votre nom *</label>
                    <Input value={ideaForm.proposedBy} onChange={e => updateIdea('proposedBy', e.target.value)} placeholder="Jean Dupont" />
                    {errors.proposedBy && <span className="mt-1 block text-sm text-error">{errors.proposedBy}</span>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Votre email *</label>
                    <Input value={ideaForm.proposedByEmail} onChange={e => updateIdea('proposedByEmail', e.target.value)} type="email" placeholder="jean@example.com" />
                    {errors.proposedByEmail && <span className="mt-1 block text-sm text-error">{errors.proposedByEmail}</span>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Entreprise</label>
                    <Input value={ideaForm.company} onChange={e => updateIdea('company', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Téléphone</label>
                    <Input value={ideaForm.phone} onChange={e => updateIdea('phone', e.target.value)} />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary" disabled={createIdeaMutation.isPending}>
                  {createIdeaMutation.isPending ? 'Envoi en cours…' : 'Soumettre mon idée'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleTrainingSubmit} className="space-y-6">
                {trainingsQuery.isLoading && <p className="text-sm text-gray-600">Chargement des formations…</p>}
                {!trainingsQuery.isLoading && !activeTraining && (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-gray-600">Aucune formation ouverte pour le moment.</p>
                )}

                {activeTraining && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Formation *</label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={activeTraining.id}
                        onChange={e => updateTraining('trainingId', e.target.value)}
                      >
                        {trainingsQuery.data?.map(training => <option key={training.id} value={training.id}>{training.title}</option>)}
                      </select>
                      {errors.trainingId && <span className="mt-1 block text-sm text-error">{errors.trainingId}</span>}
                    </div>

                    <div className="rounded-lg border bg-muted/40 p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{activeTraining.title}</h2>
                        {activeTraining.category && <Badge variant="secondary">{activeTraining.category}</Badge>}
                      </div>
                      {activeTraining.description && <p className="whitespace-pre-wrap text-sm text-gray-700">{activeTraining.description}</p>}
                      {!!activeTraining.objectives?.length && (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                          {activeTraining.objectives.map((objective, index) => <li key={index}>{objective}</li>)}
                        </ul>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Dates / lieux souhaités *</label>
                      <div className="space-y-2">
                        {activeTraining.sessions.map(session => (
                          <button
                            type="button"
                            key={session.id}
                            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:bg-muted ${trainingForm.sessionIds.includes(session.id) ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => toggleSession(session.id)}
                          >
                            <Calendar className="mt-0.5 h-5 w-5 text-primary" />
                            <span>
                              <strong>{formatDate(session.startsAt)}</strong>
                              <span className="block text-sm text-gray-600">{session.locationName || 'Lieu à préciser'}{session.city ? ` · ${session.city}` : ''}</span>
                            </span>
                            {trainingForm.sessionIds.includes(session.id) && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
                          </button>
                        ))}
                      </div>
                      <label className="mt-3 flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={trainingForm.interestWithoutSession}
                          onChange={e => {
                            updateTraining('interestWithoutSession', e.target.checked);
                            if (e.target.checked) updateTraining('sessionIds', []);
                          }}
                        />
                        Je suis intéressé(e), mais aucune date ne me convient / je souhaite être recontacté(e).
                      </label>
                      {errors.sessionIds && <span className="mt-1 block text-sm text-error">{errors.sessionIds}</span>}
                    </div>
                  </>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Votre nom *</label>
                    <Input value={trainingForm.respondentName} onChange={e => updateTraining('respondentName', e.target.value)} />
                    {errors.respondentName && <span className="mt-1 block text-sm text-error">{errors.respondentName}</span>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Votre email *</label>
                    <Input type="email" value={trainingForm.respondentEmail} onChange={e => updateTraining('respondentEmail', e.target.value)} />
                    {errors.respondentEmail && <span className="mt-1 block text-sm text-error">{errors.respondentEmail}</span>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Entreprise</label>
                    <Input value={trainingForm.company} onChange={e => updateTraining('company', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Téléphone</label>
                    <Input value={trainingForm.phone} onChange={e => updateTraining('phone', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Message</label>
                  <Textarea value={trainingForm.message} onChange={e => updateTraining('message', e.target.value)} rows={4} placeholder="Précisions, disponibilités, besoin de prise en charge…" />
                </div>

                <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                  <input type="checkbox" className="mt-1" checked={trainingForm.consentAccepted} onChange={e => updateTraining('consentAccepted', e.target.checked)} />
                  <span>
                    J’accepte que mes coordonnées soient utilisées pour traiter ma manifestation d’intérêt et partagées avec les responsables locaux/régionaux concernés par cette formation.
                    {errors.consentAccepted && <span className="mt-1 block text-error">{errors.consentAccepted}</span>}
                  </span>
                </label>

                <Button type="submit" className="w-full bg-primary hover:bg-primary" disabled={!activeTraining || submitTrainingMutation.isPending}>
                  {submitTrainingMutation.isPending ? 'Envoi en cours…' : 'Manifester mon intérêt'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

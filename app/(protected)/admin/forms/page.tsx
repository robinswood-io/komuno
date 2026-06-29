'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Copy, CopyPlus, Download, ExternalLink, Eye, FileQuestion, ListChecks, Loader2, Plus, Save, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const dynamic = 'force-dynamic';

type FormStatus = 'draft' | 'published' | 'closed';
type FormDialogMode = 'create' | 'edit';
type QuestionType = 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'radio' | 'multiselect' | 'checkbox' | 'rating';

interface QuestionOption { label: string; value: string }
interface SurveyQuestion {
  id?: string;
  label: string;
  description?: string | null;
  type: QuestionType;
  required: boolean;
  options: QuestionOption[];
  orderIndex?: number;
}
interface SurveyFormSummary {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  status: FormStatus;
  version: number;
  collectRespondentInfo: boolean;
  allowMultipleSubmissions: boolean;
  successMessage?: string | null;
  expiresAt?: string | null;
  requireConsent: boolean;
  consentText?: string | null;
  retentionDays?: number | null;
  createdAt?: string;
  updatedAt?: string;
  responseCount: number;
  questionCount: number;
  publicUrl: string;
}
interface SurveyFormDetail extends SurveyFormSummary { questions: SurveyQuestion[] }
interface ResponsesPayload {
  columns: { key: string; label: string; type: string }[];
  rows: Record<string, unknown>[];
}
interface QuestionSummary {
  questionId: string;
  label: string;
  type: QuestionType;
  chartType: 'bar' | 'pie' | 'number' | 'text';
  totalAnswered: number;
  options?: { value: string; label: string; count: number; percent: number }[];
  numeric?: { average: number; min: number | null; max: number | null };
  samples?: string[];
}
interface StatsPayload {
  totalResponses: number;
  lastResponseAt?: string | null;
  responsesByDay: { date: string; count: number }[];
  questionSummaries: QuestionSummary[];
}

const questionTypes: { value: QuestionType; label: string; needsOptions?: boolean }[] = [
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste déroulante', needsOptions: true },
  { value: 'radio', label: 'Choix unique', needsOptions: true },
  { value: 'multiselect', label: 'Choix multiple', needsOptions: true },
  { value: 'checkbox', label: 'Oui / non' },
  { value: 'rating', label: 'Note 1 à 5' },
];

const optionQuestionTypes = new Set<QuestionType>(['select', 'radio', 'multiselect']);

type EditableForm = Omit<SurveyFormDetail, 'id' | 'createdAt' | 'updatedAt' | 'responseCount' | 'questionCount' | 'publicUrl'>;

const formTemplates: Record<string, { label: string; description: string; form: EditableForm }> = {
  satisfaction: {
    label: 'Satisfaction événement',
    description: 'Collecter un retour qualitatif et une note après un événement.',
    form: {
      title: 'Satisfaction événement',
      slug: 'satisfaction-evenement',
      description: 'Merci de nous aider à améliorer nos prochains événements.',
      status: 'draft',
      version: 1,
      collectRespondentInfo: false,
      allowMultipleSubmissions: false,
      successMessage: 'Merci pour votre retour.',
      expiresAt: null,
      requireConsent: true,
      consentText: 'J’accepte que mes réponses soient collectées pour améliorer les événements.',
      retentionDays: 365,
      questions: [
        { label: 'Note globale de l’événement', type: 'rating', required: true, options: [], orderIndex: 0 },
        { label: 'Ce que vous avez le plus apprécié', type: 'textarea', required: false, options: [], orderIndex: 1 },
        { label: 'Une amélioration prioritaire', type: 'textarea', required: false, options: [], orderIndex: 2 },
      ],
    },
  },
  vote: {
    label: 'Vote interne',
    description: 'Préparer une consultation nominative avec choix unique.',
    form: {
      title: 'Vote interne',
      slug: 'vote-interne',
      description: 'Questionnaire de vote réservé aux membres concernés.',
      status: 'draft',
      version: 1,
      collectRespondentInfo: true,
      allowMultipleSubmissions: false,
      successMessage: 'Votre vote a bien été enregistré.',
      expiresAt: null,
      requireConsent: true,
      consentText: 'Je confirme l’exactitude de mon vote et accepte son traitement dans le cadre de cette consultation.',
      retentionDays: 365,
      questions: [
        { label: 'Votre choix', type: 'radio', required: true, options: [{ label: 'Option A', value: 'option-a' }, { label: 'Option B', value: 'option-b' }, { label: 'Abstention', value: 'abstention' }], orderIndex: 0 },
        { label: 'Commentaire optionnel', type: 'textarea', required: false, options: [], orderIndex: 1 },
      ],
    },
  },
  diagnostic: {
    label: 'Diagnostic membre',
    description: 'Qualifier les besoins et priorités d’un membre.',
    form: {
      title: 'Diagnostic membre',
      slug: 'diagnostic-membre',
      description: 'Recueil structuré des besoins, attentes et priorités d’un membre.',
      status: 'draft',
      version: 1,
      collectRespondentInfo: true,
      allowMultipleSubmissions: false,
      successMessage: 'Merci, vos réponses ont bien été enregistrées.',
      expiresAt: null,
      requireConsent: true,
      consentText: 'J’accepte que mes réponses soient utilisées pour préparer un accompagnement personnalisé.',
      retentionDays: 730,
      questions: [
        { label: 'Sujet prioritaire du moment', type: 'select', required: true, options: [{ label: 'Croissance', value: 'croissance' }, { label: 'RH', value: 'rh' }, { label: 'Organisation', value: 'organisation' }, { label: 'Finance', value: 'finance' }, { label: 'Autre', value: 'autre' }], orderIndex: 0 },
        { label: 'Décrivez votre besoin', type: 'textarea', required: true, options: [], orderIndex: 1 },
        { label: 'Niveau d’urgence', type: 'rating', required: false, options: [], orderIndex: 2 },
      ],
    },
  },
};

const emptyForm: EditableForm = {
  title: '',
  slug: '',
  description: '',
  status: 'draft',
  version: 1,
  collectRespondentInfo: false,
  allowMultipleSubmissions: true,
  successMessage: 'Merci, votre réponse a bien été enregistrée.',
  expiresAt: null,
  requireConsent: false,
  consentText: 'J’accepte que mes réponses soient collectées et traitées dans le cadre de ce formulaire.',
  retentionDays: null,
  questions: [
    { label: 'Votre avis général', type: 'textarea', required: true, options: [], orderIndex: 0 },
    { label: 'Note globale', type: 'rating', required: false, options: [], orderIndex: 1 },
  ],
};

function statusLabel(status: FormStatus) {
  if (status === 'published') return 'Publié';
  if (status === 'closed') return 'Fermé';
  return 'Brouillon';
}

function statusVariant(status: FormStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'published') return 'default';
  if (status === 'closed') return 'destructive';
  return 'secondary';
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function optionValue(label: string) {
  return slugify(label) || String(Date.now());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function questionTypeLabel(type: QuestionType) {
  return questionTypes.find((questionType) => questionType.value === type)?.label ?? type;
}

function defaultOptionsForType(type: QuestionType): QuestionOption[] {
  if (!optionQuestionTypes.has(type)) return [];
  return [
    { label: 'Option 1', value: 'option-1' },
    { label: 'Option 2', value: 'option-2' },
  ];
}

function defaultQuestionForType(type: QuestionType, orderIndex: number): SurveyQuestion {
  const labels: Record<QuestionType, string> = {
    text: 'Question courte',
    textarea: 'Question ouverte',
    email: 'Adresse email',
    phone: 'Téléphone',
    number: 'Nombre',
    date: 'Date',
    select: 'Choisissez une option',
    radio: 'Choisissez une réponse',
    multiselect: 'Choisissez une ou plusieurs réponses',
    checkbox: 'Confirmation',
    rating: 'Note globale',
  };

  return {
    label: labels[type],
    type,
    required: type === 'email',
    options: defaultOptionsForType(type),
    orderIndex,
  };
}

function validateEditableForm(form: EditableForm) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!form.title.trim()) errors.push('Ajoutez un titre au formulaire.');
  if (!form.slug.trim()) errors.push('Renseignez un slug public.');
  else if (!slugPattern.test(form.slug.trim())) errors.push('Le slug doit contenir uniquement minuscules, chiffres et tirets.');
  if (form.questions.length === 0) errors.push('Ajoutez au moins une question.');

  form.questions.forEach((question, index) => {
    if (!question.label.trim()) errors.push(`Question ${index + 1} : ajoutez un libellé.`);
    if (optionQuestionTypes.has(question.type)) {
      const validOptions = (question.options ?? []).filter((option) => option.label.trim());
      if (validOptions.length < 2) errors.push(`Question ${index + 1} : ajoutez au moins deux options.`);
    }
  });

  if (form.requireConsent && !form.consentText?.trim()) errors.push('Ajoutez un texte de consentement RGPD.');
  if (form.retentionDays !== null && form.retentionDays !== undefined && (form.retentionDays < 1 || form.retentionDays > 3650)) {
    errors.push('La durée de rétention doit être comprise entre 1 et 3650 jours.');
  }

  if (!form.description?.trim()) warnings.push('Ajoutez une description courte pour contextualiser le formulaire public.');
  if (form.collectRespondentInfo && !form.requireConsent) warnings.push('La collecte nom/email devrait être accompagnée d’un consentement RGPD.');
  if (form.status === 'published' && errors.length === 0) warnings.push('Le formulaire sera visible publiquement dès l’enregistrement.');

  const checks = [
    Boolean(form.title.trim()),
    Boolean(form.slug.trim() && slugPattern.test(form.slug.trim())),
    form.questions.length > 0,
    form.questions.every((question) => question.label.trim()),
    form.questions.every((question) => !optionQuestionTypes.has(question.type) || (question.options ?? []).filter((option) => option.label.trim()).length >= 2),
    !form.requireConsent || Boolean(form.consentText?.trim()),
    Boolean(form.successMessage?.trim()),
  ];
  const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return { errors, warnings, completion };
}

export default function AdminFormsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<FormStatus | 'all'>('all');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formDialogMode, setFormDialogMode] = useState<FormDialogMode>('create');
  const [editingForm, setEditingForm] = useState<typeof emptyForm>({ ...emptyForm, questions: [...emptyForm.questions] });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');

  const formsQuery = useQuery<ApiResponse<SurveyFormSummary[]>>({
    queryKey: queryKeys.forms.list({ status: statusFilter }),
    queryFn: () => api.get('/api/admin/forms', statusFilter === 'all' ? {} : { status: statusFilter }),
  });

  const forms = formsQuery.data?.data ?? [];
  const activeFormId = selectedFormId ?? forms[0]?.id ?? null;

  const formQuery = useQuery<ApiResponse<SurveyFormDetail>>({
    queryKey: activeFormId ? queryKeys.forms.detail(activeFormId) : ['forms', 'detail', 'empty'],
    queryFn: () => api.get(`/api/admin/forms/${activeFormId}`),
    enabled: Boolean(activeFormId),
  });

  const responsesQuery = useQuery<ApiResponse<ResponsesPayload>>({
    queryKey: activeFormId ? queryKeys.forms.responses(activeFormId) : ['forms', 'responses', 'empty'],
    queryFn: () => api.get(`/api/admin/forms/${activeFormId}/responses`),
    enabled: Boolean(activeFormId),
  });

  const statsQuery = useQuery<ApiResponse<StatsPayload>>({
    queryKey: activeFormId ? queryKeys.forms.stats(activeFormId) : ['forms', 'stats', 'empty'],
    queryFn: () => api.get(`/api/admin/forms/${activeFormId}/stats`),
    enabled: Boolean(activeFormId),
  });

  const selectedForm = formQuery.data?.data ?? null;
  const responses = responsesQuery.data?.data;
  const stats = statsQuery.data?.data;

  const publicUrl = useMemo(() => {
    if (!selectedForm) return '';
    if (typeof window === 'undefined') return selectedForm.publicUrl;
    return `${window.location.origin}${selectedForm.publicUrl}`;
  }, [selectedForm]);

  const isEditingForm = formDialogMode === 'edit';
  const formValidation = useMemo(() => validateEditableForm(editingForm), [editingForm]);
  const requiredQuestionCount = editingForm.questions.filter((question) => question.required).length;
  const draftPublicUrl = useMemo(() => {
    const path = `/forms/${editingForm.slug || 'mon-formulaire'}`;
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  }, [editingForm.slug]);

  const invalidateForms = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
  };

  const createMutation = useMutation({
    mutationFn: () => api.post<ApiResponse<SurveyFormDetail>>('/api/admin/forms', editingForm),
    onSuccess: async (response) => {
      toast({ title: 'Formulaire créé', description: 'Vous pouvez maintenant le publier ou partager son lien.' });
      setIsDialogOpen(false);
      setSelectedFormId(response.data.id);
      await invalidateForms();
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Création impossible', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put<ApiResponse<SurveyFormDetail>>(`/api/admin/forms/${activeFormId}`, editingForm),
    onSuccess: async () => {
      toast({ title: 'Formulaire mis à jour' });
      setIsDialogOpen(false);
      await invalidateForms();
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Mise à jour impossible', variant: 'destructive' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (formId: string) => api.post<ApiResponse<SurveyFormDetail>>(`/api/admin/forms/${formId}/duplicate`),
    onSuccess: async (response) => {
      toast({ title: 'Formulaire dupliqué', description: 'La copie est créée en brouillon.' });
      setSelectedFormId(response.data.id);
      await invalidateForms();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (formId: string) => api.delete(`/api/admin/forms/${formId}`),
    onSuccess: async () => {
      toast({ title: 'Formulaire supprimé' });
      setSelectedFormId(null);
      await invalidateForms();
    },
  });

  const deleteResponseMutation = useMutation({
    mutationFn: (responseId: string) => api.delete(`/api/admin/forms/${activeFormId}/responses/${responseId}`),
    onSuccess: async () => {
      toast({ title: 'Réponse supprimée' });
      if (activeFormId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.forms.responses(activeFormId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.forms.stats(activeFormId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.forms.detail(activeFormId) });
      }
      await invalidateForms();
    },
  });

  const cloneEditableForm = (form: EditableForm): EditableForm => ({
    ...form,
    questions: form.questions.map((question) => ({ ...question, options: [...(question.options ?? [])] })),
  });

  const openCreateDialog = () => {
    setFormDialogMode('create');
    setSelectedTemplate('blank');
    setEditingForm(cloneEditableForm(emptyForm));
    setIsDialogOpen(true);
  };

  const applyTemplate = (templateKey: string) => {
    if (templateKey === 'blank') {
      setSelectedTemplate('blank');
      setEditingForm(cloneEditableForm(emptyForm));
      return;
    }

    const template = formTemplates[templateKey];
    if (!template) return;
    setSelectedTemplate(templateKey);
    setEditingForm(cloneEditableForm(template.form));
  };

  const openEditDialog = () => {
    if (!selectedForm) return;
    setFormDialogMode('edit');
    setSelectedTemplate('blank');
    setEditingForm({
      title: selectedForm.title,
      slug: selectedForm.slug,
      description: selectedForm.description ?? '',
      status: selectedForm.status,
      version: selectedForm.version,
      collectRespondentInfo: selectedForm.collectRespondentInfo,
      allowMultipleSubmissions: selectedForm.allowMultipleSubmissions,
      successMessage: selectedForm.successMessage ?? '',
      expiresAt: selectedForm.expiresAt ?? null,
      requireConsent: selectedForm.requireConsent,
      consentText: selectedForm.consentText ?? '',
      retentionDays: selectedForm.retentionDays ?? null,
      questions: selectedForm.questions.map((question, index) => ({
        ...question,
        options: Array.isArray(question.options) ? question.options : [],
        orderIndex: question.orderIndex ?? index,
      })),
    });
    setIsDialogOpen(true);
  };

  const updateQuestion = (index: number, patch: Partial<SurveyQuestion>) => {
    setEditingForm((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question),
    }));
  };

  const addQuestion = (type: QuestionType = 'text') => {
    setEditingForm((current) => ({
      ...current,
      questions: [...current.questions, defaultQuestionForType(type, current.questions.length)],
    }));
  };

  const removeQuestion = (index: number) => {
    if (!window.confirm('Supprimer cette question ? Les réponses déjà collectées restent conservées grâce au snapshot, mais la question disparaîtra du formulaire courant.')) return;
    setEditingForm((current) => ({
      ...current,
      questions: current.questions.filter((_, questionIndex) => questionIndex !== index).map((question, orderIndex) => ({ ...question, orderIndex })),
    }));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setEditingForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.questions.length) return current;
      const questions = [...current.questions];
      [questions[index], questions[nextIndex]] = [questions[nextIndex], questions[index]];
      return { ...current, questions: questions.map((question, orderIndex) => ({ ...question, orderIndex })) };
    });
  };

  const deleteSelectedForm = () => {
    if (!selectedForm) return;
    if (!window.confirm(`Supprimer définitivement le formulaire « ${selectedForm.title} » et ses réponses ?`)) return;
    deleteMutation.mutate(selectedForm.id);
  };

  const deleteResponse = (responseId: string) => {
    if (!window.confirm('Supprimer définitivement cette réponse ?')) return;
    deleteResponseMutation.mutate(responseId);
  };

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast({ title: 'Lien copié', description: publicUrl });
  };

  const downloadCsv = () => {
    if (!activeFormId) return;
    window.open(`/api/admin/forms/${activeFormId}/responses.csv`, '_blank');
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const submitEditingForm = () => {
    if (formValidation.errors.length > 0) {
      toast({
        title: 'Formulaire incomplet',
        description: formValidation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    if (isEditingForm) updateMutation.mutate();
    else createMutation.mutate();
  };

  const renderQuestionPreviewControl = (question: SurveyQuestion) => {
    if (question.type === 'textarea') return <Textarea disabled placeholder="Réponse longue" className="mt-2 min-h-20 resize-none" />;
    if (question.type === 'rating') {
      return <div className="mt-3 flex gap-1">{[1, 2, 3, 4, 5].map((note) => <span key={note} className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-xs">{note}</span>)}</div>;
    }
    if (question.type === 'checkbox') return <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><span className="h-4 w-4 rounded border bg-background" /> Oui</div>;
    if (optionQuestionTypes.has(question.type)) {
      return (
        <div className="mt-3 space-y-2">
          {(question.options ?? []).slice(0, 4).map((option, optionIndex) => (
            <div key={`${option.value}-${optionIndex}`} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={question.type === 'multiselect' ? 'h-4 w-4 rounded border bg-background' : 'h-4 w-4 rounded-full border bg-background'} />
              {option.label || `Option ${optionIndex + 1}`}
            </div>
          ))}
        </div>
      );
    }

    const inputType = question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : question.type === 'number' ? 'number' : question.type === 'date' ? 'date' : 'text';
    return <Input disabled type={inputType} placeholder="Réponse" className="mt-2" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileQuestion className="h-8 w-8 text-primary" />
            Formulaires & sondages
          </h1>
          <p className="text-muted-foreground">
            Créez des questionnaires publics, collectez des réponses structurées et visualisez les résultats.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau formulaire
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Formulaires</CardTitle>
                <CardDescription>{forms.length} formulaire(s)</CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FormStatus | 'all')}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="draft">Brouillons</SelectItem>
                  <SelectItem value="published">Publiés</SelectItem>
                  <SelectItem value="closed">Fermés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {formsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
            ) : forms.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun formulaire pour ce filtre.</p>
            ) : forms.map((form) => (
              <button
                key={form.id}
                onClick={() => setSelectedFormId(form.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${activeFormId === form.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium line-clamp-2">{form.title}</div>
                  <Badge variant={statusVariant(form.status)}>{statusLabel(form.status)}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {form.questionCount} question(s) · {form.responseCount} réponse(s)
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!activeFormId ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                Créez un premier formulaire pour commencer.
              </CardContent>
            </Card>
          ) : formQuery.isLoading || !selectedForm ? (
            <Card><CardContent className="p-10"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{selectedForm.title}</CardTitle>
                        <Badge variant={statusVariant(selectedForm.status)}>{statusLabel(selectedForm.status)}</Badge>
                      </div>
                      <CardDescription>{selectedForm.description || 'Aucune description'}</CardDescription>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{selectedForm.questions.length} question(s)</span>
                        <span>·</span>
                        <span>{selectedForm.responseCount} réponse(s)</span>
                        <span>·</span>
                        <span>Version {selectedForm.version}</span>
                        <span>·</span>
                        <span>Slug: {selectedForm.slug}</span>
                        {selectedForm.expiresAt && <><span>·</span><span>Expire le {new Date(selectedForm.expiresAt).toLocaleString('fr-FR')}</span></>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={copyPublicUrl} disabled={selectedForm.status !== 'published'}>
                        <Copy className="mr-2 h-4 w-4" /> Copier le lien
                      </Button>
                      <Button variant="outline" asChild disabled={selectedForm.status !== 'published'}>
                        <a href={selectedForm.publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Voir</a>
                      </Button>
                      <Button variant="outline" onClick={() => duplicateMutation.mutate(selectedForm.id)} disabled={duplicateMutation.isPending}>
                        <CopyPlus className="mr-2 h-4 w-4" /> Dupliquer
                      </Button>
                      <Button onClick={openEditDialog}><Save className="mr-2 h-4 w-4" /> Modifier</Button>
                      <Button variant="destructive" onClick={deleteSelectedForm} disabled={deleteMutation.isPending}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Tabs defaultValue="stats" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="stats">Graphiques</TabsTrigger>
                  <TabsTrigger value="responses">Tableau des réponses</TabsTrigger>
                  <TabsTrigger value="questions">Questions</TabsTrigger>
                </TabsList>

                <TabsContent value="stats" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Réponses</CardTitle></CardHeader>
                      <CardContent className="text-3xl font-bold">{stats?.totalResponses ?? 0}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Dernière réponse</CardTitle></CardHeader>
                      <CardContent className="text-sm">{stats?.lastResponseAt ? new Date(stats.lastResponseAt).toLocaleString('fr-FR') : '—'}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Lien public / QR code</CardTitle></CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {selectedForm.status === 'published' ? (
                          <>
                            <div className="truncate">{publicUrl}</div>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(publicUrl)}`}
                              alt="QR code du formulaire"
                              className="h-28 w-28 rounded border bg-white p-1"
                            />
                          </>
                        ) : 'Non publié'}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Réponses dans le temps</CardTitle>
                      <CardDescription>Volume de réponses par jour.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {statsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <ChartContainer config={{ count: { label: 'Réponses', color: 'var(--chart-1)' } }} className="h-[260px] w-full">
                          <LineChart data={stats?.responsesByDay ?? []}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis allowDecimals={false} />
                            <ChartTooltip />
                            <Line dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} dot />
                          </LineChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {(stats?.questionSummaries ?? []).map((summary) => (
                      <Card key={summary.questionId}>
                        <CardHeader>
                          <CardTitle className="text-base">{summary.label}</CardTitle>
                          <CardDescription>{summary.totalAnswered} réponse(s) exploitable(s)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {summary.options ? (
                            <ChartContainer config={{ count: { label: 'Réponses', color: 'var(--chart-2)' } }} className="h-[260px] w-full">
                              <BarChart data={summary.options}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis allowDecimals={false} />
                                <ChartTooltip />
                                <Bar dataKey="count" fill="var(--color-count)" radius={6} />
                              </BarChart>
                            </ChartContainer>
                          ) : summary.numeric ? (
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Moyenne</div><div className="text-2xl font-bold">{summary.numeric.average}</div></div>
                              <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Min</div><div className="text-2xl font-bold">{summary.numeric.min ?? '—'}</div></div>
                              <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Max</div><div className="text-2xl font-bold">{summary.numeric.max ?? '—'}</div></div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {(summary.samples ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Pas encore de réponse.</p> : summary.samples?.map((sample, index) => (
                                <div key={index} className="rounded-lg border p-2 text-sm">{sample}</div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="responses">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle>Réponses structurées</CardTitle>
                          <CardDescription>Chaque colonne correspond à une question du formulaire.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={downloadCsv} disabled={!responses?.rows.length}>
                          <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {(responses?.columns ?? []).map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(responses?.rows ?? []).length === 0 ? (
                            <TableRow><TableCell colSpan={Math.max(2, (responses?.columns.length ?? 1) + 1)} className="text-center text-muted-foreground">Aucune réponse.</TableCell></TableRow>
                          ) : responses?.rows.map((row) => (
                            <TableRow key={String(row.id)}>
                              {responses.columns.map((column) => <TableCell key={column.key}>{formatValue(row[column.key])}</TableCell>)}
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteResponse(String(row.id))}
                                  disabled={deleteResponseMutation.isPending}
                                  aria-label="Supprimer la réponse"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="questions">
                  <Card>
                    <CardHeader><CardTitle>Questions</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {selectedForm.questions.map((question, index) => (
                        <div key={question.id ?? index} className="rounded-lg border p-3">
                          <div className="font-medium">{index + 1}. {question.label}</div>
                          <div className="text-sm text-muted-foreground">{question.type} · {question.required ? 'obligatoire' : 'facultative'}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-[1180px] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-12">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    {isEditingForm ? <Settings2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {isEditingForm ? 'Modification' : 'Création'}
                  </Badge>
                  <Badge variant={statusVariant(editingForm.status)}>{statusLabel(editingForm.status)}</Badge>
                </div>
                <DialogTitle className="text-2xl">
                  {isEditingForm ? 'Modifier le formulaire' : 'Créer un formulaire'}
                </DialogTitle>
                <DialogDescription>
                  Un parcours guidé pour préparer le lien public, les questions, la collecte RGPD et la publication.
                </DialogDescription>
              </div>
              <div className="min-w-[220px] rounded-xl border bg-background p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Complétude</span>
                  <span className="font-medium text-foreground">{formValidation.completion}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${formValidation.completion}%` }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {editingForm.questions.length} question(s), dont {requiredQuestionCount} obligatoire(s)
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="max-h-[calc(92vh-178px)] overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                {!isEditingForm && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Démarrer vite
                      </CardTitle>
                      <CardDescription>
                        Choisissez un modèle, puis ajustez les champs avant publication.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => applyTemplate('blank')}
                        className={`rounded-xl border bg-background p-4 text-left transition hover:border-primary hover:shadow-sm ${selectedTemplate === 'blank' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                      >
                        <div className="flex items-center gap-2 font-medium"><FileQuestion className="h-4 w-4" /> Vierge</div>
                        <p className="mt-2 text-xs text-muted-foreground">Base neutre avec deux questions prêtes à adapter.</p>
                      </button>
                      {Object.entries(formTemplates).map(([key, template]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyTemplate(key)}
                          className={`rounded-xl border bg-background p-4 text-left transition hover:border-primary hover:shadow-sm ${selectedTemplate === key ? 'border-primary ring-2 ring-primary/20' : ''}`}
                        >
                          <div className="font-medium">{template.label}</div>
                          <p className="mt-2 text-xs text-muted-foreground">{template.description}</p>
                          <div className="mt-3 text-xs text-primary">{template.form.questions.length} questions</div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><FileQuestion className="h-4 w-4" /> 1. Identité publique</CardTitle>
                    <CardDescription>Ce bloc détermine le titre visible, l’adresse publique et le contexte donné aux répondants.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="form-title">Titre</Label>
                      <Input
                        id="form-title"
                        value={editingForm.title}
                        onChange={(event) => setEditingForm({
                          ...editingForm,
                          title: event.target.value,
                          slug: editingForm.slug || slugify(event.target.value),
                        })}
                        placeholder="Ex : Satisfaction soirée réseau"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="form-slug">Slug public</Label>
                      <div className="flex rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <span className="hidden items-center border-r bg-muted px-3 text-sm text-muted-foreground sm:flex">/forms/</span>
                        <Input
                          id="form-slug"
                          value={editingForm.slug}
                          onChange={(event) => setEditingForm({ ...editingForm, slug: slugify(event.target.value) })}
                          placeholder="mon-sondage"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">Aperçu : {draftPublicUrl}</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="form-description">Description courte</Label>
                      <Textarea
                        id="form-description"
                        value={editingForm.description ?? ''}
                        onChange={(event) => setEditingForm({ ...editingForm, description: event.target.value })}
                        placeholder="Expliquez en une ou deux phrases pourquoi vous collectez ces réponses."
                        className="min-h-24"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" /> 2. Questions</CardTitle>
                        <CardDescription>Ajoutez, ordonnez et configurez les champs. Les choix nécessitent au moins deux options.</CardDescription>
                      </div>
                      <Button type="button" variant="outline" onClick={() => addQuestion()}>
                        <Plus className="mr-2 h-4 w-4" /> Ajouter une question
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 rounded-xl border bg-muted/30 p-3">
                      {(['text', 'textarea', 'email', 'select', 'radio', 'multiselect', 'rating'] as QuestionType[]).map((type) => (
                        <Button key={type} type="button" variant="secondary" size="sm" onClick={() => addQuestion(type)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> {questionTypeLabel(type)}
                        </Button>
                      ))}
                    </div>

                    {editingForm.questions.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                        Aucune question pour le moment. Ajoutez un champ depuis la barre ci-dessus.
                      </div>
                    ) : editingForm.questions.map((question, index) => (
                      <Card key={question.id ?? index} className="overflow-hidden border-muted-foreground/20">
                        <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 lg:flex-row lg:items-center">
                          <div className="flex items-center gap-3 lg:min-w-[260px]">
                            <Badge variant="outline" className="h-7 w-7 justify-center rounded-full p-0">{index + 1}</Badge>
                            <Input
                              value={question.label}
                              onChange={(event) => updateQuestion(index, { label: event.target.value })}
                              placeholder="Libellé de la question"
                              className="font-medium"
                            />
                          </div>
                          <div className="grid flex-1 gap-3 sm:grid-cols-[190px_1fr_auto]">
                            <Select
                              value={question.type}
                              onValueChange={(value) => updateQuestion(index, {
                                type: value as QuestionType,
                                options: optionQuestionTypes.has(value as QuestionType) ? (question.options.length > 0 ? question.options : defaultOptionsForType(value as QuestionType)) : [],
                              })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {questionTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                              <div>
                                <div className="text-sm font-medium">Obligatoire</div>
                                <div className="text-xs text-muted-foreground">Bloque l’envoi si vide</div>
                              </div>
                              <Switch checked={question.required} onCheckedChange={(checked) => updateQuestion(index, { required: checked })} />
                            </div>
                            <div className="flex items-center justify-end gap-1">
                              <Button type="button" variant="ghost" size="icon" onClick={() => moveQuestion(index, -1)} disabled={index === 0} aria-label="Monter la question"><ArrowUp className="h-4 w-4" /></Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => moveQuestion(index, 1)} disabled={index === editingForm.questions.length - 1} aria-label="Descendre la question"><ArrowDown className="h-4 w-4" /></Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(index)} aria-label="Supprimer la question"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        </div>
                        <CardContent className="space-y-4 p-4">
                          <div className="space-y-2">
                            <Label>Description / aide optionnelle</Label>
                            <Textarea
                              value={question.description ?? ''}
                              onChange={(event) => updateQuestion(index, { description: event.target.value })}
                              placeholder="Ex : précisez le format attendu ou donnez un exemple."
                              className="min-h-20"
                            />
                          </div>
                          {optionQuestionTypes.has(question.type) && (
                            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <Label>Options de réponse</Label>
                                  <p className="text-xs text-muted-foreground">Chaque option garde une valeur technique stable pour les exports.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuestion(index, { options: [...question.options, { label: `Option ${question.options.length + 1}`, value: optionValue(`Option ${question.options.length + 1}`) }] })}
                                >
                                  <Plus className="mr-2 h-3.5 w-3.5" /> Option
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {(question.options ?? []).map((option, optionIndex) => (
                                  <div key={optionIndex} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                    <Input
                                      value={option.label}
                                      onChange={(event) => {
                                        const options = [...question.options];
                                        options[optionIndex] = { label: event.target.value, value: option.value || optionValue(event.target.value) };
                                        updateQuestion(index, { options });
                                      }}
                                      placeholder={`Option ${optionIndex + 1}`}
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => updateQuestion(index, { options: question.options.filter((_, i) => i !== optionIndex) })} aria-label="Supprimer l’option"><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" /> 3. Collecte, RGPD & publication</CardTitle>
                    <CardDescription>Réglez le statut, la confirmation et les limites de conservation.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select value={editingForm.status} onValueChange={(value) => setEditingForm({ ...editingForm, status: value as FormStatus })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Brouillon — invisible</SelectItem>
                          <SelectItem value="published">Publié — lien actif</SelectItem>
                          <SelectItem value="closed">Fermé — réponses bloquées</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Message de confirmation</Label>
                      <Input value={editingForm.successMessage ?? ''} onChange={(event) => setEditingForm({ ...editingForm, successMessage: event.target.value })} placeholder="Merci, votre réponse a bien été enregistrée." />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de fermeture automatique</Label>
                      <Input
                        type="datetime-local"
                        value={editingForm.expiresAt ? new Date(editingForm.expiresAt).toISOString().slice(0, 16) : ''}
                        onChange={(event) => setEditingForm({ ...editingForm, expiresAt: event.target.value ? new Date(event.target.value).toISOString() : null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rétention des réponses (jours)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={3650}
                        value={editingForm.retentionDays ?? ''}
                        onChange={(event) => setEditingForm({ ...editingForm, retentionDays: event.target.value ? Number(event.target.value) : null })}
                        placeholder="Ex : 365"
                      />
                    </div>
                    <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
                      <div className="flex items-center justify-between rounded-xl border p-4">
                        <div><Label>Collecter nom/email</Label><p className="text-xs text-muted-foreground">Ajoute les champs répondant.</p></div>
                        <Switch checked={editingForm.collectRespondentInfo} onCheckedChange={(checked) => setEditingForm({ ...editingForm, collectRespondentInfo: checked })} />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border p-4">
                        <div><Label>Réponses multiples</Label><p className="text-xs text-muted-foreground">Autorise plusieurs soumissions.</p></div>
                        <Switch checked={editingForm.allowMultipleSubmissions} onCheckedChange={(checked) => setEditingForm({ ...editingForm, allowMultipleSubmissions: checked })} />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border p-4">
                        <div><Label>Consentement RGPD</Label><p className="text-xs text-muted-foreground">Exige une acceptation.</p></div>
                        <Switch checked={editingForm.requireConsent} onCheckedChange={(checked) => setEditingForm({ ...editingForm, requireConsent: checked })} />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Texte de consentement</Label>
                      <Textarea
                        value={editingForm.consentText ?? ''}
                        onChange={(event) => setEditingForm({ ...editingForm, consentText: event.target.value })}
                        disabled={!editingForm.requireConsent}
                        className="min-h-20 disabled:opacity-60"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <aside className="hidden max-h-[calc(92vh-178px)] overflow-y-auto border-l bg-muted/20 p-5 lg:block">
              <div className="space-y-4">
                {formValidation.errors.length > 0 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>À corriger avant enregistrement</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {formValidation.errors.slice(0, 5).map((error) => <li key={error}>{error}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Prêt à enregistrer</AlertTitle>
                    <AlertDescription>La structure minimale est valide. Vérifiez l’aperçu avant publication.</AlertDescription>
                  </Alert>
                )}

                {formValidation.warnings.length > 0 && (
                  <div className="rounded-xl border bg-background p-4 text-sm">
                    <div className="font-medium">Conseils</div>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                      {formValidation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  </div>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4" /> Aperçu répondant</CardTitle>
                    <CardDescription className="truncate">{draftPublicUrl}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border bg-background p-4">
                      <div className="text-lg font-semibold">{editingForm.title || 'Titre du formulaire'}</div>
                      {editingForm.description ? <p className="mt-1 text-sm text-muted-foreground">{editingForm.description}</p> : <p className="mt-1 text-sm text-muted-foreground">Description affichée aux répondants.</p>}
                    </div>

                    {editingForm.collectRespondentInfo && (
                      <div className="space-y-2 rounded-xl border bg-background p-4">
                        <div className="text-sm font-medium">Informations répondant</div>
                        <Input disabled placeholder="Nom" />
                        <Input disabled placeholder="Email" />
                      </div>
                    )}

                    <div className="space-y-3">
                      {editingForm.questions.slice(0, 5).map((question, index) => (
                        <div key={question.id ?? index} className="rounded-xl border bg-background p-4">
                          <div className="text-sm font-medium">
                            {index + 1}. {question.label || 'Question sans titre'} {question.required && <span className="text-destructive">*</span>}
                          </div>
                          {question.description && <p className="mt-1 text-xs text-muted-foreground">{question.description}</p>}
                          {renderQuestionPreviewControl(question)}
                        </div>
                      ))}
                      {editingForm.questions.length > 5 && (
                        <div className="rounded-xl border border-dashed bg-background p-3 text-center text-xs text-muted-foreground">
                          + {editingForm.questions.length - 5} question(s) dans le formulaire complet
                        </div>
                      )}
                    </div>

                    {editingForm.requireConsent && (
                      <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                        <span className="mr-2 inline-block h-4 w-4 rounded border align-middle" />
                        {editingForm.consentText || 'Consentement requis'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>

          <DialogFooter className="border-t bg-background px-6 py-4">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
              <div className="text-xs text-muted-foreground">
                {formValidation.errors.length > 0 ? `${formValidation.errors.length} correction(s) requise(s)` : 'Structure valide'} · Version {editingForm.version}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button onClick={submitEditingForm} disabled={isSubmitting || formValidation.errors.length > 0}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isEditingForm ? 'Enregistrer les modifications' : 'Créer le formulaire'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

type QuestionType = 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'radio' | 'multiselect' | 'checkbox' | 'rating';
interface QuestionOption { label: string; value: string }
interface SurveyQuestion {
  id: string;
  label: string;
  description?: string | null;
  type: QuestionType;
  required: boolean;
  options: QuestionOption[];
}
interface PublicForm {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  collectRespondentInfo: boolean;
  allowMultipleSubmissions: boolean;
  successMessage?: string | null;
  questions: SurveyQuestion[];
}

function asString(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value);
}

export default function PublicSurveyFormPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formQuery = useQuery<ApiResponse<PublicForm>>({
    queryKey: slug ? queryKeys.forms.public(slug) : ['forms', 'public', 'empty'],
    queryFn: () => api.get(`/api/forms/${slug}`),
    enabled: Boolean(slug),
  });

  const form = formQuery.data?.data;

  const submitMutation = useMutation({
    mutationFn: () => api.post<ApiResponse<{ id: string; successMessage: string }>>(`/api/forms/${slug}/responses`, {
      respondentName: respondentName || undefined,
      respondentEmail: respondentEmail || undefined,
      answers,
    }),
    onSuccess: (response) => {
      setSubmittedMessage(response.data.successMessage || 'Merci, votre réponse a bien été enregistrée.');
      setSubmitError(null);
      setAnswers({});
      setRespondentName('');
      setRespondentEmail('');
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Impossible d’enregistrer votre réponse.');
    },
  });

  const requiredMissing = useMemo(() => {
    if (!form) return false;
    if (form.collectRespondentInfo && !respondentEmail) return true;
    return form.questions.some((question) => {
      if (!question.required) return false;
      const value = answers[question.id];
      return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    });
  }, [answers, form, respondentEmail]);

  const setAnswer = (questionId: string, value: unknown) => setAnswers((current) => ({ ...current, [questionId]: value }));

  const toggleMultiValue = (questionId: string, value: string, checked: boolean) => {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] as string[] : [];
    setAnswer(questionId, checked ? [...current, value] : current.filter((item) => item !== value));
  };

  const renderQuestion = (question: SurveyQuestion) => {
    const value = answers[question.id];
    const describedBy = question.description ? `${question.id}-description` : undefined;

    switch (question.type) {
      case 'textarea':
        return <Textarea aria-describedby={describedBy} value={asString(value)} onChange={(event) => setAnswer(question.id, event.target.value)} />;
      case 'email':
        return <Input aria-describedby={describedBy} type="email" value={asString(value)} onChange={(event) => setAnswer(question.id, event.target.value)} />;
      case 'phone':
        return <Input aria-describedby={describedBy} type="tel" value={asString(value)} onChange={(event) => setAnswer(question.id, event.target.value)} />;
      case 'number':
        return <Input aria-describedby={describedBy} type="number" value={asString(value)} onChange={(event) => setAnswer(question.id, event.target.value === '' ? '' : Number(event.target.value))} />;
      case 'date':
        return <Input aria-describedby={describedBy} type="date" value={asString(value)} onChange={(event) => setAnswer(question.id, event.target.value)} />;
      case 'select':
      case 'radio':
        return (
          <Select value={asString(value)} onValueChange={(nextValue) => setAnswer(question.id, nextValue)}>
            <SelectTrigger aria-describedby={describedBy}><SelectValue placeholder="Choisir une réponse" /></SelectTrigger>
            <SelectContent>
              {question.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'multiselect':
        return (
          <div className="space-y-2" aria-describedby={describedBy}>
            {question.options.map((option) => {
              const checked = Array.isArray(value) && value.includes(option.value);
              return (
                <label key={option.value} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <Checkbox checked={checked} onCheckedChange={(nextChecked) => toggleMultiValue(question.id, option.value, nextChecked === true)} />
                  {option.label}
                </label>
              );
            })}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-3 rounded-lg border p-3" aria-describedby={describedBy}>
            <Switch checked={Boolean(value)} onCheckedChange={(checked) => setAnswer(question.id, checked)} />
            <span className="text-sm">Oui</span>
          </div>
        );
      case 'rating':
        return (
          <Select value={value === undefined ? '' : String(value)} onValueChange={(nextValue) => setAnswer(question.id, Number(nextValue))}>
            <SelectTrigger aria-describedby={describedBy}><SelectValue placeholder="Note de 1 à 5" /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((note) => <SelectItem key={note} value={String(note)}>{note}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      default:
        return <Input aria-describedby={describedBy} value={asString(value)} onChange={(event) => setAnswer(question.id, event.target.value)} />;
    }
  };

  if (formQuery.isLoading) {
    return <main className="container mx-auto max-w-3xl px-4 py-12"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  }

  if (formQuery.isError || !form) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <Alert>
          <AlertDescription>Ce formulaire est introuvable ou n’est pas publié.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (submittedMessage) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h1 className="text-2xl font-bold">Réponse enregistrée</h1>
            <p className="text-muted-foreground">{submittedMessage}</p>
            {form.allowMultipleSubmissions && <Button onClick={() => setSubmittedMessage(null)}>Envoyer une autre réponse</Button>}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{form.title}</CardTitle>
          {form.description && <CardDescription className="whitespace-pre-wrap text-base">{form.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-8">
          {form.collectRespondentInfo && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={respondentName} onChange={(event) => setRespondentName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={respondentEmail} onChange={(event) => setRespondentEmail(event.target.value)} required />
              </div>
            </div>
          )}

          {form.questions.map((question, index) => (
            <div key={question.id} className="space-y-2">
              <Label htmlFor={question.id} className="text-base">
                {index + 1}. {question.label} {question.required && <span className="text-destructive">*</span>}
              </Label>
              {question.description && <p id={`${question.id}-description`} className="text-sm text-muted-foreground">{question.description}</p>}
              {renderQuestion(question)}
            </div>
          ))}

          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

          <Button size="lg" className="w-full" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || requiredMissing}>
            {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer ma réponse
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

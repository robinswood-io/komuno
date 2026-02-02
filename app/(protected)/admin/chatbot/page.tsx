'use client';

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Bot, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const dynamic = 'force-dynamic';

interface ChatbotResponse {
  success: boolean;
  answer?: string;
  sql?: string;
  data?: unknown[];
  error?: string;
}

interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  sql?: string;
  data?: unknown[];
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  if (value === undefined) return '';
  return JSON.stringify(value);
}

function normalizeRows(data: unknown[] | undefined): Record<string, unknown>[] {
  if (!data) return [];
  return data.filter(isRecord);
}

export default function AdminChatbotPage() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ChatbotResponse | null>(null);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);

  const rows = useMemo(() => normalizeRows(response?.data), [response?.data]);
  const columnKeys = useMemo(() => {
    if (rows.length === 0) return [] as string[];
    return Object.keys(rows[0]);
  }, [rows]);

  const submitQuestion = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/admin/chatbot/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          question: trimmed,
          context: 'dashboard',
        }),
      });

      const payload = (await res.json()) as ChatbotResponse;

      if (!res.ok || !payload.success) {
        const message = payload.error || 'Impossible de traiter la question.';
        setError(message);
        setResponse(payload);
        return;
      }

      setResponse(payload);
      const answerText = payload.answer ?? '';
      setHistory((prev) => [
        {
          id: `${Date.now()}`,
          question: trimmed,
          answer: answerText,
          sql: payload.sql,
          data: payload.data,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setQuestion('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [question, isLoading]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void submitQuestion();
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="chatbot-title">
            Chatbot Analytics
          </h1>
          <p className="text-muted-foreground">
            Posez vos questions sur les données et obtenez une réponse instantanée.
          </p>
        </div>
        <Bot className="h-8 w-8 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questionner les données</CardTitle>
          <CardDescription>Entrez une question en français pour générer une requête SQL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              data-testid="question-input"
              placeholder="Poser une question sur les métriques, l'engagement, les membres..."
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              data-testid="submit-button"
              onClick={() => void submitQuestion()}
              disabled={isLoading || question.trim().length === 0}
              className="sm:w-40"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2">Envoyer</span>
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive" data-testid="error">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {response?.answer ? (
        <Card>
          <CardHeader>
            <CardTitle>Réponse</CardTitle>
            <CardDescription>Analyse générée par le chatbot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4" data-testid="chatbot-answer">
              {response.answer}
            </div>

            {response.sql ? (
              <div>
                <p className="text-sm font-medium mb-2">SQL généré</p>
                <pre
                  className="rounded-md border bg-slate-950 p-4 text-xs text-slate-50 overflow-auto"
                  data-testid="sql-display"
                >
                  {response.sql}
                </pre>
              </div>
            ) : null}

            <div data-testid="results" className="space-y-2">
              <p className="text-sm font-medium">Résultats</p>
              {rows.length > 0 ? (
                <div className="overflow-auto border rounded-md">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {columnKeys.map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={`${rowIndex}`} className="border-t">
                          {columnKeys.map((key) => (
                            <td key={key} className="px-3 py-2">
                              {stringifyValue(row[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun résultat à afficher.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="history">
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>Dernières questions posées.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune question pour le moment.</p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="rounded-md border p-3 space-y-2"
                data-testid="history-item"
              >
                <p className="text-sm font-medium" data-testid="previous-question">
                  {item.question}
                </p>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

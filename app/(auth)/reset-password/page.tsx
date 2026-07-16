'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function responseMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { branding } = useBranding();
  const token = searchParams.get('token')?.trim() ?? '';
  const appName = branding?.app?.shortName || 'Komuno';
  const [validationState, setValidationState] = useState<'validating' | 'valid' | 'invalid'>('validating');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const validateToken = async () => {
      if (!token) {
        setValidationState('invalid');
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`,
          { signal: controller.signal, credentials: 'same-origin' },
        );
        const payload: unknown = await response.json().catch(() => null);
        const valid = Boolean(
          response.ok
          && payload
          && typeof payload === 'object'
          && 'valid' in payload
          && (payload as { valid?: unknown }).valid === true,
        );
        setValidationState(valid ? 'valid' : 'invalid');
      } catch (error) {
        if (!controller.signal.aborted) {
          setValidationState('invalid');
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de valider ce lien.');
        }
      }
    };

    void validateToken();
    return () => controller.abort();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirmation) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage('Utilisez au moins 8 caractères avec une majuscule, une minuscule et un chiffre.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseMessage(payload, 'Impossible de définir le nouveau mot de passe.'));
      }

      setPassword('');
      setConfirmation('');
      setIsComplete(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Une erreur inattendue est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-12 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Administration {appName}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Définir votre mot de passe</CardTitle>
            <CardDescription>
              Choisissez un mot de passe unique pour sécuriser votre accès.
            </CardDescription>
          </CardHeader>

          {validationState === 'validating' && (
            <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Validation du lien…
            </CardContent>
          )}

          {validationState === 'invalid' && (
            <>
              <CardContent>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Lien invalide ou expiré</AlertTitle>
                  <AlertDescription>
                    {errorMessage ?? 'Demandez un nouveau lien de réinitialisation. Les liens expirent après une heure.'}
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button asChild className="w-full">
                  <Link href="/forgot-password">Demander un nouveau lien</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la connexion
                  </Link>
                </Button>
              </CardFooter>
            </>
          )}

          {validationState === 'valid' && isComplete && (
            <>
              <CardContent>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Mot de passe défini</AlertTitle>
                  <AlertDescription>
                    Votre nouveau mot de passe est actif. Vous pouvez maintenant vous connecter.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/login">Se connecter</Link>
                </Button>
              </CardFooter>
            </>
          )}

          {validationState === 'valid' && !isComplete && (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Mot de passe refusé</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Au moins 8 caractères, une majuscule, une minuscule et un chiffre.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmation"
                    name="confirmation"
                    type="password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    'Définir mon mot de passe'
                  )}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la connexion
                  </Link>
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={(
        <main className="flex min-h-screen items-center justify-center bg-muted/30">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Chargement" />
        </main>
      )}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

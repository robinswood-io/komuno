'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Shield, AlertCircle, Mail, Lock } from "lucide-react";
import { hasPermission } from "@/shared/schema";
import { branding, getShortAppName } from '@/lib/config/branding';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Calculer isAdmin après tous les hooks
  const isAdmin = user ? hasPermission(user.role, 'admin.view') : false;

  // Vérifier les paramètres d'erreur dans l'URL
  const error = searchParams.get('error');

  // Redirect if already logged in (dans useEffect pour éviter setState pendant render)
  useEffect(() => {
    if (!isLoading && user) {
      router.push(isAdmin ? "/admin" : "/");
    }
  }, [user, isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">CJD</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Administration {getShortAppName()}</h1>
            <p className="text-gray-600">Connectez-vous pour accéder au back-office</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connexion</CardTitle>
              <CardDescription>
                Entrez vos identifiants pour vous connecter
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur d'authentification</AlertTitle>
                    <AlertDescription>
                      {error === "authentication_failed" && "L'authentification a échoué. Veuillez réessayer."}
                      {error === "session_failed" && "Erreur lors de l'établissement de la session. Veuillez réessayer."}
                      {error !== "authentication_failed" && error !== "session_failed" && decodeURIComponent(error)}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Comptes de test en mode développement */}
                {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900">Mode Dev Login Actif</AlertTitle>
                    <AlertDescription className="text-blue-800 text-xs space-y-1">
                      <div>Comptes de test (mot de passe: n'importe quoi):</div>
                      <div className="font-mono space-y-0.5 mt-1">
                        <div className="cursor-pointer hover:bg-blue-100 p-1 rounded" onClick={() => setEmail('admin@test.local')}>
                          • admin@test.local (super_admin)
                        </div>
                        <div className="cursor-pointer hover:bg-blue-100 p-1 rounded" onClick={() => setEmail('manager@test.local')}>
                          • manager@test.local (events_manager)
                        </div>
                        <div className="cursor-pointer hover:bg-blue-100 p-1 rounded" onClick={() => setEmail('reader@test.local')}>
                          • reader@test.local (events_reader)
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary"
                  disabled={loginMutation.isPending}
                  size="lg"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Se connecter
                    </>
                  )}
                </Button>
              </CardContent>
            </form>

            <CardFooter className="flex justify-center">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="flex-1 bg-primary relative overflow-hidden hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary"></div>
        <div className="relative z-10 flex flex-col justify-center items-center h-full text-white p-12">
          <h2 className="text-4xl font-bold mb-6">Boîte à Kiffs</h2>
          <p className="text-xl mb-8 text-center max-w-md">
            La plateforme collaborative du {branding.organization.fullName}
          </p>

          <div className="space-y-6 max-w-sm">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Authentification sécurisée</h3>
                <p className="text-sm opacity-90">
                  Connexion par email et mot de passe sécurisé
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

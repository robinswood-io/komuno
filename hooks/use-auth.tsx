import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@/shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthMode = 'local' | 'oauth';

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  authMode: AuthMode;
  loginMutation: UseMutationResult<SelectUser | void, Error, { email: string; password: string } | undefined>;
  logoutMutation: UseMutationResult<void, Error, void>;
  forgotPasswordMutation: UseMutationResult<{ message: string }, Error, { email: string }>;
  resetPasswordMutation: UseMutationResult<{ message: string }, Error, { token: string; password: string }>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<AuthMode>('oauth');
  const devLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';
  const [skipAuthUserQuery, setSkipAuthUserQuery] = useState(() => {
    if (!devLoginEnabled || typeof window === 'undefined') {
      return false;
    }
    return Boolean(window.localStorage.getItem('admin-user'));
  });

  // Récupérer le mode d'authentification au démarrage
  useEffect(() => {
    const fetchAuthMode = async () => {
      try {
        const response = await fetch('/api/auth/mode');
        const result = await response.json();
        // L'API retourne {success: true, data: {mode: "local"}}
        setAuthMode(result.data?.mode || 'oauth');
      } catch {
        // Par défaut, utiliser oauth si la requête échoue
        setAuthMode('oauth');
      }
    };
    fetchAuthMode();
  }, []);

  useEffect(() => {
    if (!devLoginEnabled || typeof window === 'undefined') {
      return;
    }

    setSkipAuthUserQuery(Boolean(window.localStorage.getItem('admin-user')));
  }, [devLoginEnabled]);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !skipAuthUserQuery,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials?: { email: string; password: string }) => {
      if (authMode === 'oauth' || !credentials) {
        // Rediriger vers la page de login
        window.location.href = "/login";
        return;
      }

      // Mode local : envoyer les credentials
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      if (data && authMode === 'local') {
        queryClient.setQueryData(["/api/auth/user"], data);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
        });

        // Redirection vers le dashboard admin ou l'accueil
        const user = data as SelectUser;
        const isAdmin = user.role === 'super_admin' || user.role.includes('admin') || user.role.includes('manager');
        window.location.href = isAdmin ? '/admin' : '/';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Identifiants invalides",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de déconnexion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email envoyé",
        description: "Si votre email est enregistré, vous recevrez un lien de réinitialisation.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mot de passe réinitialisé",
        description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        authMode,
        loginMutation,
        logoutMutation,
        forgotPasswordMutation,
        resetPasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

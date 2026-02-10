'use client';

import IdeasSection from "@/components/ideas-section";
import { useRouter } from "next/navigation";
import { useModuleGuard } from "@/hooks/use-module-guard";
import { Loader2 } from "lucide-react";

/**
 * Page Idées - Publique
 * Accessible sans authentification
 * Le bouton de proposition redirige vers /propose qui vérifie l'auth
 */
export default function IdeasPage() {
  const router = useRouter();
  const { isEnabled, isLoading } = useModuleGuard('ideas');

  const handleProposeIdea = () => {
    // Rediriger vers la page de proposition (protégée par auth)
    // Le middleware redirigera vers login si non connecté
    router.push('/propose');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
      <IdeasSection onNavigateToPropose={handleProposeIdea} />
    </div>
  );
}

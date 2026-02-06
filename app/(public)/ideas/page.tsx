'use client';

import IdeasSection from "@/components/ideas-section";
import { useRouter } from "next/navigation";

/**
 * Page Idées - Publique
 * Accessible sans authentification
 * Le bouton de proposition redirige vers /propose qui vérifie l'auth
 */
export default function IdeasPage() {
  const router = useRouter();

  const handleProposeIdea = () => {
    // Rediriger vers la page de proposition (protégée par auth)
    // Le middleware redirigera vers login si non connecté
    router.push('/propose');
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
      <IdeasSection onNavigateToPropose={handleProposeIdea} />
    </div>
  );
}

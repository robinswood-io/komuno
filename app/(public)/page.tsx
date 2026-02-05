'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import IdeasSection from "@/components/ideas-section";
import EventsSection from "@/components/events-section";
import { branding, getShortAppName } from '@/lib/config/branding';
import { SiGithub } from 'react-icons/si';
import { useFeatureConfig } from "@/contexts/FeatureConfigContext";

export default function HomePage() {
  const router = useRouter();
  const { isFeatureEnabled } = useFeatureConfig();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer la version depuis l'API
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        if (data.version) {
          setVersion(data.version);
        }
      })
      .catch(() => {
        // Ignorer les erreurs silencieusement
      });
  }, []);

  return (
    <div className="font-lato bg-gray-50 min-h-screen">
      {/* Header would typically be in layout, but keeping it here for now if needed */}
      <main>
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
          {isFeatureEnabled('ideas') && (
            <IdeasSection onNavigateToPropose={() => router.push("/propose")} />
          )}
          {/* Séparateur visuel entre les sections */}
          {isFeatureEnabled('events') && (
            <div className="mt-8 sm:mt-12 border-t-4 border-primary pt-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-primary">📅 Événements à venir</h2>
                <p className="text-gray-600 mt-2">Inscrivez-vous aux prochains événements {getShortAppName()}</p>
              </div>
              <EventsSection />
            </div>
          )}
        </div>

        <footer className="bg-gray-800 text-white py-6 sm:py-8 mt-12 sm:mt-16">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4 text-center sm:text-left">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm sm:text-base">CJD</span>
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">{branding.organization.fullName}</p>
                  <p className="text-xs sm:text-sm text-gray-400">© 2025 - Tous droits réservés</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <button
                  onClick={() => router.push("/admin")}
                  className="text-xs sm:text-sm text-gray-400 hover:text-primary transition-colors duration-200 underline"
                  data-testid="link-admin"
                >
                  Administration
                </button>
                <div className="text-xs sm:text-sm text-gray-400 flex items-center gap-2 sm:gap-3">
                  <span>Créé avec ❤️ par <a href="https://robinswood.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-success-light transition-colors duration-200">Thibault</a></span>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex flex-col items-center gap-1">
                    <a
                      href="https://github.com/Aoleon/cjd80"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gray-400 hover:text-primary transition-colors duration-200"
                      data-testid="link-github"
                    >
                      <SiGithub className="w-4 h-4" />
                      <span>Open Source</span>
                    </a>
                    {version && (
                      <span className="text-xs text-gray-500" data-testid="version-tag">
                        {version}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

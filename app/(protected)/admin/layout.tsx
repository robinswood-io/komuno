'use client';

import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminBreadcrumbs } from '@/components/admin/admin-breadcrumbs';
import { usePathname } from 'next/navigation';

/**
 * Layout pour l'espace admin
 * Structure avec sidebar fixe à gauche et contenu scrollable à droite
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Extraire le titre de la page depuis le pathname
  const getPageTitle = () => {
    if (!pathname) return 'Admin';

    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    const titles: Record<string, string> = {
      dashboard: 'Tableau de bord',
      members: 'Membres',
      tags: 'Tags',
      tasks: 'Tâches',
      relations: 'Relations',
      stats: 'Statistiques',
      patrons: 'Mécènes',
      ideas: 'Idées',
      events: 'Événements',
      loans: 'Prêts',
      financial: 'Finance',
      settings: 'Paramètres',
      crm: 'CRM',
      content: 'Contenu',
      finance: 'Finance',
      tracking: 'Tracking',
      'development-requests': 'Demandes dev',
      branding: 'Branding',
    };

    return titles[lastSegment] || lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar fixe */}
      <AdminSidebar />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header avec breadcrumbs */}
        <header className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
          </div>
          <AdminBreadcrumbs />
        </header>

        {/* Zone de contenu scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

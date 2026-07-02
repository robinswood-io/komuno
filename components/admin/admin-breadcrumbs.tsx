'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

interface BreadcrumbSegment {
  label: string;
  href: string;
}

const settingsChildSegments = new Set(['audit', 'automations', 'development-requests', 'tracking']);

const pathLabels: Record<string, string> = {
  admin: 'Administration',
  dashboard: 'Tableau de bord',
  members: 'Membres',
  tags: 'Tags',
  groups: 'Groupes',
  tasks: 'Tâches',
  relations: 'Relations',
  stats: 'Statistiques',
  patrons: 'Mécènes',
  ideas: 'Idées',
  events: 'Événements',
  forms: 'Formulaires',
  loans: 'Prêts',
  financial: 'Finance',
  federation: 'Fédération',
  settings: 'Paramètres',
  tracking: 'Tracking',
  automations: 'Automations',
  audit: 'Audit',
  'development-requests': 'Demandes dev',
  crm: 'CRM',
  content: 'Contenu',
  finance: 'Finance',
  new: 'Nouveau',
  edit: 'Modifier',
  details: 'Détails',
};

export function AdminBreadcrumbs() {
  const pathname = usePathname();

  if (!pathname) return null;

  // Extraire les segments du chemin
  const segments = pathname.split('/').filter(Boolean);

  // Générer les breadcrumbs
  const breadcrumbs: BreadcrumbSegment[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    return {
      label,
      href,
    };
  });

  if (segments[0] === 'admin' && settingsChildSegments.has(segments[1])) {
    breadcrumbs.splice(1, 0, {
      label: 'Paramètres',
      href: '/admin/settings',
    });
  }

  // Ne rien afficher si on est à la racine admin
  if (breadcrumbs.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin/dashboard" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Administration</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isAdmin = crumb.label === 'Administration';

          // Ne pas afficher "Administration" car on a déjà l'icône Home
          if (isAdmin) return null;

          return (
            <div key={crumb.href} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

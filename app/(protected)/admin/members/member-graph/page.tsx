'use client';

import dynamic from 'next/dynamic';

// Dynamic import pour TOUTE la page (hooks client-only)
const MemberGraphContent = dynamic(
  () => import('@/components/admin/relations/member-graph-content').then(mod => ({ default: mod.RelationsPageContent })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }
);

/**
 * Page Gestion des Relations - Graphe de relations membres
 */
export default function AdminMembersGraphPage() {
  return <MemberGraphContent />;
}

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRelationGraph } from '@/hooks/use-relation-graph';
import { useGraphFilters } from '@/hooks/use-graph-filters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RelationFilters } from '@/components/admin/relations/relation-filters';
import { MemberDetailPanel } from '@/components/admin/relations/member-detail-panel';
import { RelationsTable } from '@/components/admin/relations/relations-table';
import { Loader2, Network, TableIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Dynamic import pour le graphe (WebGL, client-only)
const RelationGraphView = dynamic(
  () => import('@/components/admin/relations/relation-graph-view').then(mod => ({ default: mod.RelationGraphView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] rounded-lg border border-input overflow-hidden bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
);

/**
 * Contenu principal de la page Relations (client-only)
 */
export function RelationsPageContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'graph' | 'table'>('graph');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Charger les données du graphe
  const { nodes: allNodes, edges: allEdges, members, relations, isLoading, error } = useRelationGraph();

  // Gérer les filtres
  const {
    filters,
    nodes: filteredNodes,
    edges: filteredEdges,
    availableOptions,
    updateRelationTypeFilter,
    updateMemberStatusFilter,
    updateSearchQuery,
    setEgoNetworkMode,
    resetToNetworkMode,
    togglePatrons,
    updateCompanyFilter,
    updateRoleFilter,
    updateCjdRoleFilter,
    updateDepartmentFilter,
    updateCityFilter,
    updatePostalCodeFilter,
    updateSectorFilter,
    resetAllFilters,
  } = useGraphFilters(allNodes, allEdges);

  const handleNodeSelect = (email: string) => {
    setSelectedNode(email);
  };

  const handleEgoNetworkClick = (email: string) => {
    setEgoNetworkMode(email);
    toast({
      title: 'Mode Ego Network activé',
      description: `Graphe centré sur ${email}`,
    });
  };

  const handleResetToNetwork = () => {
    resetToNetworkMode();
    setSelectedNode(null);
    toast({
      title: 'Mode Network activé',
      description: 'Vue globale du réseau',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erreur</CardTitle>
          <CardDescription>Impossible de charger les relations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description de la page */}
      <p className="text-muted-foreground">
        Visualisez et gérez les relations entre les membres de l'association
      </p>

      {/* Onglets Graphe/Tableau */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'graph' | 'table')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="graph" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Graphe
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Tableau
          </TabsTrigger>
        </TabsList>

        {/* Tab Graphe */}
        <TabsContent value="graph" className="space-y-4 mt-6">
          {/* Filtres en haut sur mobile, à gauche sur desktop */}
          <div className="mb-4">
            <RelationFilters
              filters={filters}
              availableOptions={availableOptions}
              onRelationTypeChange={updateRelationTypeFilter}
              onStatusChange={updateMemberStatusFilter}
              onSearchChange={updateSearchQuery}
              onTogglePatrons={togglePatrons}
              onCompanyChange={updateCompanyFilter}
              onRoleChange={updateRoleFilter}
              onCjdRoleChange={updateCjdRoleFilter}
              onDepartmentChange={updateDepartmentFilter}
              onCityChange={updateCityFilter}
              onPostalCodeChange={updatePostalCodeFilter}
              onSectorChange={updateSectorFilter}
              onReset={resetAllFilters}
            />

            {filters.viewMode === 'ego-network' && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleResetToNetwork}
                >
                  Retour au réseau complet
                </Button>
              </div>
            )}
          </div>

          {/* Graphe en pleine largeur */}
          <Card>
            <CardHeader>
              <CardTitle>Réseau de relations</CardTitle>
              <CardDescription>
                {filteredNodes.length} membre(s) - {filteredEdges.length} relation(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[600px]">
              <RelationGraphView
                nodes={filteredNodes}
                edges={filteredEdges}
                onNodeSelect={handleNodeSelect}
                selectedNode={selectedNode || undefined}
              />
            </CardContent>
          </Card>

          {/* Panel de détails en dessous sur mobile, flottant sur desktop */}
          {selectedNode && (
            <MemberDetailPanel
              memberEmail={selectedNode}
              members={members}
              relations={relations}
              onEgoNetworkClick={handleEgoNetworkClick}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </TabsContent>

        {/* Tab Tableau */}
        <TabsContent value="table" className="mt-6">
          <RelationsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

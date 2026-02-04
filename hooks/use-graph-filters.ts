'use client';

import { useState, useMemo } from 'react';
import { type GraphNode, type GraphEdge, type MemberRelation } from './use-relation-graph';

/**
 * Interface pour les filtres du graphe
 */
export interface GraphFilters {
  relationTypes: Set<MemberRelation['relationType']>;
  memberStatus: 'all' | 'active' | 'inactive';
  minEngagementScore: number;
  searchQuery: string;
  viewMode: 'network' | 'ego-network';
  egoNetworkCenter?: string;
}

// Export du type MemberRelation pour réutilisation
export type { MemberRelation } from './use-relation-graph';

/**
 * Hook pour gérer l'état des filtres et filtrer les nœuds/arêtes
 */
export function useGraphFilters(allNodes: GraphNode[], allEdges: GraphEdge[]) {
  const [filters, setFilters] = useState<GraphFilters>({
    relationTypes: new Set(['sponsor', 'team', 'custom']),
    memberStatus: 'all',
    minEngagementScore: 0,
    searchQuery: '',
    viewMode: 'network',
  });

  // Filtrer les nœuds et arêtes selon les critères
  const { nodes, edges } = useMemo(() => {
    let filteredNodes = allNodes;
    let filteredEdges = allEdges;

    // Filtre 1: Statut des membres
    if (filters.memberStatus !== 'all') {
      filteredNodes = filteredNodes.filter(
        node => node.data.member.status === filters.memberStatus
      );
    }

    // Filtre 2: Score d'engagement minimum
    if (filters.minEngagementScore > 0) {
      filteredNodes = filteredNodes.filter(
        node => node.data.member.engagementScore >= filters.minEngagementScore
      );
    }

    // Filtre 3: Recherche par nom/email
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(node => {
        const fullName = `${node.data.member.firstName} ${node.data.member.lastName}`.toLowerCase();
        const email = node.data.member.email.toLowerCase();
        return fullName.includes(query) || email.includes(query);
      });
    }

    // Filtre 4: Mode Ego Network
    if (filters.viewMode === 'ego-network' && filters.egoNetworkCenter) {
      const centerEmail = filters.egoNetworkCenter;

      // Trouver tous les emails connectés au centre
      const connectedEmails = new Set<string>([centerEmail]);

      allEdges.forEach(edge => {
        if (edge.source === centerEmail) {
          connectedEmails.add(edge.target);
        }
        if (edge.target === centerEmail) {
          connectedEmails.add(edge.source);
        }
      });

      // Filtrer les nœuds: uniquement centre + connexions
      filteredNodes = filteredNodes.filter(node =>
        connectedEmails.has(node.id)
      );
    }

    // Filtrer les arêtes selon les types de relation et nœuds visibles
    const visibleEmails = new Set(filteredNodes.map(n => n.id));

    filteredEdges = filteredEdges.filter(edge => {
      // Arête visible seulement si les deux nœuds sont visibles
      if (!visibleEmails.has(edge.source) || !visibleEmails.has(edge.target)) {
        return false;
      }

      // Filtrer par type de relation
      if (!filters.relationTypes.has(edge.data.relation.relationType)) {
        return false;
      }

      return true;
    });

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [allNodes, allEdges, filters]);

  // Actions pour modifier les filtres
  const updateRelationTypeFilter = (
    type: MemberRelation['relationType'],
    enabled: boolean
  ) => {
    setFilters(prev => {
      const newTypes = new Set(prev.relationTypes);
      if (enabled) {
        newTypes.add(type);
      } else {
        newTypes.delete(type);
      }
      return { ...prev, relationTypes: newTypes };
    });
  };

  const updateMemberStatusFilter = (status: 'all' | 'active' | 'inactive') => {
    setFilters(prev => ({ ...prev, memberStatus: status }));
  };

  const updateSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const updateMinEngagementScore = (score: number) => {
    setFilters(prev => ({ ...prev, minEngagementScore: score }));
  };

  const setEgoNetworkMode = (memberEmail: string) => {
    setFilters(prev => ({
      ...prev,
      viewMode: 'ego-network',
      egoNetworkCenter: memberEmail,
    }));
  };

  const resetToNetworkMode = () => {
    setFilters(prev => ({
      ...prev,
      viewMode: 'network',
      egoNetworkCenter: undefined,
    }));
  };

  const resetAllFilters = () => {
    setFilters({
      relationTypes: new Set(['sponsor', 'team', 'custom']),
      memberStatus: 'all',
      minEngagementScore: 0,
      searchQuery: '',
      viewMode: 'network',
    });
  };

  return {
    filters,
    nodes,
    edges,
    updateRelationTypeFilter,
    updateMemberStatusFilter,
    updateSearchQuery,
    updateMinEngagementScore,
    setEgoNetworkMode,
    resetToNetworkMode,
    resetAllFilters,
  };
}

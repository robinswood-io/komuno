'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api/client';

/**
 * Types pour les données membres et relations
 */
export interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  role?: string;
  cjdRole?: string;
  status: 'active' | 'inactive';
  engagementScore: number;
  activityCount: number;
  lastActivityAt?: string;
  proposedBy?: string;
}

export interface MemberRelation {
  id: string;
  memberEmail: string;
  relatedMemberEmail: string;
  relationType: 'sponsor' | 'team' | 'custom';
  description?: string;
  createdBy?: string;
  createdAt: string;
}

/**
 * Types pour le graphe Reagraph
 */
export interface GraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  data: {
    member: Member;
    connectionCount: number;
    types: Set<MemberRelation['relationType']>;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  color: string;
  size: number;
  data: {
    relation: MemberRelation;
  };
}

/**
 * Couleurs pour les types de relations
 */
const RELATION_COLORS: Record<MemberRelation['relationType'], string> = {
  sponsor: '#3b82f6', // Blue
  team: '#10b981',    // Green
  custom: '#a855f7',  // Purple
};

/**
 * Couleur du nœud basée sur le statut du membre
 */
const getStatusColor = (status: Member['status']): string => {
  return status === 'active' ? '#059669' : '#9ca3af';
};

/**
 * Hook pour transformer les données API en format graphe
 */
export function useRelationGraph() {
  // Fetch membres
  const { data: membersData, isLoading: membersLoading, error: membersError } = useQuery({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Member[] }>('/api/admin/members');
      return response.data;
    },
  });

  // Fetch relations
  const { data: relationsData, isLoading: relationsLoading, error: relationsError } = useQuery({
    queryKey: queryKeys.members.relations.all,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MemberRelation[] }>('/api/admin/relations');
      return response.data;
    },
  });

  const members = membersData || [];
  const relations = relationsData || [];

  // Transformer les données en nœuds et arêtes de graphe
  const { nodes, edges } = useMemo(() => {
    if (!members.length) {
      return { nodes: [], edges: [] };
    }

    // Calculer le nombre de connexions par membre
    const connectionCounts = new Map<string, number>();
    const connectionTypes = new Map<string, Set<MemberRelation['relationType']>>();

    relations.forEach(relation => {
      // Compter les connexions
      connectionCounts.set(
        relation.memberEmail,
        (connectionCounts.get(relation.memberEmail) || 0) + 1
      );
      connectionCounts.set(
        relation.relatedMemberEmail,
        (connectionCounts.get(relation.relatedMemberEmail) || 0) + 1
      );

      // Collecter les types de relations
      if (!connectionTypes.has(relation.memberEmail)) {
        connectionTypes.set(relation.memberEmail, new Set());
      }
      if (!connectionTypes.has(relation.relatedMemberEmail)) {
        connectionTypes.set(relation.relatedMemberEmail, new Set());
      }
      connectionTypes.get(relation.memberEmail)?.add(relation.relationType);
      connectionTypes.get(relation.relatedMemberEmail)?.add(relation.relationType);
    });

    // Construire les nœuds
    const graphNodes: GraphNode[] = members.map(member => {
      const connectionCount = connectionCounts.get(member.email) || 0;
      const types = connectionTypes.get(member.email) || new Set();

      return {
        id: member.email,
        label: `${member.firstName} ${member.lastName}`,
        // Taille basée sur le score d'engagement (1-5)
        size: Math.max(1, Math.min(5, member.engagementScore / 25)),
        color: getStatusColor(member.status),
        data: {
          member,
          connectionCount,
          types,
        },
      };
    });

    // Construire les arêtes
    const visibleEmails = new Set(graphNodes.map(n => n.id));
    const graphEdges: GraphEdge[] = relations
      .filter(relation => {
        // Ne montrer que les arêtes entre nœuds visibles
        return visibleEmails.has(relation.memberEmail) &&
               visibleEmails.has(relation.relatedMemberEmail);
      })
      .map(relation => ({
        id: `${relation.memberEmail}-${relation.relatedMemberEmail}`,
        source: relation.memberEmail,
        target: relation.relatedMemberEmail,
        label: relation.relationType,
        color: RELATION_COLORS[relation.relationType],
        // Épaisseur: sponsor = 2, autres = 1
        size: relation.relationType === 'sponsor' ? 2 : 1,
        data: {
          relation,
        },
      }));

    return { nodes: graphNodes, edges: graphEdges };
  }, [members, relations]);

  return {
    nodes,
    edges,
    members,
    relations,
    isLoading: membersLoading || relationsLoading,
    error: membersError || relationsError,
  };
}

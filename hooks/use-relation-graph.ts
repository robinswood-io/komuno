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
  department?: string;
  city?: string;
  postalCode?: string;
  sector?: string;
  role?: string;
  cjdRole?: string;
  status: 'active' | 'inactive';
  engagementScore: number;
  activityCount: number;
  lastActivityAt?: string;
  proposedBy?: string;
}

export interface Patron {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  department?: string;
  city?: string;
  postalCode?: string;
  sector?: string;
  role?: string;
  phone?: string;
  status: 'prospect' | 'active' | 'inactive';
  referrerId?: string; // ID du membre prescripteur
  createdAt: string;
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
    member?: Member;
    patron?: Patron;
    nodeType: 'member' | 'patron';
    connectionCount: number;
    types: Set<MemberRelation['relationType'] | 'patron_referral'>;
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
 * Couleurs pour les types de relations (plus vives pour meilleure visibilité)
 */
const RELATION_COLORS: Record<MemberRelation['relationType'], string> = {
  sponsor: '#60a5fa', // Blue clair et vif
  team: '#34d399',    // Green clair et vif
  custom: '#c084fc',  // Purple clair et vif
};

/**
 * Couleur du nœud basée sur le statut du membre
 */
const getStatusColor = (status: Member['status']): string => {
  return status === 'active' ? '#059669' : '#9ca3af';
};

/**
 * Couleur du nœud patron basée sur le statut
 */
const getPatronColor = (status: Patron['status']): string => {
  switch (status) {
    case 'active': return '#f59e0b'; // Orange pour mécènes actifs
    case 'prospect': return '#fbbf24'; // Jaune pour prospects
    case 'inactive': return '#d1d5db'; // Gris pour inactifs
    default: return '#9ca3af';
  }
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

  // Fetch patrons
  const { data: patronsData, isLoading: patronsLoading, error: patronsError } = useQuery({
    queryKey: queryKeys.patrons.all,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Patron[] }>('/api/admin/patrons?limit=1000');
      return response.data;
    },
  });

  const members = membersData || [];
  const relations = relationsData || [];
  const patrons = patronsData || [];

  // Transformer les données en nœuds et arêtes de graphe
  const { nodes, edges } = useMemo(() => {
    if (!members.length) {
      return { nodes: [], edges: [] };
    }

    // Calculer le nombre de connexions par membre/patron
    const connectionCounts = new Map<string, number>();
    const connectionTypes = new Map<string, Set<MemberRelation['relationType'] | 'patron_referral'>>();

    // Compter les connexions membres ↔ membres
    relations.forEach(relation => {
      connectionCounts.set(
        relation.memberEmail,
        (connectionCounts.get(relation.memberEmail) || 0) + 1
      );
      connectionCounts.set(
        relation.relatedMemberEmail,
        (connectionCounts.get(relation.relatedMemberEmail) || 0) + 1
      );

      if (!connectionTypes.has(relation.memberEmail)) {
        connectionTypes.set(relation.memberEmail, new Set());
      }
      if (!connectionTypes.has(relation.relatedMemberEmail)) {
        connectionTypes.set(relation.relatedMemberEmail, new Set());
      }
      connectionTypes.get(relation.memberEmail)?.add(relation.relationType);
      connectionTypes.get(relation.relatedMemberEmail)?.add(relation.relationType);
    });

    // Compter les connexions patrons → membres (prescripteur)
    patrons.forEach(patron => {
      if (patron.referrerId) {
        const patronId = `patron-${patron.id}`;
        connectionCounts.set(patronId, (connectionCounts.get(patronId) || 0) + 1);

        // Trouver l'email du membre prescripteur
        const referrer = members.find(m => m.id === patron.referrerId);
        if (referrer) {
          connectionCounts.set(referrer.email, (connectionCounts.get(referrer.email) || 0) + 1);

          if (!connectionTypes.has(patronId)) {
            connectionTypes.set(patronId, new Set());
          }
          if (!connectionTypes.has(referrer.email)) {
            connectionTypes.set(referrer.email, new Set());
          }
          connectionTypes.get(patronId)?.add('patron_referral');
          connectionTypes.get(referrer.email)?.add('patron_referral');
        }
      }
    });

    // Construire les nœuds membres
    const memberNodes: GraphNode[] = members.map(member => {
      const connectionCount = connectionCounts.get(member.email) || 0;
      const types = connectionTypes.get(member.email) || new Set();

      const baseSize = 8;
      const sizeBonus = Math.min(12, connectionCount * 2);
      const nodeSize = baseSize + sizeBonus;

      return {
        id: member.email,
        label: `${member.firstName} ${member.lastName}`,
        size: nodeSize,
        color: getStatusColor(member.status),
        data: {
          member,
          nodeType: 'member' as const,
          connectionCount,
          types,
        },
      };
    });

    // Construire les nœuds patrons
    const patronNodes: GraphNode[] = patrons.map(patron => {
      const patronId = `patron-${patron.id}`;
      const connectionCount = connectionCounts.get(patronId) || 0;
      const types = connectionTypes.get(patronId) || new Set();

      const baseSize = 8;
      const sizeBonus = Math.min(12, connectionCount * 2);
      const nodeSize = baseSize + sizeBonus;

      return {
        id: patronId,
        label: `${patron.firstName} ${patron.lastName} (M)`,
        size: nodeSize,
        color: getPatronColor(patron.status),
        data: {
          patron,
          nodeType: 'patron' as const,
          connectionCount,
          types,
        },
      };
    });

    const graphNodes = [...memberNodes, ...patronNodes];

    // Construire les arêtes membres ↔ membres
    const visibleIds = new Set(graphNodes.map(n => n.id));
    const memberEdges: GraphEdge[] = relations
      .filter(relation => {
        return visibleIds.has(relation.memberEmail) &&
               visibleIds.has(relation.relatedMemberEmail);
      })
      .map(relation => {
        const labelMap: Record<MemberRelation['relationType'], string> = {
          sponsor: 'Parrain/Marraine',
          team: 'Équipe/Collègue',
          custom: 'Relation personnalisée',
        };

        return {
          id: `${relation.memberEmail}-${relation.relatedMemberEmail}`,
          source: relation.memberEmail,
          target: relation.relatedMemberEmail,
          label: labelMap[relation.relationType],
          color: RELATION_COLORS[relation.relationType],
          size: relation.relationType === 'sponsor' ? 5 : 4,
          data: {
            relation,
          },
        };
      });

    // Construire les arêtes patrons → membres (prescripteur)
    const patronEdges: GraphEdge[] = patrons
      .filter(patron => {
        const patronId = `patron-${patron.id}`;
        const referrer = members.find(m => m.id === patron.referrerId);
        return patron.referrerId && referrer && visibleIds.has(patronId) && visibleIds.has(referrer.email);
      })
      .map(patron => {
        const patronId = `patron-${patron.id}`;
        const referrer = members.find(m => m.id === patron.referrerId)!;

        return {
          id: `${patronId}-${referrer.email}`,
          source: referrer.email,
          target: patronId,
          label: 'Prescripteur',
          color: '#f59e0b', // Orange pour relation mécène
          size: 3,
          data: {
            relation: {
              id: patronId,
              memberEmail: referrer.email,
              relatedMemberEmail: patronId,
              relationType: 'patron_referral' as any,
              description: `Prescripteur de ${patron.firstName} ${patron.lastName}`,
              createdAt: patron.createdAt,
            },
          },
        };
      });

    const graphEdges = [...memberEdges, ...patronEdges];

    return { nodes: graphNodes, edges: graphEdges };
  }, [members, relations, patrons]);

  return {
    nodes,
    edges,
    members,
    relations,
    patrons,
    isLoading: membersLoading || relationsLoading || patronsLoading,
    error: membersError || relationsError || patronsError,
  };
}

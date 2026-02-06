'use client';

import { useState, useMemo } from 'react';
import { type GraphNode, type GraphEdge, type MemberRelation } from './use-relation-graph';

/**
 * Interface pour les filtres du graphe
 */
export interface GraphFilters {
  relationTypes: Set<MemberRelation['relationType'] | 'patron_referral'>;
  memberStatus: 'all' | 'active' | 'inactive';
  minEngagementScore: number;
  searchQuery: string;
  viewMode: 'network' | 'ego-network';
  egoNetworkCenter?: string;
  showPatrons: boolean; // Afficher/masquer les mécènes
  // Filtres entreprise/rôle
  companies: Set<string>; // Liste des entreprises sélectionnées (vide = toutes)
  roles: Set<string>; // Liste des rôles professionnels sélectionnés (vide = tous)
  cjdRoles: Set<string>; // Liste des rôles CJD sélectionnés (vide = tous)
  // Filtres localisation/secteur
  departments: Set<string>; // Liste des départements sélectionnés (vide = tous)
  cities: Set<string>; // Liste des villes sélectionnées (vide = toutes)
  postalCodes: Set<string>; // Liste des codes postaux sélectionnés (vide = tous)
  sectors: Set<string>; // Liste des secteurs sélectionnés (vide = tous)
}

// Export du type MemberRelation pour réutilisation
export type { MemberRelation } from './use-relation-graph';

/**
 * Hook pour gérer l'état des filtres et filtrer les nœuds/arêtes
 */
export function useGraphFilters(allNodes: GraphNode[], allEdges: GraphEdge[]) {
  const [filters, setFilters] = useState<GraphFilters>({
    relationTypes: new Set<MemberRelation['relationType'] | 'patron_referral'>(['sponsor', 'team', 'custom', 'patron_referral']),
    memberStatus: 'all',
    minEngagementScore: 0,
    searchQuery: '',
    viewMode: 'network',
    showPatrons: true, // Afficher les mécènes par défaut
    companies: new Set<string>(),
    roles: new Set<string>(),
    cjdRoles: new Set<string>(),
    departments: new Set<string>(),
    cities: new Set<string>(),
    postalCodes: new Set<string>(),
    sectors: new Set<string>(),
  });

  // Extraire les listes uniques de companies, roles, cjdRoles et localisation/secteur
  const availableOptions = useMemo(() => {
    const companies = new Set<string>();
    const roles = new Set<string>();
    const cjdRoles = new Set<string>();
    const departments = new Set<string>();
    const cities = new Set<string>();
    const postalCodes = new Set<string>();
    const sectors = new Set<string>();

    allNodes.forEach(node => {
      if (node.data.nodeType === 'member' && node.data.member) {
        if (node.data.member.company) companies.add(node.data.member.company);
        if (node.data.member.role) roles.add(node.data.member.role);
        if (node.data.member.cjdRole) cjdRoles.add(node.data.member.cjdRole);
        if (node.data.member.department) departments.add(node.data.member.department);
        if (node.data.member.city) cities.add(node.data.member.city);
        if (node.data.member.postalCode) postalCodes.add(node.data.member.postalCode);
        if (node.data.member.sector) sectors.add(node.data.member.sector);
      } else if (node.data.nodeType === 'patron' && node.data.patron) {
        if (node.data.patron.company) companies.add(node.data.patron.company);
        if (node.data.patron.role) roles.add(node.data.patron.role);
        if (node.data.patron.department) departments.add(node.data.patron.department);
        if (node.data.patron.city) cities.add(node.data.patron.city);
        if (node.data.patron.postalCode) postalCodes.add(node.data.patron.postalCode);
        if (node.data.patron.sector) sectors.add(node.data.patron.sector);
      }
    });

    return {
      companies: Array.from(companies).sort(),
      roles: Array.from(roles).sort(),
      cjdRoles: Array.from(cjdRoles).sort(),
      departments: Array.from(departments).sort(),
      cities: Array.from(cities).sort(),
      postalCodes: Array.from(postalCodes).sort(),
      sectors: Array.from(sectors).sort(),
    };
  }, [allNodes]);

  // Filtrer les nœuds et arêtes selon les critères
  const { nodes, edges } = useMemo(() => {
    let filteredNodes = allNodes;
    let filteredEdges = allEdges;

    // Filtre 0: Afficher/masquer les mécènes
    if (!filters.showPatrons) {
      filteredNodes = filteredNodes.filter(node => node.data.nodeType !== 'patron');
    }

    // Filtre 1: Statut des membres (ne s'applique qu'aux membres, pas aux mécènes)
    if (filters.memberStatus !== 'all') {
      filteredNodes = filteredNodes.filter(node => {
        if (node.data.nodeType === 'patron') return true; // Garder les mécènes
        return node.data.member?.status === filters.memberStatus;
      });
    }

    // Filtre 2: Score d'engagement minimum (ne s'applique qu'aux membres)
    if (filters.minEngagementScore > 0) {
      filteredNodes = filteredNodes.filter(node => {
        if (node.data.nodeType === 'patron') return true; // Garder les mécènes
        return (node.data.member?.engagementScore ?? 0) >= filters.minEngagementScore;
      });
    }

    // Filtre 3: Recherche par nom/email (s'applique aux membres ET mécènes)
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(node => {
        if (node.data.nodeType === 'member' && node.data.member) {
          const fullName = `${node.data.member.firstName} ${node.data.member.lastName}`.toLowerCase();
          const email = node.data.member.email.toLowerCase();
          return fullName.includes(query) || email.includes(query);
        } else if (node.data.nodeType === 'patron' && node.data.patron) {
          const fullName = `${node.data.patron.firstName} ${node.data.patron.lastName}`.toLowerCase();
          const email = node.data.patron.email.toLowerCase();
          return fullName.includes(query) || email.includes(query);
        }
        return false;
      });
    }

    // Filtre 4: Entreprises sélectionnées
    if (filters.companies.size > 0) {
      filteredNodes = filteredNodes.filter(node => {
        const company = node.data.nodeType === 'member'
          ? node.data.member?.company
          : node.data.patron?.company;
        return company && filters.companies.has(company);
      });
    }

    // Filtre 5: Rôles professionnels sélectionnés
    if (filters.roles.size > 0) {
      filteredNodes = filteredNodes.filter(node => {
        const role = node.data.nodeType === 'member'
          ? node.data.member?.role
          : node.data.patron?.role;
        return role && filters.roles.has(role);
      });
    }

    // Filtre 6: Rôles CJD sélectionnés (membres uniquement)
    if (filters.cjdRoles.size > 0) {
      filteredNodes = filteredNodes.filter(node => {
        if (node.data.nodeType === 'patron') return true; // Les mécènes ne sont pas filtrés par rôle CJD
        return node.data.member?.cjdRole && filters.cjdRoles.has(node.data.member.cjdRole);
      });
    }

    // Filtre 7: Départements sélectionnés
    if (filters.departments.size > 0) {
      filteredNodes = filteredNodes.filter(node => {
        const department = node.data.nodeType === 'member'
          ? node.data.member?.department
          : node.data.patron?.department;
        return department && filters.departments.has(department);
      });
    }

    // Filtre 8: Villes sélectionnées
    if (filters.cities.size > 0) {
      filteredNodes = filteredNodes.filter(node => {
        const city = node.data.nodeType === 'member'
          ? node.data.member?.city
          : node.data.patron?.city;
        return city && filters.cities.has(city);
      });
    }

    // Filtre 9: Codes postaux sélectionnés
    if (filters.postalCodes.size > 0) {
      filteredNodes = filteredNodes.filter(node => {
        const postalCode = node.data.nodeType === 'member'
          ? node.data.member?.postalCode
          : node.data.patron?.postalCode;
        return postalCode && filters.postalCodes.has(postalCode);
      });
    }

    // Filtre 10: Secteurs sélectionnés
    if (filters.sectors.size > 0) {
      filteredNodes = filteredNodes.filter(node => {
        const sector = node.data.nodeType === 'member'
          ? node.data.member?.sector
          : node.data.patron?.sector;
        return sector && filters.sectors.has(sector);
      });
    }

    // Filtre 11: Mode Ego Network
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
    type: MemberRelation['relationType'] | 'patron_referral',
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

  const togglePatrons = (show: boolean) => {
    setFilters(prev => ({ ...prev, showPatrons: show }));
  };

  const updateCompanyFilter = (company: string, enabled: boolean) => {
    setFilters(prev => {
      const newCompanies = new Set(prev.companies);
      if (enabled) {
        newCompanies.add(company);
      } else {
        newCompanies.delete(company);
      }
      return { ...prev, companies: newCompanies };
    });
  };

  const updateRoleFilter = (role: string, enabled: boolean) => {
    setFilters(prev => {
      const newRoles = new Set(prev.roles);
      if (enabled) {
        newRoles.add(role);
      } else {
        newRoles.delete(role);
      }
      return { ...prev, roles: newRoles };
    });
  };

  const updateCjdRoleFilter = (cjdRole: string, enabled: boolean) => {
    setFilters(prev => {
      const newCjdRoles = new Set(prev.cjdRoles);
      if (enabled) {
        newCjdRoles.add(cjdRole);
      } else {
        newCjdRoles.delete(cjdRole);
      }
      return { ...prev, cjdRoles: newCjdRoles };
    });
  };

  const updateDepartmentFilter = (department: string, enabled: boolean) => {
    setFilters(prev => {
      const newDepartments = new Set(prev.departments);
      if (enabled) {
        newDepartments.add(department);
      } else {
        newDepartments.delete(department);
      }
      return { ...prev, departments: newDepartments };
    });
  };

  const updateCityFilter = (city: string, enabled: boolean) => {
    setFilters(prev => {
      const newCities = new Set(prev.cities);
      if (enabled) {
        newCities.add(city);
      } else {
        newCities.delete(city);
      }
      return { ...prev, cities: newCities };
    });
  };

  const updatePostalCodeFilter = (postalCode: string, enabled: boolean) => {
    setFilters(prev => {
      const newPostalCodes = new Set(prev.postalCodes);
      if (enabled) {
        newPostalCodes.add(postalCode);
      } else {
        newPostalCodes.delete(postalCode);
      }
      return { ...prev, postalCodes: newPostalCodes };
    });
  };

  const updateSectorFilter = (sector: string, enabled: boolean) => {
    setFilters(prev => {
      const newSectors = new Set(prev.sectors);
      if (enabled) {
        newSectors.add(sector);
      } else {
        newSectors.delete(sector);
      }
      return { ...prev, sectors: newSectors };
    });
  };

  const resetAllFilters = () => {
    setFilters({
      relationTypes: new Set<MemberRelation['relationType'] | 'patron_referral'>(['sponsor', 'team', 'custom', 'patron_referral']),
      memberStatus: 'all',
      minEngagementScore: 0,
      searchQuery: '',
      viewMode: 'network',
      showPatrons: true,
      companies: new Set<string>(),
      roles: new Set<string>(),
      cjdRoles: new Set<string>(),
      departments: new Set<string>(),
      cities: new Set<string>(),
      postalCodes: new Set<string>(),
      sectors: new Set<string>(),
    });
  };

  return {
    filters,
    nodes,
    edges,
    availableOptions,
    updateRelationTypeFilter,
    updateMemberStatusFilter,
    updateSearchQuery,
    updateMinEngagementScore,
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
  };
}

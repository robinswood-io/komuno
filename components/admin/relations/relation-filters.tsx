'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { type MemberRelation } from '@/hooks/use-relation-graph';
import { type GraphFilters } from '@/hooks/use-graph-filters';

interface RelationFiltersProps {
  filters: GraphFilters;
  onRelationTypeChange: (type: MemberRelation['relationType'], enabled: boolean) => void;
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

const RELATION_TYPES = [
  { value: 'sponsor' as const, label: 'Parrain/marraine', icon: '👤' },
  { value: 'team' as const, label: 'Équipe/collègue', icon: '🤝' },
  { value: 'custom' as const, label: 'Personnalisé', icon: '💼' },
];

/**
 * Panneau de filtres pour le graphe de relations
 */
export function RelationFilters({
  filters,
  onRelationTypeChange,
  onStatusChange,
  onSearchChange,
  onReset,
}: RelationFiltersProps) {
  return (
    <div className="space-y-6 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtres</h3>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
      </div>

      {/* Recherche */}
      <div className="space-y-2">
        <Label htmlFor="search">Rechercher un membre</Label>
        <Input
          id="search"
          placeholder="Nom, email..."
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Types de relation */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Types de relation</Label>
        <div className="space-y-2">
          {RELATION_TYPES.map((type) => (
            <div key={type.value} className="flex items-center gap-2">
              <Checkbox
                id={`rel-${type.value}`}
                checked={filters.relationTypes.has(type.value)}
                onCheckedChange={(checked) =>
                  onRelationTypeChange(type.value, checked === true)
                }
              />
              <label
                htmlFor={`rel-${type.value}`}
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Statut membre */}
      <div className="space-y-3">
        <Label htmlFor="status">Statut membre</Label>
        <Select
          value={filters.memberStatus}
          onValueChange={(value: 'all' | 'active' | 'inactive') => onStatusChange(value)}
        >
          <SelectTrigger id="status" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mode de vue */}
      {filters.viewMode === 'ego-network' && filters.egoNetworkCenter && (
        <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
          <p className="text-sm font-medium text-primary">Mode Ego Network</p>
          <p className="text-xs text-muted-foreground mt-1">
            Centré sur: {filters.egoNetworkCenter}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { type MemberRelation } from '@/hooks/use-relation-graph';
import { type GraphFilters } from '@/hooks/use-graph-filters';

interface RelationFiltersProps {
  filters: GraphFilters;
  availableOptions: {
    companies: string[];
    roles: string[];
    cjdRoles: string[];
    departments: string[];
    cities: string[];
    postalCodes: string[];
    sectors: string[];
  };
  onRelationTypeChange: (type: MemberRelation['relationType'] | 'patron_referral', enabled: boolean) => void;
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void;
  onSearchChange: (query: string) => void;
  onTogglePatrons: (show: boolean) => void;
  onCompanyChange: (company: string, enabled: boolean) => void;
  onRoleChange: (role: string, enabled: boolean) => void;
  onCjdRoleChange: (cjdRole: string, enabled: boolean) => void;
  onDepartmentChange: (department: string, enabled: boolean) => void;
  onCityChange: (city: string, enabled: boolean) => void;
  onPostalCodeChange: (postalCode: string, enabled: boolean) => void;
  onSectorChange: (sector: string, enabled: boolean) => void;
  onReset: () => void;
}

const RELATION_TYPES = [
  { value: 'sponsor' as const, label: 'Parrain/marraine', icon: '👤' },
  { value: 'team' as const, label: 'Équipe/collègue', icon: '🤝' },
  { value: 'custom' as const, label: 'Personnalisé', icon: '💼' },
  { value: 'patron_referral' as const, label: 'Prescripteur (mécène)', icon: '🏆' },
];

/**
 * Panneau de filtres pour le graphe de relations
 */
export function RelationFilters({
  filters,
  availableOptions,
  onRelationTypeChange,
  onStatusChange,
  onSearchChange,
  onTogglePatrons,
  onCompanyChange,
  onRoleChange,
  onCjdRoleChange,
  onDepartmentChange,
  onCityChange,
  onPostalCodeChange,
  onSectorChange,
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
        <Label htmlFor="search">Rechercher</Label>
        <Input
          id="search"
          placeholder="Nom, email..."
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Afficher les mécènes */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
        <Checkbox
          id="show-patrons"
          checked={filters.showPatrons}
          onCheckedChange={(checked) => onTogglePatrons(checked === true)}
        />
        <label
          htmlFor="show-patrons"
          className="text-sm font-medium cursor-pointer flex items-center gap-2"
        >
          <span>🏆</span>
          <span>Afficher les mécènes</span>
        </label>
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

      {/* Filtres entreprise */}
      {availableOptions.companies.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
              <span>Entreprises {filters.companies.size > 0 && `(${filters.companies.size})`}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {availableOptions.companies.map((company) => (
              <div key={company} className="flex items-center gap-2">
                <Checkbox
                  id={`company-${company}`}
                  checked={filters.companies.has(company)}
                  onCheckedChange={(checked) => onCompanyChange(company, checked === true)}
                />
                <label
                  htmlFor={`company-${company}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {company}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filtres rôle professionnel */}
      {availableOptions.roles.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
              <span>Rôles professionnels {filters.roles.size > 0 && `(${filters.roles.size})`}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {availableOptions.roles.map((role) => (
              <div key={role} className="flex items-center gap-2">
                <Checkbox
                  id={`role-${role}`}
                  checked={filters.roles.has(role)}
                  onCheckedChange={(checked) => onRoleChange(role, checked === true)}
                />
                <label
                  htmlFor={`role-${role}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {role}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filtres rôle CJD */}
      {availableOptions.cjdRoles.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
              <span>Rôles CJD {filters.cjdRoles.size > 0 && `(${filters.cjdRoles.size})`}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {availableOptions.cjdRoles.map((cjdRole) => (
              <div key={cjdRole} className="flex items-center gap-2">
                <Checkbox
                  id={`cjd-role-${cjdRole}`}
                  checked={filters.cjdRoles.has(cjdRole)}
                  onCheckedChange={(checked) => onCjdRoleChange(cjdRole, checked === true)}
                />
                <label
                  htmlFor={`cjd-role-${cjdRole}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {cjdRole}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filtres département */}
      {availableOptions.departments.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
              <span>Départements {filters.departments.size > 0 && `(${filters.departments.size})`}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {availableOptions.departments.map((department) => (
              <div key={department} className="flex items-center gap-2">
                <Checkbox
                  id={`department-${department}`}
                  checked={filters.departments.has(department)}
                  onCheckedChange={(checked) => onDepartmentChange(department, checked === true)}
                />
                <label
                  htmlFor={`department-${department}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {department}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filtres ville */}
      {availableOptions.cities.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
              <span>Villes {filters.cities.size > 0 && `(${filters.cities.size})`}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {availableOptions.cities.map((city) => (
              <div key={city} className="flex items-center gap-2">
                <Checkbox
                  id={`city-${city}`}
                  checked={filters.cities.has(city)}
                  onCheckedChange={(checked) => onCityChange(city, checked === true)}
                />
                <label
                  htmlFor={`city-${city}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {city}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filtres code postal */}
      {availableOptions.postalCodes.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
              <span>Codes postaux {filters.postalCodes.size > 0 && `(${filters.postalCodes.size})`}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {availableOptions.postalCodes.map((postalCode) => (
              <div key={postalCode} className="flex items-center gap-2">
                <Checkbox
                  id={`postal-code-${postalCode}`}
                  checked={filters.postalCodes.has(postalCode)}
                  onCheckedChange={(checked) => onPostalCodeChange(postalCode, checked === true)}
                />
                <label
                  htmlFor={`postal-code-${postalCode}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {postalCode}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filtres secteur */}
      {availableOptions.sectors.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
              <span>Secteurs {filters.sectors.size > 0 && `(${filters.sectors.size})`}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {availableOptions.sectors.map((sector) => (
              <div key={sector} className="flex items-center gap-2">
                <Checkbox
                  id={`sector-${sector}`}
                  checked={filters.sectors.has(sector)}
                  onCheckedChange={(checked) => onSectorChange(sector, checked === true)}
                />
                <label
                  htmlFor={`sector-${sector}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {sector}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

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

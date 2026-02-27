'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Network, Plus, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SearchEntity {
  email: string;
  firstName: string;
  lastName: string;
  company?: string | null;
}

export interface PendingConnection {
  email: string;
  type: 'member' | 'patron';
  firstName: string;
  lastName: string;
  company?: string | null;
}

interface LiveConnection {
  id: string;
  connectedEmail: string;
  connectedType: 'member' | 'patron';
  firstName: string;
  lastName: string;
  company?: string | null;
  createdAt: string;
}

interface ControlledProps {
  mode: 'controlled';
  ownerType: 'member' | 'patron';
  value: PendingConnection[];
  onChange: (connections: PendingConnection[]) => void;
}

interface LiveProps {
  mode: 'live';
  ownerEmail: string;
  ownerType: 'member' | 'patron';
}

export type NetworkSectionProps = ControlledProps | LiveProps;

function extractItems<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.items)) return d.items as T[];
  if (Array.isArray(d.data)) return d.data as T[];
  return [];
}

export function NetworkSection(props: NetworkSectionProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['network-search-members'],
    queryFn: () => api.get<unknown>('/api/admin/members?limit=500'),
    staleTime: 60_000,
  });
  const patronsQuery = useQuery({
    queryKey: ['network-search-patrons'],
    queryFn: () => api.get<unknown>('/api/patrons?limit=1000'),
    staleTime: 60_000,
  });

  const members = extractItems<SearchEntity>(membersQuery.data as unknown).map(
    (m) => ({ ...m, type: 'member' as const }),
  );
  const patrons = extractItems<SearchEntity>(patronsQuery.data as unknown).map(
    (p) => ({ ...p, type: 'patron' as const }),
  );
  const entitiesLoading = membersQuery.isLoading || patronsQuery.isLoading;

  const ownerEmail = props.mode === 'live' ? props.ownerEmail : '';

  const connectionsQuery = useQuery<LiveConnection[]>({
    queryKey: ['network-connections', ownerEmail],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: LiveConnection[] }>(
        `/api/network?email=${encodeURIComponent(ownerEmail)}`,
      );
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: props.mode === 'live' && !!ownerEmail,
    initialData: [] as LiveConnection[],
  });

  const addConnectionMutation = useMutation({
    mutationFn: (entity: SearchEntity & { type: 'member' | 'patron' }) => {
      if (props.mode !== 'live') throw new Error('Not in live mode');
      return api.post('/api/network', {
        ownerEmail: props.ownerEmail,
        ownerType: props.ownerType,
        connectedEmail: entity.email,
        connectedType: entity.type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-connections', ownerEmail] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const removeConnectionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/network/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-connections', ownerEmail] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const liveConnections: LiveConnection[] =
    props.mode === 'live' ? (connectionsQuery.data ?? []) : [];
  const controlledConnections: PendingConnection[] =
    props.mode === 'controlled' ? props.value : [];

  const usedEmails = new Set<string>(
    props.mode === 'live'
      ? [props.ownerEmail, ...liveConnections.map((c) => c.connectedEmail)]
      : controlledConnections.map((c) => c.email),
  );

  const availableMembers = members.filter((e) => !usedEmails.has(e.email));
  const availablePatrons = patrons.filter((e) => !usedEmails.has(e.email));

  const handleSelect = (entity: SearchEntity & { type: 'member' | 'patron' }) => {
    setOpen(false);
    if (props.mode === 'controlled') {
      props.onChange([
        ...props.value,
        {
          email: entity.email,
          type: entity.type,
          firstName: entity.firstName,
          lastName: entity.lastName,
          company: entity.company,
        },
      ]);
    } else {
      addConnectionMutation.mutate(entity);
    }
  };

  const isEmpty =
    props.mode === 'live'
      ? liveConnections.length === 0 && !connectionsQuery.isLoading
      : controlledConnections.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Network className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-gray-700">Réseau</span>
      </div>

      {/* Connection badges */}
      <div className="flex flex-wrap gap-2 min-h-[1.5rem]">
        {props.mode === 'live' && connectionsQuery.isLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}

        {props.mode === 'live' &&
          liveConnections.map((conn) => (
            <Badge key={conn.id} variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  conn.connectedType === 'member' ? 'bg-blue-500' : 'bg-emerald-500',
                )}
              />
              <span className="text-xs">
                {conn.firstName} {conn.lastName}
              </span>
              {conn.company && (
                <span className="text-xs text-muted-foreground ml-1">· {conn.company}</span>
              )}
              <button
                type="button"
                onClick={() => removeConnectionMutation.mutate(conn.id)}
                disabled={removeConnectionMutation.isPending}
                className="ml-1 rounded hover:bg-destructive/20 p-0.5 transition-colors"
                aria-label="Supprimer"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

        {props.mode === 'controlled' &&
          controlledConnections.map((conn) => (
            <Badge
              key={conn.email}
              variant="secondary"
              className="flex items-center gap-1 pl-2 pr-1"
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  conn.type === 'member' ? 'bg-blue-500' : 'bg-emerald-500',
                )}
              />
              <span className="text-xs">
                {conn.firstName} {conn.lastName}
              </span>
              {conn.company && (
                <span className="text-xs text-muted-foreground ml-1">· {conn.company}</span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (props.mode === 'controlled') {
                    props.onChange(props.value.filter((c) => c.email !== conn.email));
                  }
                }}
                className="ml-1 rounded hover:bg-destructive/20 p-0.5 transition-colors"
                aria-label="Supprimer"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

        {isEmpty && (
          <span className="text-xs text-muted-foreground italic">Aucune connexion</span>
        )}
      </div>

      {/* Add combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={addConnectionMutation.isPending}
          >
            {addConnectionMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Ajouter une connaissance
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher..." />
            <CommandList className="max-h-60">
              {entitiesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : availableMembers.length === 0 && availablePatrons.length === 0 ? (
                <CommandEmpty>Aucun résultat.</CommandEmpty>
              ) : (
                <>
                  {availableMembers.length > 0 && (
                    <CommandGroup heading="Membres">
                      {availableMembers.map((e) => (
                        <CommandItem
                          key={`m-${e.email}`}
                          value={`${e.firstName} ${e.lastName} ${e.email}`}
                          onSelect={() => handleSelect(e)}
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm">
                              {e.firstName} {e.lastName}
                            </div>
                            {e.company && (
                              <div className="text-xs text-muted-foreground">{e.company}</div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {availablePatrons.length > 0 && (
                    <CommandGroup heading="Mécènes">
                      {availablePatrons.map((e) => (
                        <CommandItem
                          key={`p-${e.email}`}
                          value={`${e.firstName} ${e.lastName} ${e.email}`}
                          onSelect={() => handleSelect(e)}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm">
                              {e.firstName} {e.lastName}
                            </div>
                            {e.company && (
                              <div className="text-xs text-muted-foreground">{e.company}</div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {availableMembers.length === 0 && availablePatrons.length === 0 && (
                    <CommandEmpty>Aucun résultat.</CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Membre
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Mécène
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useFeatureConfig } from '@/contexts/FeatureConfigContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  UserSearch,
  Phone,
  Building2,
  Calendar,
  Mail,
  ExternalLink,
  Loader2,
  TrendingUp,
  UserX,
  RefreshCw,
  UserPlus,
  List,
  LayoutGrid,
  UserCheck,
} from 'lucide-react';
import { AddMemberDialog } from '../members/add-member-dialog';

type ProspectionStage = 'Qualification' | 'R1' | 'R2' | 'Contractualisation' | 'Hors cible' | 'En réflexion' | 'Refusé' | 'Signé';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  role?: string;
  city?: string;
  department?: string;
  notes?: string;
  status: string;
  prospectionStatus?: ProspectionStage | null;
  firstContactDate?: string | null;
  appointmentDate?: string | null;
  soncasProfile?: string | null;
  assignedTo?: string | null;
}

interface Administrator {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

// Colonnes actives du pipeline (dans l'ordre)
const ACTIVE_STAGES = [
  {
    value: 'Qualification' as ProspectionStage,
    label: 'Qualification',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    headerClass: 'bg-gradient-to-r from-slate-600 to-slate-700',
    accent: 'border-l-slate-400',
    avatarBg: 'bg-slate-100 text-slate-600',
    icon: UserSearch,
  },
  {
    value: 'R1' as ProspectionStage,
    label: 'R1 — Premier RDV',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    headerClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
    accent: 'border-l-blue-400',
    avatarBg: 'bg-blue-100 text-blue-600',
    icon: Calendar,
  },
  {
    value: 'R2' as ProspectionStage,
    label: 'R2 — Second RDV',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    headerClass: 'bg-gradient-to-r from-amber-500 to-orange-500',
    accent: 'border-l-amber-400',
    avatarBg: 'bg-amber-100 text-amber-700',
    icon: RefreshCw,
  },
  {
    value: 'En réflexion' as ProspectionStage,
    label: 'En réflexion',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    headerClass: 'bg-gradient-to-r from-indigo-500 to-violet-500',
    accent: 'border-l-indigo-400',
    avatarBg: 'bg-indigo-100 text-indigo-700',
    icon: TrendingUp,
  },
  {
    value: 'Contractualisation' as ProspectionStage,
    label: 'Contractualisation',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    headerClass: 'bg-gradient-to-r from-emerald-500 to-green-600',
    accent: 'border-l-emerald-400',
    avatarBg: 'bg-emerald-100 text-emerald-600',
    icon: UserCheck,
  },
];

// Statuts archivés
const ARCHIVED_STAGES: ProspectionStage[] = ['Hors cible', 'Refusé', 'Signé'];

// Tous les statuts pour les selects
const ALL_STAGES = [
  ...ACTIVE_STAGES.map(s => s.value),
  ...ARCHIVED_STAGES,
] as ProspectionStage[];

export function getStageConfig(status: string | null | undefined) {
  return ACTIVE_STAGES.find(s => s.value === status) ?? null;
}

export function getStageColor(status: string | null | undefined): string {
  const config = getStageConfig(status);
  if (config) return config.color;
  if (status && ARCHIVED_STAGES.includes(status as ProspectionStage)) {
    return 'bg-gray-100 text-gray-600 border-gray-300';
  }
  return 'bg-gray-100 text-gray-500 border-gray-200';
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProspectsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isFeatureEnabled } = useFeatureConfig();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [draggingEmail, setDraggingEmail] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Query admins pour le filtre responsable
  const { data: adminsData } = useQuery({
    queryKey: ['administrators'],
    queryFn: () => api.get<{ success: boolean; data: Administrator[] }>('/api/admin/administrators'),
    staleTime: 5 * 60 * 1000,
  });
  const admins: Administrator[] = adminsData?.data ?? [];

  // Charge uniquement les prospects (prospectionStatus != null) côté serveur
  const { data, isLoading } = useQuery({
    queryKey: ['prospects', { search, departmentFilter, assignedToFilter }],
    queryFn: () =>
      api.get<PaginatedResponse<Member>>('/api/admin/members', {
        limit: 500,
        onlyProspects: true,
        search: search || undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        assignedTo: assignedToFilter !== 'all' ? assignedToFilter : undefined,
      }),
  });

  const allMembers: Member[] = data?.data ?? [];

  // Filtrer par étape si sélectionnée (tous les enregistrements sont déjà des prospects)
  const prospects = statusFilter === 'all'
    ? allMembers
    : allMembers.filter(m => m.prospectionStatus === statusFilter);

  // Comptages par stage (calculé une seule fois, pas à chaque rendu)
  const stageCounts = useMemo(() => {
    const counts: Partial<Record<ProspectionStage, number>> = {};
    for (const m of allMembers) {
      if (m.prospectionStatus) {
        const s = m.prospectionStatus as ProspectionStage;
        counts[s] = (counts[s] ?? 0) + 1;
      }
    }
    return counts;
  }, [allMembers]);

  const countByStage = (stage: ProspectionStage) => stageCounts[stage] ?? 0;

  const conversionRate = (from: ProspectionStage, to: ProspectionStage): number => {
    const fromCount = countByStage(from);
    if (fromCount === 0) return 0;
    return Math.round((countByStage(to) / fromCount) * 100);
  };

  // Mutation pour mettre à jour le statut de prospection
  const updateStatusMutation = useMutation({
    mutationFn: ({ email, prospectionStatus }: { email: string; prospectionStatus: string }) =>
      api.patch(`/api/admin/members/${encodeURIComponent(email)}`, { prospectionStatus }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      if (variables.prospectionStatus === 'Signé') {
        toast({ title: '🎉 Prospect converti en membre !', description: 'Il apparaît désormais dans la liste des membres.' });
      } else {
        toast({ title: 'Phase mise à jour' });
      }
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour la phase', variant: 'destructive' });
    },
  });

  if (!isFeatureEnabled('crm')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <UserSearch className="h-12 w-12 text-muted-foreground opacity-40" />
        <p className="text-lg font-medium text-muted-foreground">Module CRM désactivé</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Le module CRM n'est pas activé sur cet espace. Activez-le dans les Paramètres → Modules.
        </p>
        <Button variant="outline" onClick={() => router.push('/admin/settings?tab=modules')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Paramètres modules
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UserSearch className="h-8 w-8 text-primary" />
            Pipeline CRM
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi des prospects et du pipeline de recrutement
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Toggle vue */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              title="Vue tableau"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              title="Vue kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setAddContactOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter un prospect
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/members')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Gérer les membres
          </Button>
        </div>
      </div>

      <AddMemberDialog
        open={addContactOpen}
        onOpenChange={(open) => {
          setAddContactOpen(open);
          if (!open) queryClient.invalidateQueries({ queryKey: ['prospects'] });
        }}
        defaultStatus="Qualification"
      />

      {/* Résumé par phase active */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ACTIVE_STAGES.map((stage, idx) => {
          const count = countByStage(stage.value);
          const nextStage = ACTIVE_STAGES[idx + 1];
          const rate = nextStage ? conversionRate(stage.value, nextStage.value) : null;
          const isActive = statusFilter === stage.value;
          return (
            <button
              key={stage.value}
              onClick={() => setStatusFilter(isActive ? 'all' : stage.value)}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-md shadow-sm bg-white ${
                isActive ? 'ring-2 ring-primary ring-offset-2 border-primary/30' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stage.avatarBg}`}>
                  <stage.icon className="h-4 w-4" />
                </div>
                <span className="text-3xl font-bold text-foreground">{count}</span>
              </div>
              <p className="font-semibold text-sm text-foreground truncate">{stage.label.split(' — ')[0]}</p>
              {rate !== null && (
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">→ {nextStage?.label.split(' — ')[0]} : <span className="font-semibold">{rate}%</span></p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un prospect..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toutes les phases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les phases</SelectItem>
                {ALL_STAGES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Département" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les depts</SelectItem>
                <SelectItem value="Somme">Somme (80)</SelectItem>
                <SelectItem value="Aisne">Aisne (02)</SelectItem>
                <SelectItem value="Oise">Oise (60)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les responsables</SelectItem>
                {admins.map(admin => (
                  <SelectItem key={admin.email} value={admin.email}>
                    {admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : admin.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== 'all' || departmentFilter !== 'all' || assignedToFilter !== 'all') && (
              <Button variant="outline" size="sm" onClick={() => { setStatusFilter('all'); setDepartmentFilter('all'); setAssignedToFilter('all'); }}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vue Kanban */}
      {viewMode === 'kanban' && (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {/* 4 colonnes actives */}
              {ACTIVE_STAGES.map((column, idx) => {
                const columnProspects = allMembers.filter(m => m.prospectionStatus === column.value);
                const nextStage = ACTIVE_STAGES[idx + 1];
                const rate = nextStage ? conversionRate(column.value, nextStage.value) : null;
                return (
                  <div
                    key={column.value}
                    className={`flex-shrink-0 w-72 rounded-xl overflow-hidden border shadow-sm bg-white transition-all ${
                      dragOverColumn === column.value
                        ? 'border-primary ring-2 ring-primary/30 shadow-md'
                        : 'border-gray-200'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverColumn(column.value);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverColumn(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      if (draggingEmail) {
                        const prospect = allMembers.find(m => m.email === draggingEmail);
                        if (prospect && prospect.prospectionStatus !== column.value) {
                          updateStatusMutation.mutate({ email: draggingEmail, prospectionStatus: column.value });
                        }
                        setDraggingEmail(null);
                      }
                    }}
                  >
                    {/* En-tête coloré */}
                    <div className={`${column.headerClass} px-4 py-3 text-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <column.icon className="h-4 w-4 opacity-90" />
                          <h3 className="font-semibold text-sm">{column.label.split(' — ')[0]}</h3>
                        </div>
                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {columnProspects.length}
                        </span>
                      </div>
                      {rate !== null && (
                        <p className="text-xs text-white/70 mt-0.5 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          → {nextStage?.label.split(' — ')[0]} : {rate}%
                        </p>
                      )}
                    </div>
                    {/* Cards */}
                    <div className="p-2 space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto bg-gray-50/60">
                      {columnProspects.map(prospect => (
                        <div
                          key={prospect.email}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggingEmail(prospect.email);
                          }}
                          onDragEnd={() => {
                            setDraggingEmail(null);
                            setDragOverColumn(null);
                          }}
                          className={`bg-white rounded-lg p-3 shadow-sm border border-l-[3px] ${column.accent} cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none ${
                            draggingEmail === prospect.email ? 'opacity-40 scale-95' : ''
                          }`}
                          onClick={() => {
                            if (draggingEmail === null) {
                              router.push(`/admin/members/${encodeURIComponent(prospect.email)}`);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${column.avatarBg}`}>
                              {prospect.firstName?.[0]?.toUpperCase()}{prospect.lastName?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{prospect.firstName} {prospect.lastName}</p>
                              {prospect.company && (
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3 flex-shrink-0" />
                                  {prospect.company}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {prospect.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {prospect.phone}
                              </span>
                            )}
                            {prospect.soncasProfile && (
                              <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-100">
                                {prospect.soncasProfile}
                              </span>
                            )}
                          </div>
                          {prospect.assignedTo && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                              <UserCheck className="h-3 w-3" />
                              {prospect.assignedTo.split('@')[0]}
                            </p>
                          )}
                          <Select
                            value={prospect.prospectionStatus ?? ''}
                            onValueChange={value => {
                              updateStatusMutation.mutate({ email: prospect.email, prospectionStatus: value });
                            }}
                          >
                            <SelectTrigger
                              className="h-6 text-xs mt-2"
                              onClick={e => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_STAGES.map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                      {columnProspects.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground/50">
                          <column.icon className="h-6 w-6 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">Aucun prospect</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Colonne Archivés */}
              {(() => {
                const archivedProspects = allMembers.filter(
                  m => m.prospectionStatus != null && ARCHIVED_STAGES.includes(m.prospectionStatus)
                );
                return (
                  <div className="flex-shrink-0 w-72 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                    <div className="bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-3 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserX className="h-4 w-4 opacity-90" />
                          <h3 className="font-semibold text-sm">Archivés</h3>
                        </div>
                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {archivedProspects.length}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto bg-gray-50/60">
                      {archivedProspects.map(prospect => (
                        <div
                          key={prospect.email}
                          className="bg-white rounded-lg p-3 shadow-sm border border-l-[3px] border-l-gray-300 cursor-pointer hover:shadow-md transition-all opacity-80 hover:opacity-100"
                          onClick={() => router.push(`/admin/members/${encodeURIComponent(prospect.email)}`)}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                              {prospect.firstName?.[0]?.toUpperCase()}{prospect.lastName?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{prospect.firstName} {prospect.lastName}</p>
                              {prospect.company && (
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3 flex-shrink-0" />
                                  {prospect.company}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">{prospect.prospectionStatus}</Badge>
                          </div>
                          <Select
                            value={prospect.prospectionStatus ?? ''}
                            onValueChange={value => {
                              updateStatusMutation.mutate({ email: prospect.email, prospectionStatus: value });
                            }}
                          >
                            <SelectTrigger
                              className="h-6 text-xs mt-2"
                              onClick={e => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_STAGES.map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                      {archivedProspects.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">Aucun prospect archivé</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Table des prospects */}
      {viewMode === 'table' && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {isLoading ? 'Chargement...' : `${prospects.length} prospect${prospects.length !== 1 ? 's' : ''}`}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                Filtré: {statusFilter}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucun prospect trouvé</p>
              <p className="text-sm mt-1">
                {statusFilter !== 'all'
                  ? 'Aucun prospect avec ce statut'
                  : 'Ajoutez des prospects depuis la page Membres'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>1er contact</TableHead>
                  <TableHead>RDV</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[140px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map(prospect => {
                  const stageColor = getStageColor(prospect.prospectionStatus);
                  return (
                    <TableRow key={prospect.email} className="group">
                      {/* Nom */}
                      <TableCell>
                        <button
                          onClick={() => router.push(`/admin/members/${encodeURIComponent(prospect.email)}`)}
                          className="text-left hover:underline"
                        >
                          <p className="font-medium">
                            {prospect.firstName} {prospect.lastName}
                          </p>
                          {prospect.city && (
                            <p className="text-xs text-muted-foreground">{prospect.city}</p>
                          )}
                        </button>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <a
                            href={`mailto:${prospect.email}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[160px]">{prospect.email}</span>
                          </a>
                          {prospect.phone && (
                            <a
                              href={`tel:${prospect.phone}`}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Phone className="h-3 w-3" />
                              {prospect.phone}
                            </a>
                          )}
                        </div>
                      </TableCell>

                      {/* Entreprise */}
                      <TableCell>
                        {prospect.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm">{prospect.company}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                        {prospect.role && (
                          <p className="text-xs text-muted-foreground mt-0.5">{prospect.role}</p>
                        )}
                      </TableCell>

                      {/* Statut prospection */}
                      <TableCell>
                        {prospect.prospectionStatus ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${stageColor}`}
                          >
                            {prospect.prospectionStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Dates */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(prospect.firstContactDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(prospect.appointmentDate)}
                        </span>
                      </TableCell>

                      {/* Notes */}
                      <TableCell>
                        {prospect.notes ? (
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
                            {prospect.notes}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Changer le statut rapidement */}
                      <TableCell>
                        <Select
                          value={prospect.prospectionStatus ?? ''}
                          onValueChange={value =>
                            updateStatusMutation.mutate({ email: prospect.email, prospectionStatus: value })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_STAGES.map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}

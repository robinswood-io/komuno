'use client';

import { useState } from 'react';
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
  Clock,
  UserX,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { AddMemberDialog } from '../members/add-member-dialog';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  role?: string;
  city?: string;
  notes?: string;
  status: string;
  prospectionStatus?: 'Refusé' | 'RDV prévu' | 'A contacter' | '2027' | 'Intérêt - à relancer' | null;
  firstContactDate?: string | null;
  appointmentDate?: string | null;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

const PROSPECTION_STATUSES = [
  { value: 'A contacter', label: 'À contacter', color: 'bg-slate-100 text-slate-700 border-slate-300', icon: Phone },
  { value: 'RDV prévu', label: 'RDV prévu', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Calendar },
  { value: 'Intérêt - à relancer', label: 'Intérêt — à relancer', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: RefreshCw },
  { value: '2027', label: '2027', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: Clock },
  { value: 'Refusé', label: 'Refusé', color: 'bg-red-100 text-red-700 border-red-300', icon: UserX },
];

function getStatusConfig(status: string | null | undefined) {
  return PROSPECTION_STATUSES.find(s => s.value === status) ?? null;
}

function formatDate(dateStr: string | null | undefined): string {
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
  const [addContactOpen, setAddContactOpen] = useState(false);

  // Charge tous les membres et filtre côté client les prospects
  const { data, isLoading } = useQuery({
    queryKey: ['prospects', { search }],
    queryFn: () =>
      api.get<PaginatedResponse<Member>>('/api/admin/members', {
        limit: 500,
        search: search || undefined,
      }),
  });

  const allMembers: Member[] = data?.data ?? [];

  // Filtrer : seuls ceux qui ont un prospectionStatus (pas null/undefined)
  const prospects = allMembers.filter(m =>
    m.prospectionStatus != null &&
    (statusFilter === 'all' || m.prospectionStatus === statusFilter)
  );

  // Comptages par statut pour les badges de résumé
  const countByStatus = PROSPECTION_STATUSES.map(s => ({
    ...s,
    count: allMembers.filter(m => m.prospectionStatus === s.value).length,
  }));

  // Mutation pour mettre à jour le statut de prospection
  const updateStatusMutation = useMutation({
    mutationFn: ({ email, prospectionStatus }: { email: string; prospectionStatus: string }) =>
      api.patch(`/api/admin/members/${email}`, { prospectionStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast({ title: 'Statut mis à jour' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut', variant: 'destructive' });
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
            CRM — Contacts
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi des prospects et du pipeline de recrutement
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddContactOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter un contact
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
        defaultStatus="A contacter"
      />

      {/* Résumé par statut */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {countByStatus.map(({ value, label, color, icon: Icon, count }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(statusFilter === value ? 'all' : value)}
            className={`rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${color} ${
              statusFilter === value ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4" />
              <span className="text-2xl font-bold">{count}</span>
            </div>
            <p className="text-xs font-medium leading-tight">{label}</p>
          </button>
        ))}
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
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {PROSPECTION_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table des prospects */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {isLoading ? 'Chargement...' : `${prospects.length} prospect${prospects.length !== 1 ? 's' : ''}`}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                Filtré: {getStatusConfig(statusFilter)?.label}
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
                  const statusConfig = getStatusConfig(prospect.prospectionStatus);
                  return (
                    <TableRow key={prospect.email} className="group">
                      {/* Nom */}
                      <TableCell>
                        <button
                          onClick={() => router.push(`/admin/members/${prospect.email}`)}
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
                        {statusConfig ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusConfig.color}`}
                          >
                            {statusConfig.label}
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
                            {PROSPECTION_STATUSES.map(s => (
                              <SelectItem key={s.value} value={s.value} className="text-xs">
                                {s.label}
                              </SelectItem>
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
    </div>
  );
}

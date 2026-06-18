'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { MemberSearchSelect } from '@/components/ui/member-search-select';
import { CalendarDays, Copy, Loader2, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';

const GROUP_TYPES = [
  { value: 'copil', label: 'COPIL' },
  { value: 'commission', label: 'Commission' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'working_group', label: 'Groupe de travail' },
  { value: 'other', label: 'Autre' },
];

const GROUP_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

interface MemberOption {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
}

interface GroupMembership {
  id: string;
  groupId: string;
  memberEmail: string;
  role?: string | null;
  mission?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
}

interface MemberGroup {
  id: string;
  name: string;
  type: string;
  year: number;
  description?: string | null;
  color: string;
  isActive: boolean;
  memberCount: number;
  memberships: GroupMembership[];
}

interface GroupFormData {
  name: string;
  type: string;
  year: number;
  description: string;
  color: string;
}

interface MembershipFormData {
  memberEmail: string;
  role: string;
  mission: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const currentYear = new Date().getFullYear();

function emptyGroupForm(year = currentYear): GroupFormData {
  return {
    name: '',
    type: 'commission',
    year,
    description: '',
    color: '#3b82f6',
  };
}

function emptyMembershipForm(): MembershipFormData {
  return {
    memberEmail: '',
    role: '',
    mission: '',
    startDate: '',
    endDate: '',
    notes: '',
  };
}

function typeLabel(type: string) {
  return GROUP_TYPES.find((item) => item.value === type)?.label ?? type;
}

export default function AdminMemberGroupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number>(currentYear);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupForm, setGroupForm] = useState<GroupFormData>(emptyGroupForm(year));
  const [membershipDialogGroup, setMembershipDialogGroup] = useState<MemberGroup | null>(null);
  const [editingMembership, setEditingMembership] = useState<GroupMembership | null>(null);
  const [membershipForm, setMembershipForm] = useState<MembershipFormData>(emptyMembershipForm());

  const groupParams = useMemo(() => ({
    year,
    ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  }), [year, typeFilter, search]);

  const { data: groupsResponse, isLoading: isLoadingGroups } = useQuery<{ success: boolean; data: MemberGroup[] }>({
    queryKey: queryKeys.members.groups.list(groupParams),
    queryFn: () => api.get('/api/admin/member-groups', groupParams),
  });

  const { data: membersResponse } = useQuery<PaginatedResponse<MemberOption>>({
    queryKey: queryKeys.members.list({ limit: 500, status: 'active', excludeProspects: true }),
    queryFn: () => api.get('/api/admin/members', { limit: 500, status: 'active', excludeProspects: true }),
  });

  const { data: summaryResponse } = useQuery<{ success: boolean; data: { members: Array<MemberOption & { groups: Array<{ id: string; name: string; type: string; year: number; color: string; role?: string | null; mission?: string | null }> }> } }>({
    queryKey: queryKeys.members.groups.summary({ year }),
    queryFn: () => api.get('/api/admin/member-groups/summary', { year }),
  });

  const groups = groupsResponse?.data ?? [];
  const members = membersResponse?.data ?? [];
  const memberSummaries = summaryResponse?.data.members ?? [];

  const invalidateGroups = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.groups.all });
  };

  const createGroupMutation = useMutation({
    mutationFn: (data: GroupFormData) => api.post('/api/admin/member-groups', data),
    onSuccess: () => {
      invalidateGroups();
      setIsGroupDialogOpen(false);
      setGroupForm(emptyGroupForm(year));
      toast({ title: 'Groupe créé', description: 'Le groupe annuel a été créé.' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const addMembershipMutation = useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: MembershipFormData }) =>
      api.post(`/api/admin/member-groups/${groupId}/members`, {
        ...data,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      }),
    onSuccess: () => {
      invalidateGroups();
      setMembershipDialogGroup(null);
      setMembershipForm(emptyMembershipForm());
      toast({ title: 'Membre ajouté', description: 'L’affectation a été enregistrée.' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const updateMembershipMutation = useMutation({
    mutationFn: ({ groupId, membershipId, data }: { groupId: string; membershipId: string; data: MembershipFormData }) =>
      api.patch(`/api/admin/member-groups/${groupId}/members/${membershipId}`, {
        role: data.role,
        mission: data.mission,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        notes: data.notes,
      }),
    onSuccess: () => {
      invalidateGroups();
      setEditingMembership(null);
      setMembershipDialogGroup(null);
      setMembershipForm(emptyMembershipForm());
      toast({ title: 'Affectation modifiée', description: 'Le rôle et la mission ont été mis à jour.' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const removeMembershipMutation = useMutation({
    mutationFn: ({ groupId, membershipId }: { groupId: string; membershipId: string }) =>
      api.delete(`/api/admin/member-groups/${groupId}/members/${membershipId}`),
    onSuccess: () => {
      invalidateGroups();
      toast({ title: 'Membre retiré', description: 'Le membre a été retiré du groupe.' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const duplicateGroupMutation = useMutation({
    mutationFn: ({ groupId, targetYear }: { groupId: string; targetYear: number }) =>
      api.post(`/api/admin/member-groups/${groupId}/duplicate`, { targetYear }),
    onSuccess: () => {
      invalidateGroups();
      toast({ title: 'Groupe dupliqué', description: 'Le groupe a été copié sur l’année suivante.' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.delete(`/api/admin/member-groups/${groupId}`),
    onSuccess: () => {
      invalidateGroups();
      toast({ title: 'Groupe supprimé', description: 'Le groupe et ses affectations ont été supprimés.' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const openAddMemberDialog = (group: MemberGroup) => {
    setEditingMembership(null);
    setMembershipDialogGroup(group);
    setMembershipForm(emptyMembershipForm());
  };

  const openEditMembershipDialog = (group: MemberGroup, membership: GroupMembership) => {
    setEditingMembership(membership);
    setMembershipDialogGroup(group);
    setMembershipForm({
      memberEmail: membership.memberEmail,
      role: membership.role ?? '',
      mission: membership.mission ?? '',
      startDate: membership.startDate ?? '',
      endDate: membership.endDate ?? '',
      notes: membership.notes ?? '',
    });
  };

  const saveMembership = () => {
    if (!membershipDialogGroup) return;
    if (!editingMembership && !membershipForm.memberEmail) {
      toast({ title: 'Membre requis', description: 'Veuillez sélectionner un membre.', variant: 'destructive' });
      return;
    }

    if (editingMembership) {
      updateMembershipMutation.mutate({
        groupId: membershipDialogGroup.id,
        membershipId: editingMembership.id,
        data: membershipForm,
      });
      return;
    }

    addMembershipMutation.mutate({ groupId: membershipDialogGroup.id, data: membershipForm });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Groupes membres
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les COPIL, commissions, bureaux et groupes de travail qui changent d’une année sur l’autre.
          </p>
        </div>
        <Button onClick={() => { setGroupForm(emptyGroupForm(year)); setIsGroupDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau groupe
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-[160px_220px_1fr]">
            <div className="space-y-2">
              <Label>Année</Label>
              <Input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {GROUP_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou description du groupe" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">Vue groupes</TabsTrigger>
          <TabsTrigger value="members">Vue par membre</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          {isLoadingGroups ? (
            <Card><CardContent className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></CardContent></Card>
          ) : groups.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun groupe pour ces critères.</CardContent></Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                          {group.name}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline">{typeLabel(group.type)}</Badge>
                          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{group.year}</span>
                          <span>{group.memberCount} membre{group.memberCount > 1 ? 's' : ''}</span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title="Dupliquer sur N+1" onClick={() => duplicateGroupMutation.mutate({ groupId: group.id, targetYear: group.year + 1 })}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Supprimer"
                          onClick={() => {
                            if (window.confirm(`Supprimer le groupe ${group.name} ${group.year} et toutes ses affectations ?`)) {
                              deleteGroupMutation.mutate(group.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {group.description && <p className="text-sm text-muted-foreground pt-2">{group.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {group.memberships.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun membre affecté.</p>
                      ) : group.memberships.map((membership) => (
                        <div key={membership.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{membership.firstName} {membership.lastName}</p>
                              <p className="text-xs text-muted-foreground">{membership.memberEmail}{membership.company ? ` · ${membership.company}` : ''}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditMembershipDialog(group, membership)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (window.confirm(`Retirer ${membership.firstName} ${membership.lastName} du groupe ${group.name} ?`)) {
                                    removeMembershipMutation.mutate({ groupId: group.id, membershipId: membership.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {membership.role && <Badge>{membership.role}</Badge>}
                            {membership.mission && <span className="text-muted-foreground">{membership.mission}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => openAddMemberDialog(group)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un membre
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Qui est dans quoi ?</CardTitle>
              <CardDescription>Synthèse des rôles et missions par membre pour {year}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Groupes</TableHead>
                    <TableHead>Rôles / missions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberSummaries.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune affectation.</TableCell></TableRow>
                  ) : memberSummaries.map((member) => (
                    <TableRow key={member.email}>
                      <TableCell>
                        <div className="font-medium">{member.firstName} {member.lastName}</div>
                        <div className="text-xs text-muted-foreground">{member.email}{member.company ? ` · ${member.company}` : ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {member.groups.map((group) => (
                            <Badge key={group.id} variant="outline" style={{ borderColor: group.color }}>{group.name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="space-y-1">
                        {member.groups.map((group) => (
                          <div key={group.id} className="text-sm">
                            <span className="font-medium">{group.name}</span>
                            {group.role ? ` — ${group.role}` : ''}
                            {group.mission ? <span className="text-muted-foreground"> · {group.mission}</span> : null}
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau groupe annuel</DialogTitle>
            <DialogDescription>Créez un COPIL, bureau, commission ou groupe de travail pour une année donnée.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} placeholder="Ex: Commission événements" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={groupForm.type} onValueChange={(value) => setGroupForm({ ...groupForm, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUP_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Input type="number" value={groupForm.year} onChange={(event) => setGroupForm({ ...groupForm, year: Number(event.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                {GROUP_COLORS.map((color) => (
                  <button key={color} type="button" className={`h-8 w-8 rounded-full border-2 ${groupForm.color === color ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => setGroupForm({ ...groupForm, color })} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} placeholder="Objectif, périmètre, rythme..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => createGroupMutation.mutate(groupForm)} disabled={createGroupMutation.isPending || !groupForm.name.trim()}>
              {createGroupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(membershipDialogGroup)} onOpenChange={(open) => { if (!open) { setMembershipDialogGroup(null); setEditingMembership(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMembership ? 'Modifier l’affectation' : 'Ajouter un membre'}</DialogTitle>
            <DialogDescription>{membershipDialogGroup?.name} · {membershipDialogGroup?.year}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingMembership && (
              <div className="space-y-2">
                <Label>Membre</Label>
                <MemberSearchSelect value={membershipForm.memberEmail} onValueChange={(value) => setMembershipForm({ ...membershipForm, memberEmail: value })} members={members} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Input value={membershipForm.role} onChange={(event) => setMembershipForm({ ...membershipForm, role: event.target.value })} placeholder="Ex: Référent, Président, Membre" />
            </div>
            <div className="space-y-2">
              <Label>Mission / responsabilité</Label>
              <Textarea value={membershipForm.mission} onChange={(event) => setMembershipForm({ ...membershipForm, mission: event.target.value })} placeholder="Ce que cette personne porte concrètement" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="date" value={membershipForm.startDate} onChange={(event) => setMembershipForm({ ...membershipForm, startDate: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="date" value={membershipForm.endDate} onChange={(event) => setMembershipForm({ ...membershipForm, endDate: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes internes</Label>
              <Textarea value={membershipForm.notes} onChange={(event) => setMembershipForm({ ...membershipForm, notes: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMembershipDialogGroup(null); setEditingMembership(null); }}>Annuler</Button>
            <Button onClick={saveMembership} disabled={addMembershipMutation.isPending || updateMembershipMutation.isPending}>
              {(addMembershipMutation.isPending || updateMembershipMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

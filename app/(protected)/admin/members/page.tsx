'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Search, UserCheck, UserPlus, Eye, Download, BarChart3, Tag } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { AddMemberDialog } from './add-member-dialog';
import { MemberDetailsSheet } from './member-details-sheet';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  status: string;
  engagementScore?: number;
  phone?: string;
  role?: string;
  cjdRole?: string;
  notes?: string;
  proposedBy?: string;
}

interface EditMemberFormData {
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  role?: string;
  cjdRole?: string;
  notes?: string;
}

interface MemberTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  _count?: {
    assignments: number;
  };
}

interface TagFormData {
  name: string;
  color: string;
  description?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

/**
 * Fonction helper pour exporter les membres en CSV
 * Génère un fichier CSV avec BOM UTF-8 et séparateur point-virgule
 */
function exportToCSV(members: Member[]): void {
  if (!members || members.length === 0) {
    return;
  }

  // En-têtes du CSV
  const headers = [
    'Prénom',
    'Nom',
    'Email',
    'Entreprise',
    'Téléphone',
    'Fonction',
    'Rôle CJD',
    'Statut',
    'Score d\'engagement',
    'Proposé par'
  ];

  // Fonction pour échapper les valeurs CSV
  const escapeCSV = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const stringValue = String(value);
    // Si la valeur contient des guillemets, des virgules ou des retours à la ligne, la mettre entre guillemets
    if (stringValue.includes('"') || stringValue.includes(';') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Construire les lignes de données
  const rows = members.map(member => [
    escapeCSV(member.firstName),
    escapeCSV(member.lastName),
    escapeCSV(member.email),
    escapeCSV(member.company),
    escapeCSV(member.phone),
    escapeCSV(member.role),
    escapeCSV(member.cjdRole),
    escapeCSV(member.status === 'active' ? 'Actif' : 'Prospect'),
    escapeCSV(member.status === 'active' ? member.engagementScore : ''),
    escapeCSV(member.proposedBy)
  ]);

  // Construire le contenu CSV avec BOM UTF-8 pour Excel
  const csvContent = [
    '\uFEFF' + headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  // Créer un Blob et déclencher le téléchargement
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  link.setAttribute('href', url);
  link.setAttribute('download', `membres-cjd-${dateStr}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Page Gestion Membres CRM
 * CRUD complet sur les membres avec pagination et recherche
 */
export default function AdminMembersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'proposed'>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [detailsEmail, setDetailsEmail] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditMemberFormData>({
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    role: '',
    cjdRole: '',
    notes: '',
  });

  // Tags management states
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [tagFormDialogOpen, setTagFormDialogOpen] = useState(false);
  const [tagAlertOpen, setTagAlertOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<MemberTag | null>(null);
  const [tagToDelete, setTagToDelete] = useState<MemberTag | null>(null);
  const [tagFormData, setTagFormData] = useState<TagFormData>({
    name: '',
    color: '#3b82f6',
    description: '',
  });
  const [tagFormErrors, setTagFormErrors] = useState<Partial<TagFormData>>({});

  // Query pour lister les membres
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.members.list({ page, limit: 20, search: search || undefined }),
    queryFn: () => api.get<PaginatedResponse<Member>>('/api/admin/members', {
      page,
      limit: 20,
      search: search || undefined,
    }),
  });

  // Mutation pour mettre à jour un membre
  const updateMutation = useMutation({
    mutationFn: (email: string) =>
      api.patch(`/api/admin/members/${encodeURIComponent(email)}`, editFormData),
    onSuccess: () => {
      toast({
        title: 'Membre modifié',
        description: 'Le membre a été modifié avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      setEditDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour supprimer un membre
  const deleteMutation = useMutation({
    mutationFn: (email: string) => api.delete(`/api/admin/members/${encodeURIComponent(email)}`),
    onSuccess: () => {
      toast({
        title: 'Membre supprimé',
        description: 'Le membre a été supprimé avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleOpenEditDialog = (member: Member) => {
    setSelectedMember(member);
    setEditFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      company: member.company || '',
      phone: member.phone || '',
      role: member.role || '',
      cjdRole: member.cjdRole || '',
      notes: member.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedMember(null);
  };

  const handleEditFormChange = (field: keyof EditMemberFormData, value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = () => {
    if (!selectedMember) return;

    if (!editFormData.firstName.trim() || !editFormData.lastName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le prénom et le nom sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate(selectedMember.email);
  };

  const handleDelete = (email: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      deleteMutation.mutate(email);
    }
  };

  const handleExportCSV = () => {
    if (!filteredMembers || filteredMembers.length === 0) {
      toast({
        title: 'Aucun membre à exporter',
        description: 'Aucun membre ne correspond aux filtres actuels',
        variant: 'destructive',
      });
      return;
    }

    exportToCSV(filteredMembers);
    toast({
      title: 'Export CSV réussi',
      description: `${filteredMembers.length} membre(s) exporté(s)`,
    });
  };

  // Mutation pour convertir un prospect en membre actif
  const convertToActiveMutation = useMutation({
    mutationFn: (email: string) =>
      api.patch(`/api/admin/members/${encodeURIComponent(email)}`, { status: 'active' }),
    onSuccess: () => {
      toast({
        title: 'Prospect converti',
        description: 'Le prospect a été converti en membre actif',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Query pour lister tous les tags
  const { data: tags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: queryKeys.members.tags.all,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MemberTag[] }>('/api/admin/tags');
      return response.data;
    },
    enabled: tagsDialogOpen,
  });

  // Mutation pour créer un tag
  const createTagMutation = useMutation({
    mutationFn: (data: TagFormData) =>
      api.post('/api/admin/tags', {
        name: data.name.trim(),
        color: data.color,
        description: data.description?.trim() || undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Tag créé',
        description: 'Le tag a été créé avec succès',
      });
      queryClient.refetchQueries({ queryKey: queryKeys.members.tags.all });
      resetTagForm();
      setTagFormDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la création du tag',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour mettre à jour un tag
  const updateTagMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<TagFormData> }) =>
      api.patch(`/api/admin/tags/${data.id}`, {
        name: data.updates.name?.trim(),
        color: data.updates.color,
        description: data.updates.description?.trim() || undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Tag modifié',
        description: 'Le tag a été modifié avec succès',
      });
      queryClient.refetchQueries({ queryKey: queryKeys.members.tags.all });
      resetTagForm();
      setEditingTag(null);
      setTagFormDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la modification du tag',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour supprimer un tag
  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/tags/${id}`),
    onSuccess: () => {
      toast({
        title: 'Tag supprimé',
        description: 'Le tag a été supprimé avec succès',
      });
      queryClient.refetchQueries({ queryKey: queryKeys.members.tags.all });
      setTagToDelete(null);
      setTagAlertOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression du tag',
        variant: 'destructive',
      });
    },
  });

  // Tag management functions
  const resetTagForm = () => {
    setTagFormData({
      name: '',
      color: '#3b82f6',
      description: '',
    });
    setTagFormErrors({});
  };

  const validateTagForm = (): boolean => {
    const newErrors: Partial<TagFormData> = {};

    if (!tagFormData.name.trim()) {
      newErrors.name = 'Le nom du tag est requis';
    } else if (tagFormData.name.trim().length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caractères';
    } else if (tagFormData.name.trim().length > 50) {
      newErrors.name = 'Le nom ne peut pas dépasser 50 caractères';
    }

    const tagWithSameName = tags.some(
      tag => tag.name.toLowerCase() === tagFormData.name.trim().toLowerCase() &&
             (!editingTag || tag.id !== editingTag.id)
    );
    if (tagWithSameName) {
      newErrors.name = 'Un tag avec ce nom existe déjà';
    }

    if (!tagFormData.color) {
      newErrors.color = 'La couleur est requise';
    }

    setTagFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTagInputChange = (field: keyof TagFormData, value: string) => {
    setTagFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (tagFormErrors[field]) {
      setTagFormErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleTagSubmit = () => {
    if (validateTagForm()) {
      if (editingTag) {
        updateTagMutation.mutate({
          id: editingTag.id,
          updates: tagFormData,
        });
      } else {
        createTagMutation.mutate(tagFormData);
      }
    }
  };

  const openCreateTagDialog = () => {
    setEditingTag(null);
    resetTagForm();
    setTagFormDialogOpen(true);
  };

  const openEditTagDialog = (tag: MemberTag) => {
    setEditingTag(tag);
    setTagFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    });
    setTagFormDialogOpen(true);
  };

  const openDeleteTagConfirm = (tag: MemberTag) => {
    setTagToDelete(tag);
    setTagAlertOpen(true);
  };

  const handleDeleteTag = () => {
    if (tagToDelete) {
      deleteTagMutation.mutate(tagToDelete.id);
    }
  };

  // Filtrés les membres selon le statut sélectionné
  const filteredMembers = data?.data?.filter(member => {
    if (statusFilter === 'all') return true;
    return member.status === statusFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>Impossible de charger les membres</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion Membres</h1>
          <p className="text-muted-foreground">
            CRM - Gestion des membres de l'association
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/members/stats">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistiques
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setTagsDialogOpen(true)}>
            <Tag className="h-4 w-4 mr-2" />
            Gérer les tags
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un membre
          </Button>
        </div>
      </div>

      <Card data-testid="members-list">
        <CardHeader>
          <CardTitle>Liste des membres</CardTitle>
          <CardDescription>
            {data?.total || 0} membres au total
          </CardDescription>

          {/* Filtres par statut */}
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Filtrer par statut :</span>
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Tous
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Membres actifs
              </Button>
              <Button
                variant={statusFilter === 'proposed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('proposed')}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Prospects
              </Button>
            </div>

            {/* Recherche */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers && filteredMembers.length > 0 ? (
                filteredMembers.map((member: Member) => (
                  <TableRow
                    key={member.email}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      router.push(`/admin/members/${encodeURIComponent(member.email)}`);
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{member.firstName} {member.lastName}</span>
                        {member.status === 'proposed' && member.proposedBy && (
                          <span className="text-xs text-muted-foreground">(proposé par {member.proposedBy})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer hover:text-primary transition-colors"
                      title="Cliquer pour copier l'email"
                    >
                      <span
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(member.email);
                            toast({
                              title: 'Email copié',
                              description: `${member.email} a été copié dans le presse-papier`,
                            });
                          } catch (error) {
                            toast({
                              title: 'Erreur',
                              description: 'Impossible de copier l\'email',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        {member.email}
                      </span>
                    </TableCell>
                    <TableCell>{member.company || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={member.status === 'active' ? 'default' : 'outline'}
                        className={member.status === 'active' ? 'bg-green-50 text-green-900 border-green-200' : 'bg-orange-50 text-orange-900 border-orange-200'}
                        data-testid="member-status-badge"
                      >
                        {member.status === 'active' ? '✓ Actif' : '○ Prospect'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.status === 'active' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${member.engagementScore || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            <span data-testid="member-engagement-score">
                              {member.engagementScore || 0}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {member.status === 'proposed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              convertToActiveMutation.mutate(member.email);
                            }}
                            disabled={convertToActiveMutation.isPending}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            {convertToActiveMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Convertir
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {data?.data && data.data.length > 0
                      ? 'Aucun membre ne correspond à ce statut'
                      : 'Aucun membre trouvé'
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && Math.ceil(data.total / data.limit) > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <div className="flex items-center px-4 text-sm">
                Page {page} sur {Math.ceil(data.total / data.limit)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(Math.ceil(data.total / data.limit), p + 1))}
                disabled={page === Math.ceil(data.total / data.limit)}
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ajouter un membre */}
      <AddMemberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Dialog Modifier un membre */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le membre</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du membre
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              {/* Email (non modifiable) */}
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedMember.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Prénom */}
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">Prénom *</Label>
                <Input
                  id="edit-firstName"
                  placeholder="Prénom"
                  value={editFormData.firstName}
                  onChange={(e) =>
                    handleEditFormChange('firstName', e.target.value)
                  }
                />
              </div>

              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Nom *</Label>
                <Input
                  id="edit-lastName"
                  placeholder="Nom"
                  value={editFormData.lastName}
                  onChange={(e) =>
                    handleEditFormChange('lastName', e.target.value)
                  }
                />
              </div>

              {/* Entreprise */}
              <div className="space-y-2">
                <Label htmlFor="edit-company">Entreprise</Label>
                <Input
                  id="edit-company"
                  placeholder="Entreprise"
                  value={editFormData.company}
                  onChange={(e) =>
                    handleEditFormChange('company', e.target.value)
                  }
                />
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Téléphone</Label>
                <Input
                  id="edit-phone"
                  placeholder="Téléphone"
                  value={editFormData.phone}
                  onChange={(e) =>
                    handleEditFormChange('phone', e.target.value)
                  }
                />
              </div>

              {/* Poste */}
              <div className="space-y-2">
                <Label htmlFor="edit-role">Poste</Label>
                <Input
                  id="edit-role"
                  placeholder="Directeur, Développeur, etc."
                  value={editFormData.role}
                  onChange={(e) =>
                    handleEditFormChange('role', e.target.value)
                  }
                />
              </div>

              {/* Rôle CJD */}
              <div className="space-y-2">
                <Label htmlFor="edit-cjdRole">Rôle CJD</Label>
                <Input
                  id="edit-cjdRole"
                  placeholder="Président, Trésorier, Membre, etc."
                  value={editFormData.cjdRole}
                  onChange={(e) =>
                    handleEditFormChange('cjdRole', e.target.value)
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  placeholder="Notes additionnelles"
                  value={editFormData.notes}
                  onChange={(e) =>
                    handleEditFormChange('notes', e.target.value)
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEditDialog}
              disabled={updateMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet détails membre */}
      <MemberDetailsSheet
        email={detailsEmail}
        open={detailsSheetOpen}
        onClose={() => {
          setDetailsSheetOpen(false);
          setDetailsEmail(null);
        }}
        onEdit={(member: Member) => {
          handleOpenEditDialog(member);
          setDetailsSheetOpen(false);
        }}
        onDelete={(email: string) => {
          handleDelete(email);
          setDetailsSheetOpen(false);
        }}
        onConvertToActive={(email: string) => {
          convertToActiveMutation.mutate(email);
        }}
        isConvertingToActive={convertToActiveMutation.isPending}
        isDeletingMember={deleteMutation.isPending}
      />

      {/* Dialog Gestion des Tags */}
      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Gestion des Tags
            </DialogTitle>
            <DialogDescription>
              Créez et gérez les tags personnalisés pour les membres
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {tags.length} tag{tags.length !== 1 ? 's' : ''} disponible{tags.length !== 1 ? 's' : ''}
              </p>
              <Button size="sm" onClick={openCreateTagDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un tag
              </Button>
            </div>

            {isLoadingTags && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoadingTags && tags.length === 0 && (
              <div className="text-center py-12">
                <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Aucun tag créé pour le moment</p>
                <Button onClick={openCreateTagDialog} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer le premier tag
                </Button>
              </div>
            )}

            {!isLoadingTags && tags.length > 0 && (
              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Nom</TableHead>
                      <TableHead className="w-1/3">Couleur</TableHead>
                      <TableHead className="w-1/6">Utilisations</TableHead>
                      <TableHead className="w-1/6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="font-medium">{tag.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-md border"
                              style={{ backgroundColor: tag.color }}
                              title={tag.color}
                            />
                            <span className="text-sm text-muted-foreground font-mono">
                              {tag.color}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {tag._count?.assignments ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditTagDialog(tag)}
                            title="Modifier le tag"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteTagConfirm(tag)}
                            title="Supprimer le tag"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTagsDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Création/Édition Tag */}
      <Dialog open={tagFormDialogOpen} onOpenChange={setTagFormDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Modifier le tag' : 'Créer un nouveau tag'}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? 'Modifiez les informations du tag'
                : 'Créez un nouveau tag personnalisé pour les membres'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nom */}
            <div className="grid gap-2">
              <Label htmlFor="tag-name" className="flex items-center gap-1">
                Nom du tag <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tag-name"
                name="tag-name"
                placeholder="ex: VIP, Ambassadeur, Contributeur"
                value={tagFormData.name}
                onChange={(e) => handleTagInputChange('name', e.target.value)}
                disabled={createTagMutation.isPending || updateTagMutation.isPending}
                maxLength={50}
              />
              {tagFormErrors.name && (
                <p className="text-xs text-destructive">{tagFormErrors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {tagFormData.name.length}/50 caractères
              </p>
            </div>

            {/* Couleur */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1">
                Couleur du tag <span className="text-destructive">*</span>
              </Label>

              {/* Color Picker - Grid de couleurs */}
              <div className="grid grid-cols-4 gap-3">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      tagFormData.color === color
                        ? 'border-foreground ring-2 ring-ring'
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleTagInputChange('color', color)}
                    title={color}
                    disabled={createTagMutation.isPending || updateTagMutation.isPending}
                  />
                ))}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2">
                <Label htmlFor="customColor" className="text-xs">
                  Hex personnalisé:
                </Label>
                <Input
                  id="customColor"
                  type="text"
                  placeholder="#000000"
                  value={tagFormData.color}
                  onChange={(e) => handleTagInputChange('color', e.target.value)}
                  disabled={createTagMutation.isPending || updateTagMutation.isPending}
                  className="font-mono flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  maxLength={7}
                />
              </div>

              {tagFormErrors.color && (
                <p className="text-xs text-destructive">{tagFormErrors.color}</p>
              )}
            </div>

            {/* Description (Optionnel) */}
            <div className="grid gap-2">
              <Label htmlFor="tag-description">Description (optionnel)</Label>
              <Input
                id="tag-description"
                placeholder="ex: Clients très importants"
                value={tagFormData.description}
                onChange={(e) => handleTagInputChange('description', e.target.value)}
                disabled={createTagMutation.isPending || updateTagMutation.isPending}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {tagFormData.description?.length ?? 0}/500 caractères
              </p>
            </div>

            {/* Prévisualisation */}
            <div className="grid gap-2">
              <Label>Prévisualisation</Label>
              <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
                <Badge style={{ backgroundColor: tagFormData.color }} className="text-white">
                  {tagFormData.name || 'Tag name'}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetTagForm();
                setEditingTag(null);
                setTagFormDialogOpen(false);
              }}
              disabled={createTagMutation.isPending || updateTagMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleTagSubmit}
              disabled={
                createTagMutation.isPending || updateTagMutation.isPending ||
                !tagFormData.name.trim()
              }
            >
              {(createTagMutation.isPending || updateTagMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {createTagMutation.isPending || updateTagMutation.isPending
                ? 'Traitement en cours...'
                : editingTag
                ? 'Modifier le tag'
                : 'Créer le tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Suppression Tag */}
      <AlertDialog open={tagAlertOpen} onOpenChange={setTagAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le tag ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le tag{' '}
              <span className="font-semibold">"{tagToDelete?.name}"</span> ?
              {tagToDelete?._count?.assignments ? (
                <>
                  <br />
                  <span className="text-amber-600">
                    Attention: Ce tag est actuellement assigné à{' '}
                    <span className="font-semibold">{tagToDelete._count.assignments}</span> membre
                    {tagToDelete._count.assignments > 1 ? 's' : ''}.
                  </span>
                </>
              ) : null}
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTagMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              disabled={deleteTagMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteTagMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {deleteTagMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

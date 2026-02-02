'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, Plus, Trash2, Users, UserCheck, Briefcase, Heart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  status: string;
}

interface MemberRelation {
  id: string;
  memberEmail: string;
  relatedMemberEmail: string;
  relationType: 'sponsor' | 'team' | 'custom';
  description?: string;
  createdAt: string;
  createdBy?: string;
  member?: Member;
  relatedMember?: Member;
}

interface RelationFormData {
  memberEmail: string;
  relatedMemberEmail: string;
  relationType: 'sponsor' | 'team' | 'custom' | '';
  description?: string;
}

interface FormErrors {
  memberEmail?: string;
  relatedMemberEmail?: string;
  relationType?: string;
  description?: string;
}

const RELATION_TYPES = [
  { value: 'sponsor', label: 'Parrain/marraine', icon: '👤' },
  { value: 'team', label: 'Équipe/collègue', icon: '🤝' },
  { value: 'custom', label: 'Personnalisé', icon: '💼' },
] as const;

const RELATION_TYPE_LABELS: Record<string, string> = {
  sponsor: 'Parrain/marraine',
  team: 'Équipe/collègue',
  custom: 'Personnalisé',
};

const RELATION_TYPE_ICONS: Record<string, string> = {
  sponsor: '👤',
  team: '🤝',
  custom: '💼',
};

const getRelationBadgeColor = (type: string) => {
  const colors: Record<string, string> = {
    sponsor: 'bg-blue-50 text-blue-900 border-blue-200',
    team: 'bg-green-50 text-green-900 border-green-200',
    custom: 'bg-purple-50 text-purple-900 border-purple-200',
  };
  return colors[type] || 'bg-gray-50 text-gray-900 border-gray-200';
};

/**
 * Page Gestion des Relations entre Membres
 * CRUD complet sur les relations avec filtres et modal de création
 */
export default function AdminMembersRelationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [relationToDelete, setRelationToDelete] = useState<MemberRelation | null>(null);

  // Filter states
  const [relationTypeFilter, setRelationTypeFilter] = useState<'all' | 'sponsor' | 'team' | 'custom'>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<RelationFormData>({
    memberEmail: '',
    relatedMemberEmail: '',
    relationType: '',
    description: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Query pour lister tous les membres
  const { data: membersData } = useQuery({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Member[] }>('/api/admin/members');
      return response.data;
    },
  });

  const members = membersData || [];

  // Query pour lister toutes les relations
  // Note: Utilise uniquement l'endpoint global /api/admin/relations
  // Pas de fallback pour éviter les boucles infinies de requêtes
  const { data: relations = [], isLoading, error } = useQuery({
    queryKey: queryKeys.members.relations.all,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MemberRelation[] }>('/api/admin/relations');
      return response.data;
    },
  });

  // Enrichir les relations avec les noms des membres
  const enrichedRelations = useMemo(() => {
    return relations.map(rel => ({
      ...rel,
      member: members.find(m => m.email === rel.memberEmail),
      relatedMember: members.find(m => m.email === rel.relatedMemberEmail),
    }));
  }, [relations, members]);

  // Appliquer les filtres
  const filteredRelations = useMemo(() => {
    return enrichedRelations.filter(rel => {
      if (relationTypeFilter !== 'all' && rel.relationType !== relationTypeFilter) {
        return false;
      }
      if (memberFilter !== 'all' && rel.memberEmail !== memberFilter && rel.relatedMemberEmail !== memberFilter) {
        return false;
      }
      return true;
    });
  }, [enrichedRelations, relationTypeFilter, memberFilter]);

  // Mutation pour créer une relation
  const createMutation = useMutation({
    mutationFn: (data: RelationFormData) =>
      api.post('/api/admin/relations', {
        memberEmail: data.memberEmail,
        relatedMemberEmail: data.relatedMemberEmail,
        relationType: data.relationType,
        description: data.description,
      }),
    onSuccess: () => {
      toast({
        title: 'Relation créée',
        description: 'La relation a été créée avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.relations.all });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour supprimer une relation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/admin/relations/${id}`),
    onSuccess: () => {
      toast({
        title: 'Relation supprimée',
        description: 'La relation a été supprimée avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.relations.all });
      setAlertOpen(false);
      setRelationToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      memberEmail: '',
      relatedMemberEmail: '',
      relationType: '',
      description: '',
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.memberEmail.trim()) {
      newErrors.memberEmail = 'Le membre principal est obligatoire';
    }
    if (!formData.relatedMemberEmail.trim()) {
      newErrors.relatedMemberEmail = 'Le membre lié est obligatoire';
    }
    if (!formData.relationType.trim()) {
      newErrors.relationType = 'Le type de relation est obligatoire';
    }
    if (formData.memberEmail === formData.relatedMemberEmail) {
      newErrors.relatedMemberEmail = 'Un membre ne peut pas être lié à lui-même';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleCreateFormChange = (field: keyof RelationFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Effacer l'erreur du champ en cours de modification
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSaveCreate = () => {
    if (!validateForm()) return;
    createMutation.mutate(formData);
  };

  const handleDeleteClick = (relation: MemberRelation) => {
    setRelationToDelete(relation);
    setAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!relationToDelete) return;
    deleteMutation.mutate(relationToDelete.id);
  };

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
            <CardDescription>Impossible de charger les relations</CardDescription>
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Relations</h1>
          <p className="text-muted-foreground">
            Gérez les relations entre les membres de l'association
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une relation
        </Button>
      </div>

      {/* Card Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Relations entre membres</CardTitle>
          <CardDescription>
            {filteredRelations.length} relation(s) trouvée(s) {filteredRelations.length !== relations.length ? `(${relations.length} au total)` : ''}
          </CardDescription>

          {/* Filtres */}
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Type de relation :</span>
              <Button
                variant={relationTypeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRelationTypeFilter('all')}
              >
                Tous
              </Button>
              {RELATION_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={relationTypeFilter === type.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRelationTypeFilter(type.value as any)}
                >
                  <span className="mr-1">{type.icon}</span>
                  {type.label}
                </Button>
              ))}
            </div>

            {/* Filtre par membre */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Membre :</span>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrer par membre..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les membres</SelectItem>
                  {members
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map((member) => (
                      <SelectItem key={member.email} value={member.email}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        {/* Table */}
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Membre 1</TableHead>
                  <TableHead className="w-[180px]">Type de relation</TableHead>
                  <TableHead>Membre 2</TableHead>
                  <TableHead className="w-[140px]">Date création</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRelations && filteredRelations.length > 0 ? (
                  filteredRelations.map((relation) => (
                    <TableRow key={relation.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{relation.member?.firstName} {relation.member?.lastName}</span>
                          <span className="text-xs text-muted-foreground">{relation.memberEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${getRelationBadgeColor(relation.relationType)} border`}
                        >
                          <span className="mr-1">{RELATION_TYPE_ICONS[relation.relationType]}</span>
                          {RELATION_TYPE_LABELS[relation.relationType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{relation.relatedMember?.firstName} {relation.relatedMember?.lastName}</span>
                          <span className="text-xs text-muted-foreground">{relation.relatedMemberEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(relation.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(relation)}
                          disabled={deleteMutation.isPending}
                          title="Supprimer la relation"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {relations.length > 0
                        ? 'Aucune relation ne correspond aux filtres sélectionnés'
                        : 'Aucune relation trouvée. Créez-en une en cliquant sur "Créer une relation".'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Création */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer une relation</DialogTitle>
            <DialogDescription>
              Établissez une nouvelle relation entre deux membres
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Membre principal */}
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Membre principal *</Label>
              <Select value={formData.memberEmail} onValueChange={(value) => handleCreateFormChange('memberEmail', value)}>
                <SelectTrigger id="memberEmail" className={errors.memberEmail ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Sélectionner un membre..." />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map((member) => (
                      <SelectItem key={member.email} value={member.email}>
                        <div className="flex flex-col">
                          <span>{member.firstName} {member.lastName}</span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.memberEmail && (
                <p className="text-xs text-destructive">{errors.memberEmail}</p>
              )}
            </div>

            {/* Type de relation */}
            <div className="space-y-2">
              <Label htmlFor="relationType">Type de relation *</Label>
              <Select value={formData.relationType} onValueChange={(value) => handleCreateFormChange('relationType', value)}>
                <SelectTrigger id="relationType" className={errors.relationType ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Sélectionner un type..." />
                </SelectTrigger>
                <SelectContent>
                  {RELATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="mr-2">{type.icon}</span>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.relationType && (
                <p className="text-xs text-destructive">{errors.relationType}</p>
              )}
            </div>

            {/* Membre lié */}
            <div className="space-y-2">
              <Label htmlFor="relatedMemberEmail">Membre lié *</Label>
              <Select value={formData.relatedMemberEmail} onValueChange={(value) => handleCreateFormChange('relatedMemberEmail', value)}>
                <SelectTrigger id="relatedMemberEmail" className={errors.relatedMemberEmail ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Sélectionner un membre..." />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => m.email !== formData.memberEmail) // Exclure le membre principal
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map((member) => (
                      <SelectItem key={member.email} value={member.email}>
                        <div className="flex flex-col">
                          <span>{member.firstName} {member.lastName}</span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.relatedMemberEmail && (
                <p className="text-xs text-destructive">{errors.relatedMemberEmail}</p>
              )}
            </div>

            {/* Description (optionnel) */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <textarea
                id="description"
                placeholder="Informations supplémentaires..."
                value={formData.description || ''}
                onChange={(e) => handleCreateFormChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseCreateDialog}
              disabled={createMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer la relation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Suppression */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la relation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la relation entre {relationToDelete?.member?.firstName} {relationToDelete?.member?.lastName} et {relationToDelete?.relatedMember?.firstName} {relationToDelete?.relatedMember?.lastName} ?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Cette action est irréversible.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

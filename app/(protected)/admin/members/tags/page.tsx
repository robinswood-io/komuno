'use client';

import { useState } from 'react';
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
import { Loader2, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
 * Page Gestion des Tags Membres
 * CRUD complet sur les tags avec validation et confirmation
 */
export default function AdminMembersTagsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<MemberTag | null>(null);
  const [tagToDelete, setTagToDelete] = useState<MemberTag | null>(null);

  // Form state
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: '#3b82f6',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<TagFormData>>({});

  // Query pour lister tous les tags
  const { data: tags = [], isLoading, error } = useQuery({
    queryKey: queryKeys.members.tags.all,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MemberTag[] }>('/api/admin/tags');
      return response.data;
    },
  });

  // Mutation pour créer un tag
  const createMutation = useMutation({
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
      // Force refetch immediately (bypasses staleTime)
      queryClient.refetchQueries({ queryKey: queryKeys.members.tags.all });
      resetForm();
      setDialogOpen(false);
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
  const updateMutation = useMutation({
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
      // Force refetch immediately (bypasses staleTime)
      queryClient.refetchQueries({ queryKey: queryKeys.members.tags.all });
      resetForm();
      setEditingTag(null);
      setDialogOpen(false);
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
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/tags/${id}`),
    onSuccess: () => {
      toast({
        title: 'Tag supprimé',
        description: 'Le tag a été supprimé avec succès',
      });
      // Force refetch immediately (bypasses staleTime)
      queryClient.refetchQueries({ queryKey: queryKeys.members.tags.all });
      setTagToDelete(null);
      setAlertOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression du tag',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3b82f6',
      description: '',
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TagFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du tag est requis';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caractères';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Le nom ne peut pas dépasser 50 caractères';
    }

    // Vérifier l'unicité du nom (sauf si on est en édition et que c'est le même nom)
    const tagWithSameName = tags.some(
      tag => tag.name.toLowerCase() === formData.name.trim().toLowerCase() &&
             (!editingTag || tag.id !== editingTag.id)
    );
    if (tagWithSameName) {
      newErrors.name = 'Un tag avec ce nom existe déjà';
    }

    if (!formData.color) {
      newErrors.color = 'La couleur est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof TagFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      if (editingTag) {
        updateMutation.mutate({
          id: editingTag.id,
          updates: formData,
        });
      } else {
        createMutation.mutate(formData);
      }
    }
  };

  const openCreateDialog = () => {
    setEditingTag(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (tag: MemberTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    });
    setDialogOpen(true);
  };

  const openDeleteConfirm = (tag: MemberTag) => {
    setTagToDelete(tag);
    setAlertOpen(true);
  };

  const handleDelete = () => {
    if (tagToDelete) {
      deleteMutation.mutate(tagToDelete.id);
    }
  };

  const isLoading_all = isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-8 w-8" />
            Gestion des Tags
          </h1>
          <p className="text-muted-foreground">
            Créez et gérez les tags personnalisés pour les membres
          </p>
        </div>
        <Button onClick={openCreateDialog} disabled={isLoading_all}>
          <Plus className="mr-2 h-4 w-4" />
          Créer un tag
        </Button>
      </div>

      {/* Tags List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des tags</CardTitle>
          <CardDescription>
            {tags.length} tag{tags.length !== 1 ? 's' : ''} disponible{tags.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-12 text-destructive">
              <p>Erreur lors du chargement des tags</p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && tags.length === 0 && (
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun tag créé pour le moment</p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Créer le premier tag
              </Button>
            </div>
          )}

          {!isLoading && tags.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Nom</TableHead>
                    <TableHead className="w-1/4">Couleur</TableHead>
                    <TableHead className="w-1/4">Utilisations</TableHead>
                    <TableHead className="w-1/4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      {/* Nom */}
                      <TableCell className="font-medium">{tag.name}</TableCell>

                      {/* Couleur */}
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

                      {/* Nombre d'utilisations */}
                      <TableCell>
                        <Badge variant="secondary">
                          {tag._count?.assignments ?? 0}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(tag)}
                          disabled={isLoading_all}
                          title="Modifier le tag"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteConfirm(tag)}
                          disabled={isLoading_all}
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
        </CardContent>
      </Card>

      {/* Dialog Création/Édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <Label htmlFor="name" className="flex items-center gap-1">
                Nom du tag <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name" name="name"
                placeholder="ex: VIP, Ambassadeur, Contributeur"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={createMutation.isPending || updateMutation.isPending}
                maxLength={50}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/50 caractères
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
                      formData.color === color
                        ? 'border-foreground ring-2 ring-ring'
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleInputChange('color', color)}
                    title={color}
                    disabled={createMutation.isPending || updateMutation.isPending}
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
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="font-mono flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  maxLength={7}
                />
              </div>

              {errors.color && (
                <p className="text-xs text-destructive">{errors.color}</p>
              )}
            </div>

            {/* Description (Optionnel) */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Input
                id="description"
                placeholder="ex: Clients très importants"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={createMutation.isPending || updateMutation.isPending}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description?.length ?? 0}/500 caractères
              </p>
            </div>

            {/* Prévisualisation */}
            <div className="grid gap-2">
              <Label>Prévisualisation</Label>
              <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
                <Badge style={{ backgroundColor: formData.color }} className="text-white">
                  {formData.name || 'Tag name'}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setEditingTag(null);
                setDialogOpen(false);
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                createMutation.isPending || updateMutation.isPending ||
                !formData.name.trim()
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {createMutation.isPending || updateMutation.isPending
                ? 'Traitement en cours...'
                : editingTag
                ? 'Modifier le tag'
                : 'Créer le tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Suppression */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
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
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

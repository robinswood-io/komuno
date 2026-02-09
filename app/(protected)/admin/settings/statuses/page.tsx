'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
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
import { Loader2, Plus, Pencil, Trash2, Tag, GripVertical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface MemberStatus {
  id: string;
  code: string;
  label: string;
  category: 'member' | 'prospect';
  color: string;
  description: string | null;
  isSystem: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StatusFormData {
  code: string;
  label: string;
  category: 'member' | 'prospect';
  color: string;
  description: string;
  displayOrder?: number;
}

const AVAILABLE_COLORS = [
  { value: 'green', label: 'Vert', class: 'bg-green-500' },
  { value: 'red', label: 'Rouge', class: 'bg-red-500' },
  { value: 'blue', label: 'Bleu', class: 'bg-blue-500' },
  { value: 'yellow', label: 'Jaune', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Violet', class: 'bg-purple-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'pink', label: 'Rose', class: 'bg-pink-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'gray', label: 'Gris', class: 'bg-gray-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
];

/**
 * Page Admin - Gestion des statuts membres personnalisables
 */
export default function MemberStatusesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // États locaux
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'member' | 'prospect'>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<MemberStatus | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Formulaire création
  const [formData, setFormData] = useState<StatusFormData>({
    code: '',
    label: '',
    category: 'member',
    color: 'blue',
    description: '',
  });

  // Query - Liste des statuts
  const { data: statusesData, isLoading } = useQuery({
    queryKey: queryKeys.admin.memberStatuses({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      isActive: showActiveOnly ? true : undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (showActiveOnly) params.append('isActive', 'true');

      const response = await api.get<ApiResponse<MemberStatus[]>>(`/api/admin/member-statuses?${params}`);
      return response.data;
    },
  });

  const statuses = statusesData || [];

  // Mutation - Créer statut
  const createMutation = useMutation({
    mutationFn: async (data: StatusFormData) => {
      const response = await api.post<ApiResponse<MemberStatus>>('/api/admin/member-statuses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.memberStatuses() });
      toast({
        title: 'Statut créé',
        description: 'Le statut a été créé avec succès',
      });
      setIsCreateDialogOpen(false);
      setFormData({
        code: '',
        label: '',
        category: 'member',
        color: 'blue',
        description: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le statut',
        variant: 'destructive',
      });
    },
  });

  // Mutation - Modifier statut
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StatusFormData> & { isActive?: boolean } }) => {
      const response = await api.patch<ApiResponse<MemberStatus>>(`/api/admin/member-statuses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.memberStatuses() });
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut a été modifié avec succès',
      });
      setIsEditDialogOpen(false);
      setEditingStatus(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le statut',
        variant: 'destructive',
      });
    },
  });

  // Mutation - Supprimer statut
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/member-statuses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.memberStatuses() });
      toast({
        title: 'Statut supprimé',
        description: 'Le statut a été supprimé avec succès',
      });
      setDeleteConfirmId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le statut',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (status: MemberStatus) => {
    setEditingStatus(status);
    setFormData({
      code: status.code,
      label: status.label,
      category: status.category,
      color: status.color,
      description: status.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingStatus) return;

    updateMutation.mutate({
      id: editingStatus.id,
      data: {
        label: formData.label,
        color: formData.color,
        description: formData.description,
      },
    });
  };

  const handleToggleActive = (status: MemberStatus) => {
    updateMutation.mutate({
      id: status.id,
      data: { isActive: !status.isActive },
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-800 border-green-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Statuts Membres</h1>
        <p className="text-muted-foreground mt-2">
          Gérez les statuts personnalisables pour les membres et prospects
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Liste des statuts</CardTitle>
              <CardDescription>
                Statuts système et personnalisés pour catégoriser les membres
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau statut
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  <SelectItem value="member">Membres</SelectItem>
                  <SelectItem value="prospect">Prospects</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
                id="active-only"
              />
              <Label htmlFor="active-only" className="cursor-pointer">
                Actifs uniquement
              </Label>
            </div>
          </div>

          {/* Tableau */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : statuses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun statut trouvé
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{status.code}</TableCell>
                    <TableCell className="font-medium">{status.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {status.category === 'member' ? 'Membre' : 'Prospect'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getColorClass(status.color)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {status.description || '-'}
                    </TableCell>
                    <TableCell>
                      {status.isSystem ? (
                        <Badge variant="secondary">Système</Badge>
                      ) : (
                        <Badge variant="outline">Personnalisé</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={status.isActive}
                        onCheckedChange={() => handleToggleActive(status)}
                        disabled={status.isSystem}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(status)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!status.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(status.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Création */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau statut</DialogTitle>
            <DialogDescription>
              Ajoutez un statut personnalisé pour catégoriser vos membres ou prospects
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code technique *</Label>
              <Input
                id="code"
                placeholder="ex: vip, premium, en_attente"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
              />
              <p className="text-sm text-muted-foreground">
                Lettres minuscules, chiffres et underscores uniquement
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Libellé *</Label>
              <Input
                id="label"
                placeholder="ex: VIP, Premium, En attente"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as 'member' | 'prospect' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membre</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Couleur *</Label>
              <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description du statut..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !formData.code || !formData.label}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut</DialogTitle>
            <DialogDescription>
              {editingStatus?.isSystem
                ? 'Les statuts système peuvent seulement modifier leur libellé et couleur'
                : 'Modifiez les propriétés du statut personnalisé'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code technique</Label>
              <Input value={formData.code} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-label">Libellé *</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Couleur *</Label>
              <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending || !formData.label}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Suppression */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce statut ? Cette action est irréversible.
              Les membres utilisant ce statut devront être réaffectés manuellement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

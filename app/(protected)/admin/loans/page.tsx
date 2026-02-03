'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, CheckCircle, XCircle, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type LoanStatus = 'pending' | 'available' | 'borrowed' | 'unavailable';

interface LoanItem {
  id: string;
  title: string;
  description?: string;
  lenderName: string;
  photoUrl?: string;
  status: LoanStatus;
  proposedBy: string;
  proposedByEmail: string;
  createdAt: string;
}

/**
 * Page Gestion Prêts Admin
 * CRUD complet sur les items de prêt
 */
export default function AdminLoansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LoanStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LoanItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    lenderName: '',
    photoUrl: '',
    status: 'pending' as LoanStatus,
    proposedBy: '',
    proposedByEmail: '',
  });

  // Query pour lister les items de prêt
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.loans.listAll({ page, limit: 20, search: search || undefined }),
    queryFn: () => api.get<PaginatedResponse<LoanItem>>('/api/admin/loan-items', {
      page,
      limit: 20,
      search: search || undefined,
    }),
  });

  // Mutation pour créer un item
  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      lenderName: string;
      photoUrl?: string;
      proposedBy: string;
      proposedByEmail: string;
    }) => api.post('/api/admin/loan-items', data),
    onSuccess: () => {
      toast({
        title: 'Objet créé',
        description: 'L\'objet de prêt a été ajouté avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
      setShowCreateModal(false);
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

  // Mutation pour mettre à jour un item
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LoanItem> }) =>
      api.put(`/api/admin/loan-items/${id}`, data),
    onSuccess: () => {
      toast({
        title: 'Item mis à jour',
        description: 'L\'item de prêt a été modifié avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
      setShowEditModal(false);
      setSelectedItem(null);
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

  // Mutation pour mettre à jour le statut
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LoanStatus }) =>
      api.patch(`/api/admin/loan-items/${id}/status`, { status }),
    onSuccess: () => {
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut de l\'item a été modifié avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour supprimer un item
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/loan-items/${id}`),
    onSuccess: () => {
      toast({
        title: 'Item supprimé',
        description: 'L\'item de prêt a été supprimé avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
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
      title: '',
      description: '',
      lenderName: '',
      photoUrl: '',
      status: 'pending',
      proposedBy: '',
      proposedByEmail: '',
    });
  };

  const handleCreate = () => {
    if (!formData.title || !formData.lenderName) {
      toast({
        title: 'Erreur',
        description: 'Le nom et le prêteur sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      lenderName: formData.lenderName,
      photoUrl: formData.photoUrl || undefined,
      proposedBy: formData.proposedBy || 'Admin',
      proposedByEmail: formData.proposedByEmail || 'admin@cjd-amiens.fr',
    });
  };

  const handleEdit = () => {
    if (!selectedItem) return;

    updateMutation.mutate({
      id: selectedItem.id,
      data: {
        title: formData.title,
        description: formData.description || undefined,
        lenderName: formData.lenderName,
        photoUrl: formData.photoUrl || undefined,
      },
    });
  };

  const handleUpdateStatus = (id: string, status: LoanStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'item "${title}" ?`)) {
      deleteMutation.mutate(id);
    }
  };

  const openEditModal = (item: LoanItem) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      lenderName: item.lenderName,
      photoUrl: item.photoUrl || '',
      status: item.status,
      proposedBy: item.proposedBy,
      proposedByEmail: item.proposedByEmail,
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success-light text-success-dark border-success/20';
      case 'borrowed':
        return 'bg-info-light text-info-dark border-info/20';
      case 'pending':
        return 'bg-warning-light text-warning-dark border-warning/20';
      case 'unavailable':
        return 'bg-error-light text-error-dark border-error/20';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'borrowed':
        return 'Emprunté';
      case 'pending':
        return 'En attente';
      case 'unavailable':
        return 'Indisponible';
      default:
        return status;
    }
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
            <CardDescription>Impossible de charger les items de prêt</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract data with proper type narrowing
  const items = (data && 'data' in data ? data.data : []) as LoanItem[];
  const total = (data && 'total' in data ? data.total : 0) as number;
  const limit = (data && 'limit' in data ? data.limit : 20) as number;

  // Filtrer les items par statut
  const filteredItems = statusFilter === 'all'
    ? items
    : items.filter((item: LoanItem) => item.status === statusFilter);

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Prêts</h1>
          <p className="text-muted-foreground">
            Gérez les items disponibles au prêt entre membres
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un item
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-dark">
              {items.filter((i: LoanItem) => i.status === 'available').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Empruntés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-dark">
              {items.filter((i: LoanItem) => i.status === 'borrowed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-dark">
              {items.filter((i: LoanItem) => i.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Liste des items</CardTitle>
              <CardDescription>
                {filteredItems.length} item(s) affiché(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: LoanStatus | 'all') => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="available">Disponibles</SelectItem>
                  <SelectItem value="borrowed">Empruntés</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="unavailable">Indisponibles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prêteur</TableHead>
                <TableHead>Proposé par</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems && filteredItems.length > 0 ? (
                filteredItems.map((item: LoanItem) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>{item.lenderName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{item.proposedBy}</span>
                        <span className="text-xs text-muted-foreground">{item.proposedByEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {item.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateStatus(item.id, 'available')}
                            disabled={updateStatusMutation.isPending}
                            title="Approuver"
                          >
                            <CheckCircle className="h-4 w-4 text-success-dark" />
                          </Button>
                        )}
                        {item.status === 'available' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateStatus(item.id, 'borrowed')}
                            disabled={updateStatusMutation.isPending}
                            title="Marquer comme emprunté"
                          >
                            <XCircle className="h-4 w-4 text-info-dark" />
                          </Button>
                        )}
                        {item.status === 'borrowed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateStatus(item.id, 'available')}
                            disabled={updateStatusMutation.isPending}
                            title="Marquer comme retourné"
                          >
                            <CheckCircle className="h-4 w-4 text-success-dark" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(item)}
                          title="Éditer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id, item.title)}
                          disabled={deleteMutation.isPending}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucun item trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {Math.ceil(total / limit) > 1 && (
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
                Page {page} sur {Math.ceil(total / limit)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page === Math.ceil(total / limit)}
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de création */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un item de prêt</DialogTitle>
            <DialogDescription>
              Remplissez les informations de l'item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Nom de l'item *</Label>
              <Input
                id="title"
                name="name"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Vidéoprojecteur Epson"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée de l'item"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lenderName">Nom du prêteur *</Label>
                <Input
                  id="lenderName"
                  name="lenderName"
                  value={formData.lenderName}
                  onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                  placeholder="Nom de la personne qui prête"
                />
              </div>
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: LoanStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="borrowed">Emprunté</SelectItem>
                    <SelectItem value="unavailable">Indisponible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="proposedBy">Proposé par</Label>
                <Input
                  id="proposedBy"
                  name="proposedBy"
                  value={formData.proposedBy}
                  onChange={(e) => setFormData({ ...formData, proposedBy: e.target.value })}
                  placeholder="Nom (optionnel)"
                />
              </div>
              <div>
                <Label htmlFor="proposedByEmail">Email</Label>
                <Input
                  id="proposedByEmail"
                  name="proposedByEmail"
                  type="email"
                  value={formData.proposedByEmail}
                  onChange={(e) => setFormData({ ...formData, proposedByEmail: e.target.value })}
                  placeholder="email@exemple.com (optionnel)"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="photoUrl">URL de la photo</Label>
              <Input
                id="photoUrl"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button type="submit" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal d'édition */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'item</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Nom de l'item *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Vidéoprojecteur Epson"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée de l'item"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-lenderName">Nom du prêteur *</Label>
                <Input
                  id="edit-lenderName"
                  value={formData.lenderName}
                  onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                  placeholder="Nom de la personne qui prête"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: LoanStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="borrowed">Emprunté</SelectItem>
                    <SelectItem value="unavailable">Indisponible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-photoUrl">URL de la photo</Label>
              <Input
                id="edit-photoUrl"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

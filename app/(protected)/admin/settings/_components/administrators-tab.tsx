'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type ApiResponse, type Administrator, type CreateAdminFormData, type EditAdminFormData } from '@/lib/api/client';
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
import { Loader2, Plus, Pencil, Trash2, Mail, Lock } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrateur",
  ideas_reader: "Lecteur Idées",
  ideas_manager: "Gestionnaire Idées",
  events_reader: "Lecteur Événements",
  events_manager: "Gestionnaire Événements",
};

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Administrateur' },
  { value: 'ideas_reader', label: 'Lecteur Idées' },
  { value: 'ideas_manager', label: 'Gestionnaire Idées' },
  { value: 'events_reader', label: 'Lecteur Événements' },
  { value: 'events_manager', label: 'Gestionnaire Événements' },
];

export function AdministratorsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // État
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrator | null>(null);

  // Formulaires
  const [createForm, setCreateForm] = useState<CreateAdminFormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'ideas_reader',
  });

  const [editForm, setEditForm] = useState<EditAdminFormData>({
    firstName: '',
    lastName: '',
  });

  const [editRole, setEditRole] = useState<string>('');

  // Query - Liste des administrateurs
  const { data: administrators, isLoading } = useQuery({
    queryKey: queryKeys.admin.administrators.list(),
    queryFn: async () => {
      const response = await api.get<ApiResponse<Administrator[]>>('/api/admin/administrators');
      return response;
    },
  });

  // Query - Utilisateur actuel
  const { data: currentUser } = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ email: string }>>('/api/auth/user');
      return response.data;
    },
  });

  // Mutation - Créer un administrateur
  const createMutation = useMutation({
    mutationFn: async (data: CreateAdminFormData) => {
      return api.post<ApiResponse<Administrator>>('/api/admin/administrators', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.administrators.all });
      setCreateDialogOpen(false);
      setCreateForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'ideas_reader',
      });
      toast({
        title: "Administrateur créé",
        description: "Email de réinitialisation envoyé.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation - Modifier les informations
  const updateInfoMutation = useMutation({
    mutationFn: async ({ email, data }: { email: string; data: EditAdminFormData }) => {
      return api.patch<ApiResponse<Administrator>>(`/api/admin/administrators/${email}/info`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.administrators.all });
      toast({
        title: "Administrateur modifié",
        description: "Les informations ont été mises à jour.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation - Modifier le rôle
  const updateRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      return api.patch<ApiResponse<Administrator>>(`/api/admin/administrators/${email}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.administrators.all });
      toast({
        title: "Rôle modifié",
        description: "Le rôle a été mis à jour.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation - Toggle actif/inactif
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ email, isActive }: { email: string; isActive: boolean }) => {
      return api.patch<ApiResponse<Administrator>>(`/api/admin/administrators/${email}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.administrators.all });
      toast({
        title: "Statut modifié",
        description: "Le statut de l'administrateur a été mis à jour.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation - Supprimer un administrateur
  const deleteMutation = useMutation({
    mutationFn: async (email: string) => {
      return api.delete<ApiResponse<void>>(`/api/admin/administrators/${email}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.administrators.all });
      setDeleteAlertOpen(false);
      setSelectedAdmin(null);
      toast({
        title: "Administrateur supprimé",
        description: "L'administrateur a été supprimé avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation - Reset password
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      return api.post<ApiResponse<void>>('/api/auth/forgot-password', { email });
    },
    onSuccess: (_, email) => {
      toast({
        title: "Email envoyé",
        description: `Email de réinitialisation envoyé à ${email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreate = () => {
    createMutation.mutate(createForm);
  };

  const handleEdit = () => {
    if (!selectedAdmin) return;

    // Mettre à jour les informations si changées
    if (
      editForm.firstName !== selectedAdmin.firstName ||
      editForm.lastName !== selectedAdmin.lastName
    ) {
      updateInfoMutation.mutate({
        email: selectedAdmin.email,
        data: editForm,
      });
    }

    // Mettre à jour le rôle si changé
    if (editRole !== selectedAdmin.role) {
      updateRoleMutation.mutate({
        email: selectedAdmin.email,
        role: editRole,
      });
    }

    setEditDialogOpen(false);
    setSelectedAdmin(null);
  };

  const handleDelete = () => {
    if (!selectedAdmin) return;
    deleteMutation.mutate(selectedAdmin.email);
  };

  const handleResetPassword = (email: string) => {
    resetPasswordMutation.mutate(email);
  };

  const handleToggleActive = (admin: Administrator) => {
    toggleActiveMutation.mutate({
      email: admin.email,
      isActive: !admin.isActive,
    });
  };

  const openEditDialog = (admin: Administrator) => {
    setSelectedAdmin(admin);
    setEditForm({
      firstName: admin.firstName,
      lastName: admin.lastName,
    });
    setEditRole(admin.role);
    setEditDialogOpen(true);
  };

  const openDeleteAlert = (admin: Administrator) => {
    setSelectedAdmin(admin);
    setDeleteAlertOpen(true);
  };

  const isCurrentUser = (email: string) => {
    return currentUser?.email === email;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Administrateurs</CardTitle>
              <CardDescription>
                {administrators?.data?.length || 0} administrateur(s)
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : administrators?.data && administrators.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {administrators.data.map((admin) => (
                  <TableRow key={admin.email}>
                    <TableCell className="font-mono text-sm">{admin.email}</TableCell>
                    <TableCell>
                      {admin.firstName} {admin.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ROLE_LABELS[admin.role] || admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.status === 'active' && (
                        <Badge className="bg-success/10 text-success-dark border-success/30">
                          ✓ Actif
                        </Badge>
                      )}
                      {admin.status === 'inactive' && (
                        <Badge variant="secondary">✗ Inactif</Badge>
                      )}
                      {admin.status === 'pending' && (
                        <Badge className="bg-orange-50 text-orange-900 border-orange-200">
                          ○ En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={admin.isActive}
                        onCheckedChange={() => handleToggleActive(admin)}
                        disabled={isCurrentUser(admin.email)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(admin)}
                          disabled={isCurrentUser(admin.email)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPassword(admin.email)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteAlert(admin)}
                          disabled={isCurrentUser(admin.email)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun administrateur
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Create */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
            <DialogDescription>
              Un email de réinitialisation sera envoyé automatiquement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="admin@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-firstName">Prénom</Label>
              <Input
                id="create-firstName"
                placeholder="Jean"
                value={createForm.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-lastName">Nom</Label>
              <Input
                id="create-lastName"
                placeholder="Dupont"
                value={createForm.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Rôle</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
              >
                <SelectTrigger id="create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'administrateur</DialogTitle>
            <DialogDescription>
              Email : {selectedAdmin?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">Prénom</Label>
              <Input
                id="edit-firstName"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Nom</Label>
              <Input
                id="edit-lastName"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rôle</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateInfoMutation.isPending || updateRoleMutation.isPending}
            >
              {(updateInfoMutation.isPending || updateRoleMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Delete */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'administrateur{' '}
              <strong>
                {selectedAdmin?.firstName} {selectedAdmin?.lastName}
              </strong>{' '}
              sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';
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
import { Loader2, Plus, Pencil, Trash2, Check, Clock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  status: string;
}

interface MemberTask {
  id: string;
  memberEmail: string;
  title: string;
  description?: string;
  taskType: 'call' | 'email' | 'meeting' | 'custom';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CreateTaskFormData {
  memberEmail: string;
  title: string;
  description?: string;
  taskType: 'call' | 'email' | 'meeting' | 'custom';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
}

interface EditTaskFormData {
  title?: string;
  description?: string;
  taskType?: 'call' | 'email' | 'meeting' | 'custom';
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
}

const statusLabels: Record<MemberTask['status'], string> = {
  'todo': 'À faire',
  'in_progress': 'En cours',
  'completed': 'Complété',
  'cancelled': 'Annulé',
};

const statusColors: Record<MemberTask['status'], string> = {
  'todo': 'bg-orange-50 text-orange-900 border-orange-200',
  'in_progress': 'bg-blue-50 text-blue-900 border-blue-200',
  'completed': 'bg-green-50 text-green-900 border-green-200',
  'cancelled': 'bg-gray-50 text-gray-900 border-gray-200',
};

const taskTypeLabels: Record<MemberTask['taskType'], string> = {
  'call': 'Appel',
  'email': 'Email',
  'meeting': 'Réunion',
  'custom': 'Autre',
};

/**
 * Page Gestion Tâches Membres
 * Gestion complète des tâches de suivi des membres
 */
export default function AdminMemberTasksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // État local
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MemberTask | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<'all' | MemberTask['status']>('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | MemberTask['taskType']>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Formulaire création
  const [createFormData, setCreateFormData] = useState<CreateTaskFormData>({
    memberEmail: '',
    title: '',
    description: '',
    taskType: 'call',
    status: 'todo',
    dueDate: '',
  });

  // Formulaire édition
  const [editFormData, setEditFormData] = useState<EditTaskFormData>({
    title: '',
    description: '',
    taskType: 'call',
    status: 'todo',
    dueDate: '',
  });

  // Query pour lister tous les membres
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: queryKeys.members.list(),
    queryFn: () => api.get<PaginatedResponse<Member>>('/api/admin/members'),
  });

  // Récupérer les tâches pour chaque membre
  const allMembers = membersData?.data || [];
  const [allTasks, setAllTasks] = useState<MemberTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // Charger les tâches de tous les membres
  const loadAllTasks = async () => {
    setTasksLoading(true);
    try {
      // Fetch tasks in PARALLEL instead of sequential to prevent DB pool exhaustion
      const taskResponses = await Promise.all(
        allMembers.map(member =>
          api.get<{ success: boolean; data: MemberTask[] }>(
            `/api/admin/members/${encodeURIComponent(member.email)}/tasks`
          ).catch(error => {
            console.error(`Erreur lors du chargement des tâches de ${member.email}:`, error);
            return { data: [] };  // Graceful fallback
          })
        )
      );

      const tasks = taskResponses.flatMap(response =>
        response?.data && Array.isArray(response.data) ? response.data : []
      );
      setAllTasks(tasks);
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les tâches',
        variant: 'destructive',
      });
    } finally {
      setTasksLoading(false);
    }
  };

  // Charger les tâches quand les membres sont chargés
  useEffect(() => {
    if (allMembers.length > 0) {
      loadAllTasks();
    }
  }, [allMembers.length]);

  // Mutation pour créer une tâche
  const createMutation = useMutation({
    mutationFn: (data: CreateTaskFormData) =>
      api.post(
        `/api/admin/members/${encodeURIComponent(data.memberEmail)}/tasks`,
        {
          title: data.title,
          description: data.description || undefined,
          taskType: data.taskType,
          status: data.status,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        }
      ),
    onSuccess: () => {
      toast({
        title: 'Tâche créée',
        description: 'La tâche a été créée avec succès',
      });
      loadAllTasks();
      setCreateDialogOpen(false);
      setCreateFormData({
        memberEmail: '',
        title: '',
        description: '',
        taskType: 'call',
        status: 'todo',
        dueDate: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour mettre à jour une tâche
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; formData: EditTaskFormData }) =>
      api.patch(`/api/admin/tasks/${data.id}`, {
        title: data.formData.title || undefined,
        description: data.formData.description || undefined,
        taskType: data.formData.taskType || undefined,
        status: data.formData.status || undefined,
        dueDate: data.formData.dueDate
          ? new Date(data.formData.dueDate).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Tâche modifiée',
        description: 'La tâche a été modifiée avec succès',
      });
      loadAllTasks();
      setEditDialogOpen(false);
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour supprimer une tâche
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/tasks/${id}`),
    onSuccess: () => {
      toast({
        title: 'Tâche supprimée',
        description: 'La tâche a été supprimée avec succès',
      });
      loadAllTasks();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour marquer comme complété
  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/admin/tasks/${id}`, { status: 'completed' }),
    onSuccess: () => {
      toast({
        title: 'Tâche complétée',
        description: 'La tâche a été marquée comme complétée',
      });
      loadAllTasks();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filtrer les tâches
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesTaskType = taskTypeFilter === 'all' || task.taskType === taskTypeFilter;
      const matchesMember = memberFilter === 'all' || task.memberEmail === memberFilter;
      const matchesSearch =
        search === '' ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase()) ||
        task.memberEmail.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesTaskType && matchesMember && matchesSearch;
    });
  }, [allTasks, statusFilter, taskTypeFilter, memberFilter, search]);

  const handleOpenCreateDialog = () => {
    setCreateFormData({
      memberEmail: '',
      title: '',
      description: '',
      taskType: 'call',
      status: 'todo',
      dueDate: '',
    });
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleOpenEditDialog = (task: MemberTask) => {
    setSelectedTask(task);
    setEditFormData({
      title: task.title,
      description: task.description,
      taskType: task.taskType,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedTask(null);
  };

  const handleSaveCreate = () => {
    // Validation
    if (!createFormData.memberEmail.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un membre',
        variant: 'destructive',
      });
      return;
    }

    if (!createFormData.title.trim() || createFormData.title.trim().length < 3) {
      toast({
        title: 'Erreur',
        description: 'Le titre doit contenir au moins 3 caractères',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(createFormData);
  };

  const handleSaveEdit = () => {
    if (!selectedTask) return;

    if (editFormData.title && editFormData.title.trim().length < 3) {
      toast({
        title: 'Erreur',
        description: 'Le titre doit contenir au least 3 caractères',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({
      id: selectedTask.id,
      formData: editFormData,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleMarkCompleted = (id: string) => {
    completeMutation.mutate(id);
  };

  const isLoading = membersLoading || tasksLoading;

  if (isLoading && allMembers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tâches de Suivi</h1>
          <p className="text-muted-foreground">
            Gestion des tâches de suivi des membres
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une tâche
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des tâches</CardTitle>
          <CardDescription>
            {filteredTasks.length} tâche{filteredTasks.length !== 1 ? 's' : ''} affichée{filteredTasks.length !== 1 ? 's' : ''}
          </CardDescription>

          {/* Filtres */}
          <div className="flex flex-col gap-4 mt-6">
            {/* Recherche */}
            <div className="relative max-w-sm">
              <Input
                placeholder="Rechercher par titre, description, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-4">
              {/* Filtre Statut */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Statut</Label>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="todo">À faire</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="completed">Complété</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtre Type de tâche */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                <Select value={taskTypeFilter} onValueChange={(val) => setTaskTypeFilter(val as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="call">Appel</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Réunion</SelectItem>
                    <SelectItem value="custom">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtre Membre */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Membre</Label>
                <Select value={memberFilter} onValueChange={setMemberFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les membres</SelectItem>
                    {allMembers.map((member) => (
                      <SelectItem key={member.email} value={member.email}>
                        {member.firstName} {member.lastName} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Membre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                  const isOverdue =
                    dueDate &&
                    dueDate < new Date() &&
                    task.status !== 'completed' &&
                    task.status !== 'cancelled';

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {allMembers.find((m) => m.email === task.memberEmail)
                              ? `${
                                  allMembers.find((m) => m.email === task.memberEmail)?.firstName
                                } ${allMembers.find((m) => m.email === task.memberEmail)?.lastName}`
                              : task.memberEmail}
                          </div>
                          <div className="text-xs text-muted-foreground">{task.memberEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{taskTypeLabels[task.taskType]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[task.status]}>
                          {statusLabels[task.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dueDate ? (
                          <div className="flex items-center gap-2">
                            {isOverdue && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {dueDate.toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {task.status !== 'completed' && task.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkCompleted(task.id)}
                              disabled={completeMutation.isPending}
                              title="Marquer comme complété"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(task)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(task.id)}
                            disabled={deleteMutation.isPending}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {allTasks.length === 0
                      ? 'Aucune tâche n\'existe actuellement'
                      : 'Aucune tâche ne correspond à vos filtres'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Créer une tâche */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer une tâche</DialogTitle>
            <DialogDescription>
              Créez une nouvelle tâche de suivi pour un membre
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sélectionner un membre */}
            <div className="space-y-2">
              <Label htmlFor="create-member">Membre *</Label>
              <Select
                value={createFormData.memberEmail}
                onValueChange={(value) =>
                  setCreateFormData((prev) => ({ ...prev, memberEmail: value }))
                }
              >
                <SelectTrigger id="create-member">
                  <SelectValue placeholder="Sélectionner un membre" />
                </SelectTrigger>
                <SelectContent>
                  {allMembers.map((member) => (
                    <SelectItem key={member.email} value={member.email}>
                      {member.firstName} {member.lastName} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="create-title">Titre *</Label>
              <Input
                id="create-title"
                placeholder="Appeler le client..."
                value={createFormData.title}
                onChange={(e) =>
                  setCreateFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum 3 caractères
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                placeholder="Détails supplémentaires..."
                value={createFormData.description}
                onChange={(e) =>
                  setCreateFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {/* Type de tâche */}
            <div className="space-y-2">
              <Label htmlFor="create-taskType">Type de tâche</Label>
              <Select
                value={createFormData.taskType}
                onValueChange={(value) =>
                  setCreateFormData((prev) => ({ ...prev, taskType: value as any }))
                }
              >
                <SelectTrigger id="create-taskType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Appel</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Réunion</SelectItem>
                  <SelectItem value="custom">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Statut */}
            <div className="space-y-2">
              <Label htmlFor="create-status">Statut</Label>
              <Select
                value={createFormData.status}
                onValueChange={(value) =>
                  setCreateFormData((prev) => ({ ...prev, status: value as any }))
                }
              >
                <SelectTrigger id="create-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">À faire</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Échéance */}
            <div className="space-y-2">
              <Label htmlFor="create-dueDate">Échéance</Label>
              <Input
                id="create-dueDate"
                type="date"
                value={createFormData.dueDate}
                onChange={(e) =>
                  setCreateFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                }
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
            <Button onClick={handleSaveCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier une tâche */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de la tâche
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              {/* Membre (non modifiable) */}
              <div className="space-y-2">
                <Label>Membre</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium">
                      {allMembers.find((m) => m.email === selectedTask.memberEmail)
                        ? `${
                            allMembers.find((m) => m.email === selectedTask.memberEmail)?.firstName
                          } ${allMembers.find((m) => m.email === selectedTask.memberEmail)?.lastName}`
                        : selectedTask.memberEmail}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedTask.memberEmail}
                    </div>
                  </div>
                </div>
              </div>

              {/* Titre */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">Titre</Label>
                <Input
                  id="edit-title"
                  placeholder="Titre de la tâche"
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Détails supplémentaires..."
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              {/* Type de tâche */}
              <div className="space-y-2">
                <Label htmlFor="edit-taskType">Type de tâche</Label>
                <Select
                  value={editFormData.taskType}
                  onValueChange={(value) =>
                    setEditFormData((prev) => ({ ...prev, taskType: value as any }))
                  }
                >
                  <SelectTrigger id="edit-taskType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Appel</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Réunion</SelectItem>
                    <SelectItem value="custom">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Statut */}
              <div className="space-y-2">
                <Label htmlFor="edit-status">Statut</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) =>
                    setEditFormData((prev) => ({ ...prev, status: value as any }))
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">À faire</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="completed">Complété</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Échéance */}
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Échéance</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, dueDate: e.target.value }))
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
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

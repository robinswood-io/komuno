'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Bug, Sparkles, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { api, type ApiResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

type RequestType = 'bug' | 'feature';
type RequestPriority = 'low' | 'medium' | 'high' | 'critical';
type RequestStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

interface DevelopmentRequest {
  id: string;
  type: RequestType;
  title: string;
  description: string;
  priority: RequestPriority;
  status: RequestStatus;
  createdAt?: string;
  githubIssueNumber?: number | null;
  githubIssueUrl?: string | null;
  githubStatus?: string | null;
  lastSyncedAt?: string | null;
}

interface CreateRequestPayload {
  type: RequestType;
  title: string;
  description: string;
  priority: RequestPriority;
}

interface UpdateRequestPayload extends CreateRequestPayload {
  id: string;
}

export default function AdminDevelopmentRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DevelopmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<DevelopmentRequest | null>(null);
  const [formData, setFormData] = useState<CreateRequestPayload>({
    type: 'bug',
    title: '',
    description: '',
    priority: 'medium',
  });
  const [editFormData, setEditFormData] = useState<UpdateRequestPayload>({
    id: '',
    type: 'bug',
    title: '',
    description: '',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const statusOptions = useMemo<RequestStatus[]>(
    () => ['pending', 'in_progress', 'done', 'cancelled'],
    []
  );

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<ApiResponse<DevelopmentRequest[]>>('/api/admin/development-requests', {
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      if (response.success) {
        setRequests(response.data);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de charger les demandes';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast, typeFilter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleStatusChange = async (id: string, nextStatus: RequestStatus) => {
    setActionLoadingId(id);
    try {
      const response = await api.patch<ApiResponse<DevelopmentRequest>>(
        `/api/admin/development-requests/${id}/status`,
        { status: nextStatus }
      );
      if (response.success) {
        setRequests((prev) =>
          prev.map((request) => (request.id === id ? response.data : request))
        );
        toast({
          title: 'Statut mis à jour',
          description: `Statut changé en ${nextStatus}.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour le statut';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSyncGitHub = async (id: string) => {
    setActionLoadingId(id);
    try {
      const response = await api.post<ApiResponse<DevelopmentRequest>>(
        `/api/admin/development-requests/${id}/sync`
      );
      if (response.success) {
        setRequests((prev) =>
          prev.map((request) => (request.id === id ? response.data : request))
        );
        toast({
          title: 'Synchronisation GitHub',
          description: 'Le ticket a été synchronisé.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de synchroniser avec GitHub';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    setActionLoadingId(id);
    try {
      const response = await api.delete<ApiResponse<{ success: boolean }>>(
        `/api/admin/development-requests/${id}`
      );
      if (response.success) {
        setRequests((prev) => prev.filter((request) => request.id !== id));
        toast({
          title: 'Demande supprimée',
          description: 'La demande a été supprimée.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de supprimer la demande';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Champs manquants',
        description: 'Merci de compléter le titre et la description.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<ApiResponse<DevelopmentRequest>>(
        '/api/admin/development-requests',
        formData
      );
      if (response.success) {
        setRequests((prev) => [response.data, ...prev]);
        setIsDialogOpen(false);
        setFormData({
          type: 'bug',
          title: '',
          description: '',
          priority: 'medium',
        });
        toast({
          title: 'Demande créée',
          description: 'La demande de développement a été enregistrée.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de créer la demande';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (request: DevelopmentRequest) => {
    setEditRequest(request);
    setEditFormData({
      id: request.id,
      type: request.type,
      title: request.title,
      description: request.description,
      priority: request.priority,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!editRequest) {
      return;
    }

    if (!editFormData.title.trim() || !editFormData.description.trim()) {
      toast({
        title: 'Champs manquants',
        description: 'Merci de compléter le titre et la description.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await api.put<ApiResponse<DevelopmentRequest>>(
        `/api/admin/development-requests/${editRequest.id}`,
        {
          title: editFormData.title,
          description: editFormData.description,
          type: editFormData.type,
          priority: editFormData.priority,
        }
      );

      if (response.success) {
        setRequests((prev) =>
          prev.map((request) => (request.id === editRequest.id ? response.data : request))
        );
        setIsEditDialogOpen(false);
        setEditRequest(null);
        toast({
          title: 'Demande mise à jour',
          description: 'La demande a été mise à jour.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour la demande';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demandes de développement</h1>
          <p className="text-muted-foreground">
            Centralisez les bugs et fonctionnalités à synchroniser avec GitHub.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des demandes</CardTitle>
          <CardDescription>Suivi des tickets ouverts et en cours.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="grid gap-2">
                <Label htmlFor="type-filter">Type</Label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as RequestType | 'all')}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Tous</option>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status-filter">Statut</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as RequestStatus | 'all')}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Tous</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button variant="outline" onClick={() => void loadRequests()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rafraîchir
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande disponible.</p>
          ) : (
            <div className="overflow-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Titre</th>
                    <th className="px-3 py-2 text-left font-medium">Priorité</th>
                    <th className="px-3 py-2 text-left font-medium">Statut</th>
                    <th className="px-3 py-2 text-left font-medium">GitHub</th>
                    <th className="px-3 py-2 text-left font-medium">Créée le</th>
                    <th className="px-3 py-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {request.type === 'bug' ? (
                            <Bug className="h-4 w-4 text-destructive" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-emerald-500" />
                          )}
                          {request.type}
                        </div>
                      </td>
                      <td className="px-3 py-2">{request.title}</td>
                      <td className="px-3 py-2">
                        <Badge variant={request.priority === 'critical' ? 'destructive' : 'secondary'}>
                          {request.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          aria-label="Statut demande"
                          value={request.status}
                          onChange={(event) =>
                            handleStatusChange(request.id, event.target.value as RequestStatus)
                          }
                          className="h-9 rounded-md border border-input bg-background px-2 py-1 text-xs"
                          disabled={actionLoadingId === request.id}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {request.githubIssueUrl ? (
                          <a
                            href={request.githubIssueUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            #{request.githubIssueNumber ?? 'issue'}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {request.githubStatus ? (
                          <Badge variant="outline" className="ml-2">
                            {request.githubStatus}
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleSyncGitHub(request.id)}
                            disabled={!request.githubIssueNumber || actionLoadingId === request.id}
                          >
                            {actionLoadingId === request.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            Sync
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(request)}
                            disabled={actionLoadingId === request.id}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDeleteRequest(request.id)}
                            disabled={actionLoadingId === request.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nouvelle demande</DialogTitle>
            <DialogDescription>
              Décrivez le bug ou la fonctionnalité à ajouter.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="request-type">Type</Label>
              <select
                id="request-type"
                name="type"
                value={formData.type}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, type: event.target.value as RequestType }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="request-title">Titre</Label>
              <Input
                id="request-title"
                name="title"
                value={formData.title}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="request-description">Description</Label>
              <Textarea
                id="request-description"
                name="description"
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="request-priority">Priorité</Label>
              <select
                id="request-priority"
                name="priority"
                value={formData.priority}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, priority: event.target.value as RequestPriority }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Modifier la demande</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de la demande sélectionnée.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-request-type">Type</Label>
              <select
                id="edit-request-type"
                name="type"
                value={editFormData.type}
                onChange={(event) =>
                  setEditFormData((prev) => ({ ...prev, type: event.target.value as RequestType }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-request-title">Titre</Label>
              <Input
                id="edit-request-title"
                name="title"
                value={editFormData.title}
                onChange={(event) =>
                  setEditFormData((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-request-description">Description</Label>
              <Textarea
                id="edit-request-description"
                name="description"
                value={editFormData.description}
                onChange={(event) =>
                  setEditFormData((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-request-priority">Priorité</Label>
              <select
                id="edit-request-priority"
                name="priority"
                value={editFormData.priority}
                onChange={(event) =>
                  setEditFormData((prev) => ({ ...prev, priority: event.target.value as RequestPriority }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void handleUpdateSubmit()} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

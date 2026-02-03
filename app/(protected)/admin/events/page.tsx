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
import { Loader2, Plus, Pencil, Trash2, Users, Calendar, MapPin } from 'lucide-react';
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

type EventStatus = 'draft' | 'published' | 'cancelled' | 'postponed' | 'completed';

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  maxParticipants?: number;
  helloAssoLink?: string;
  status: EventStatus;
  inscriptionCount?: number;
  showInscriptionsCount?: boolean;
  showAvailableSeats?: boolean;
}

interface Inscription {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  createdAt: string;
}

/**
 * Page Gestion Événements Admin
 * CRUD complet sur les événements avec gestion des inscriptions
 */
export default function AdminEventsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInscriptionsModal, setShowInscriptionsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    maxParticipants: '',
    helloAssoLink: '',
    status: 'published' as EventStatus,
    showInscriptionsCount: true,
    showAvailableSeats: true,
  });

  // Query pour lister les événements
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.events.list({ page, limit: 20 }),
    queryFn: () => api.get<PaginatedResponse<Event>>('/api/admin/events', { page, limit: 20 }),
  });

  // Query pour les inscriptions d'un événement
  const { data: inscriptions } = useQuery({
    queryKey: queryKeys.events.inscriptions(selectedEvent?.id || ''),
    queryFn: () => api.get<Inscription[]>(`/api/events/${selectedEvent?.id}/inscriptions`),
    enabled: !!selectedEvent && showInscriptionsModal,
  });

  // Mutation pour créer un événement
  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      date: string;
      location?: string;
      maxParticipants?: number;
      helloAssoLink?: string;
      status: EventStatus;
      showInscriptionsCount?: boolean;
      showAvailableSeats?: boolean;
    }) => api.post('/api/events', data),
    onSuccess: () => {
      toast({
        title: 'Événement créé',
        description: 'L\'événement a été créé avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
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

  // Mutation pour mettre à jour un événement
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) =>
      api.put(`/api/events/${id}`, data),
    onSuccess: () => {
      toast({
        title: 'Événement mis à jour',
        description: 'L\'événement a été modifié avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      setShowEditModal(false);
      setSelectedEvent(null);
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

  // Mutation pour supprimer un événement
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/events/${id}`),
    onSuccess: () => {
      toast({
        title: 'Événement supprimé',
        description: 'L\'événement a été supprimé avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
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
      date: '',
      location: '',
      maxParticipants: '',
      helloAssoLink: '',
      status: 'published',
      showInscriptionsCount: true,
      showAvailableSeats: true,
    });
  };

  const handleCreate = () => {
    if (!formData.title || !formData.date) {
      toast({
        title: 'Erreur',
        description: 'Le titre et la date sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      date: new Date(formData.date).toISOString(),
      location: formData.location || undefined,
      maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
      helloAssoLink: formData.helloAssoLink || undefined,
      status: formData.status,
      showInscriptionsCount: formData.showInscriptionsCount,
      showAvailableSeats: formData.showAvailableSeats,
    });
  };

  const handleEdit = () => {
    if (!selectedEvent) return;

    updateMutation.mutate({
      id: selectedEvent.id,
      data: {
        title: formData.title,
        description: formData.description || undefined,
        date: new Date(formData.date).toISOString(),
        location: formData.location || undefined,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
        helloAssoLink: formData.helloAssoLink || undefined,
        status: formData.status,
        showInscriptionsCount: formData.showInscriptionsCount,
        showAvailableSeats: formData.showAvailableSeats,
      },
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${title}" ?`)) {
      deleteMutation.mutate(id);
    }
  };

  const openEditModal = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      date: new Date(event.date).toISOString().slice(0, 16),
      location: event.location || '',
      maxParticipants: event.maxParticipants?.toString() || '',
      helloAssoLink: event.helloAssoLink || '',
      status: event.status,
      showInscriptionsCount: event.showInscriptionsCount ?? true,
      showAvailableSeats: event.showAvailableSeats ?? true,
    });
    setShowEditModal(true);
  };

  const openInscriptionsModal = (event: Event) => {
    setSelectedEvent(event);
    setShowInscriptionsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-success-light text-success-dark border-success/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      case 'cancelled':
        return 'bg-error-light text-error-dark border-error/20';
      case 'postponed':
        return 'bg-warning-light text-warning-dark border-warning/20';
      case 'completed':
        return 'bg-info-light text-info-dark border-info/20';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return 'Publié';
      case 'draft':
        return 'Brouillon';
      case 'cancelled':
        return 'Annulé';
      case 'postponed':
        return 'Reporté';
      case 'completed':
        return 'Terminé';
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
            <CardDescription>Impossible de charger les événements</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract data with proper type narrowing
  const events = (data && 'data' in data ? data.data : []) as Event[];
  const total = (data && 'total' in data ? data.total : 0) as number;
  const limit = (data && 'limit' in data ? data.limit : 20) as number;

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Événements</h1>
          <p className="text-muted-foreground">
            Créez et gérez les événements de l'association
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Créer un événement
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
            <CardTitle className="text-sm font-medium">Publiés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-dark">
              {events.filter((e: Event) => e.status === 'published').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.reduce((sum: number, e: Event) => sum + (e.inscriptionCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">À venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-dark">
              {events.filter((e: Event) => new Date(e.date) > new Date()).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="events-list">
        <CardHeader>
          <CardTitle>Liste des événements</CardTitle>
          <CardDescription>
            {total} événement(s) au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table data-testid="events-table">
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead>Inscriptions</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length > 0 ? (
                events.map((event: Event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex flex-col gap-1">
                        <span>{event.title}</span>
                        {event.description ? (
                          <p className="event-description text-xs text-muted-foreground whitespace-pre-line">
                            {event.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(event.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{event.location}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInscriptionsModal(event)}
                        className="flex items-center gap-2"
                        title="Gérer les inscriptions"
                        data-testid="event-inscriptions-button"
                      >
                        <Users className="h-4 w-4" />
                        <span>{event.inscriptionCount || 0}</span>
                        {event.maxParticipants && (
                          <span className="text-muted-foreground">/ {event.maxParticipants}</span>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(event.status)}>
                        {getStatusLabel(event.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(event)}
                          title="Éditer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id, event.title)}
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
                    Aucun événement trouvé
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
            <DialogTitle>Créer un événement</DialogTitle>
            <DialogDescription>
              Remplissez les informations de l'événement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'événement"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de l'événement"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date et heure *</Label>
                <Input
                  id="date"
                  name="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="location">Lieu</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Lieu de l'événement"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxParticipants">Nombre max de participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  placeholder="Illimité si vide"
                />
              </div>
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: EventStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="postponed">Reporté</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="helloAssoLink">Lien HelloAsso</Label>
              <Input
                id="helloAssoLink"
                value={formData.helloAssoLink}
                onChange={(e) => setFormData({ ...formData, helloAssoLink: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-3 border-t pt-4">
              <Label className="font-semibold">Affichage public</Label>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="showInscriptionsCount"
                  checked={formData.showInscriptionsCount ?? true}
                  onChange={(e) => setFormData({ ...formData, showInscriptionsCount: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="showInscriptionsCount" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Afficher le nombre d'inscrits publiquement
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="showAvailableSeats"
                  checked={formData.showAvailableSeats ?? true}
                  onChange={(e) => setFormData({ ...formData, showAvailableSeats: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="showAvailableSeats" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Afficher le nombre de places disponibles
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
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
            <DialogTitle>Modifier l'événement</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'événement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Titre *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'événement"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de l'événement"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Date et heure *</Label>
                <Input
                  id="edit-date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Lieu</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Lieu de l'événement"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-maxParticipants">Nombre max de participants</Label>
                <Input
                  id="edit-maxParticipants"
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  placeholder="Illimité si vide"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: EventStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="postponed">Reporté</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-helloAssoLink">Lien HelloAsso</Label>
              <Input
                id="edit-helloAssoLink"
                value={formData.helloAssoLink}
                onChange={(e) => setFormData({ ...formData, helloAssoLink: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-3 border-t pt-4">
              <Label className="font-semibold">Affichage public</Label>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="edit-showInscriptionsCount"
                  checked={formData.showInscriptionsCount ?? true}
                  onChange={(e) => setFormData({ ...formData, showInscriptionsCount: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="edit-showInscriptionsCount" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Afficher le nombre d'inscrits publiquement
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="edit-showAvailableSeats"
                  checked={formData.showAvailableSeats ?? true}
                  onChange={(e) => setFormData({ ...formData, showAvailableSeats: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="edit-showAvailableSeats" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Afficher le nombre de places disponibles
                </label>
              </div>
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

      {/* Modal des inscriptions */}
      <Dialog open={showInscriptionsModal} onOpenChange={setShowInscriptionsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Inscriptions - {selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {inscriptions && Array.isArray(inscriptions) ? inscriptions.length : 0} inscription(s)
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {inscriptions && Array.isArray(inscriptions) && inscriptions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inscriptions.map((inscription: Inscription) => (
                    <TableRow key={inscription.id}>
                      <TableCell className="font-medium">{inscription.name}</TableCell>
                      <TableCell>{inscription.email}</TableCell>
                      <TableCell>{inscription.company || '-'}</TableCell>
                      <TableCell>{inscription.phone || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inscription.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucune inscription pour le moment
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

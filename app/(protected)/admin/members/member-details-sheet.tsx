'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Phone, Building2, Briefcase, UserCircle, Calendar, TrendingUp, Pencil, Trash2, UserCheck, Plus, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  engagementScore?: number;
  phone?: string;
  role?: string;
  cjdRole?: string;
  notes?: string;
  proposedBy?: string;
  createdAt?: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  date: string;
}

interface Subscription {
  id: number;
  amountInCents: number;
  startDate: string;
  endDate: string;
  subscriptionType?: string;
  status?: string;
  paymentMethod?: string;
}

interface MemberContact {
  id: string;
  memberEmail: string;
  type: 'meeting' | 'email' | 'call' | 'lunch' | 'event';
  subject: string;
  date: string;
  startTime?: string;
  duration?: number;
  description: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

interface MemberDetailsData {
  member: Member;
  tags: Array<{ id: string; name: string; color?: string }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string;
    dueDate?: string;
  }>;
  relations: Array<{
    id: string;
    relationType: string;
    relatedMemberEmail: string;
    relatedMemberName?: string;
  }>;
  subscriptions: Array<Subscription>;
}

interface MemberDetailsSheetProps {
  email: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (member: Member) => void;
  onDelete?: (email: string) => void;
  onConvertToActive?: (email: string) => void;
  isConvertingToActive?: boolean;
  isDeletingMember?: boolean;
}

const CONTACT_TYPE_CONFIG: Record<MemberContact['type'], { label: string; className: string }> = {
  meeting: { label: 'Réunion', className: 'bg-blue-100 text-blue-800' },
  call: { label: 'Appel', className: 'bg-green-100 text-green-800' },
  email: { label: 'Email', className: 'bg-gray-100 text-gray-800' },
  lunch: { label: 'Déjeuner', className: 'bg-orange-100 text-orange-800' },
  event: { label: 'Événement', className: 'bg-purple-100 text-purple-800' },
};

interface NewContactForm {
  type: MemberContact['type'] | '';
  subject: string;
  date: string;
  duration: string;
  description: string;
  notes: string;
}

export function MemberDetailsSheet({
  email,
  open,
  onClose,
  onEdit,
  onDelete,
  onConvertToActive,
  isConvertingToActive = false,
  isDeletingMember = false,
}: MemberDetailsSheetProps) {
  const queryClient = useQueryClient();
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState<NewContactForm>({
    type: '',
    subject: '',
    date: '',
    duration: '',
    description: '',
    notes: '',
  });

  const detailsQuery = useQuery({
    queryKey: queryKeys.members.detail(email || ''),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MemberDetailsData }>(
        `/api/admin/members/${encodeURIComponent(email!)}/details`
      );
      return response;
    },
    enabled: !!email && open,
  });

  const activitiesQuery = useQuery({
    queryKey: [...queryKeys.members.detail(email || ''), 'activities'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Activity[] }>(
        `/api/admin/members/${encodeURIComponent(email!)}/activities`
      );
      return response;
    },
    enabled: !!email && open,
  });

  const contactsQuery = useQuery({
    queryKey: [...queryKeys.members.detail(email || ''), 'contacts'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MemberContact[] }>(
        `/api/admin/members/${encodeURIComponent(email!)}/contacts`
      );
      return response;
    },
    enabled: !!email && open,
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: { type: MemberContact['type']; subject: string; date: string; description: string; duration?: number; notes?: string }) => {
      return await api.post<{ success: boolean; data: MemberContact }>(
        `/api/admin/members/${encodeURIComponent(email!)}/contacts`,
        data
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.members.detail(email || ''), 'contacts'] });
      setIsAddContactOpen(false);
      setNewContact({ type: '', subject: '', date: '', duration: '', description: '', notes: '' });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      return await api.delete<void>(`/api/admin/member-contacts/${contactId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.members.detail(email || ''), 'contacts'] });
    },
  });

  const details = detailsQuery.data?.data;
  const member = details?.member;
  const activities = activitiesQuery.data?.data || [];
  const contacts = contactsQuery.data?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success-dark">Actif</Badge>;
      case 'proposed':
        return <Badge className="bg-orange-50 text-orange-700">Prospect</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactif</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAddContact = () => {
    if (!newContact.type || !newContact.subject || !newContact.date || !newContact.description) return;

    createContactMutation.mutate({
      type: newContact.type as MemberContact['type'],
      subject: newContact.subject,
      date: newContact.date,
      description: newContact.description,
      notes: newContact.notes || undefined,
      duration: newContact.duration ? parseInt(newContact.duration, 10) : undefined,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="member-details-sheet">
        {detailsQuery.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : member ? (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-2xl">
                    {member.firstName} {member.lastName}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-2">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </SheetDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    {member.status === 'proposed' && onConvertToActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onConvertToActive(member.email)}
                        disabled={isConvertingToActive}
                        className="text-success hover:text-success-dark hover:bg-success/10"
                      >
                        {isConvertingToActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Convertir
                          </>
                        )}
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
                            onDelete(member.email);
                          }
                        }}
                        disabled={isDeletingMember}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <span data-testid="member-status-badge">{getStatusBadge(member.status)}</span>
                  {member.engagementScore !== undefined && (
                    <Badge variant="outline" className="gap-1" data-testid="member-engagement-score-badge">
                      <TrendingUp className="h-3 w-3" />
                      Score: {member.engagementScore}
                    </Badge>
                  )}
                </div>
              </div>
            </SheetHeader>

            <Separator className="my-6" />

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Entreprise:</span>
                    <span>{member.company}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Téléphone:</span>
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.role && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Fonction:</span>
                    <span>{member.role}</span>
                  </div>
                )}
                {member.cjdRole && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Rôle CJD:</span>
                    <span>{member.cjdRole}</span>
                  </div>
                )}
                {member.proposedBy && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Proposé par:</span>
                    <span>{member.proposedBy}</span>
                  </div>
                )}
                {member.createdAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Membre depuis:</span>
                    <span>{new Date(member.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {member.notes && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes}</p>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="subscriptions" className="w-full">
              <TabsList className="grid w-full grid-cols-5" data-testid="member-details-tabs">
                <TabsTrigger value="subscriptions" data-testid="member-details-tab-subscriptions">Cotisations</TabsTrigger>
                <TabsTrigger value="interactions" data-testid="member-details-tab-interactions">Interactions</TabsTrigger>
                <TabsTrigger value="tags" data-testid="member-details-tab-tags">Tags</TabsTrigger>
                <TabsTrigger value="tasks" data-testid="member-details-tab-tasks">Tâches</TabsTrigger>
                <TabsTrigger value="activities" data-testid="member-details-tab-activities">Activités</TabsTrigger>
              </TabsList>

              <TabsContent value="subscriptions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cotisations</CardTitle>
                    <CardDescription>
                      {details?.subscriptions?.length || 0} cotisation(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {details?.subscriptions && details.subscriptions.length > 0 ? (
                      <div className="space-y-3">
                        {details.subscriptions.map((sub) => (
                          <div key={sub.id} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">
                                  {(sub.amountInCents / 100).toFixed(2)} €
                                </p>
                                {sub.subscriptionType && (
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {sub.subscriptionType}
                                  </p>
                                )}
                              </div>
                              {sub.status && (
                                <Badge variant={sub.status === 'active' ? 'default' : 'outline'}>
                                  {sub.status}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Du {new Date(sub.startDate).toLocaleDateString('fr-FR')} au{' '}
                              {new Date(sub.endDate).toLocaleDateString('fr-FR')}
                            </div>
                            {sub.paymentMethod && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Paiement: {sub.paymentMethod}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune cotisation enregistrée</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="interactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Interactions</CardTitle>
                        <CardDescription>
                          {contacts.length} interaction(s) enregistrée(s)
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsAddContactOpen(true)}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {contactsQuery.isLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : contacts.length > 0 ? (
                      <div className="space-y-3">
                        {contacts.map((contact) => {
                          const config = CONTACT_TYPE_CONFIG[contact.type];
                          return (
                            <div key={contact.id} className="border rounded-lg p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <Badge className={config.className}>
                                    {config.label}
                                  </Badge>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{contact.subject}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(contact.date).toLocaleDateString('fr-FR')}
                                      {contact.duration ? ` — ${contact.duration} min` : ''}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 ml-2"
                                  onClick={() => {
                                    if (confirm('Supprimer cette interaction ?')) {
                                      deleteContactMutation.mutate(contact.id);
                                    }
                                  }}
                                  disabled={deleteContactMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                                {contact.description}
                              </p>
                              {contact.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic border-t pt-1">
                                  {contact.notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Aucune interaction enregistrée</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tags" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tags</CardTitle>
                    <CardDescription>
                      {details?.tags?.length || 0} tag(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {details?.tags && details.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {details.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color }}>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun tag assigné</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tâches de suivi</CardTitle>
                    <CardDescription>
                      {details?.tasks?.length || 0} tâche(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {details?.tasks && details.tasks.length > 0 ? (
                      <div className="space-y-3">
                        {details.tasks.map((task) => (
                          <div key={task.id} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <p className="font-medium">{task.title}</p>
                              <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>
                                {task.status}
                              </Badge>
                            </div>
                            {task.dueDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Échéance: {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune tâche de suivi</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activities" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Historique d&apos;activité</CardTitle>
                    <CardDescription>
                      {activities.length} activité(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activitiesQuery.isLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : activities.length > 0 ? (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="border-l-2 border-primary pl-3 py-2">
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.date).toLocaleString('fr-FR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune activité enregistrée</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Membre non trouvé</p>
          </div>
        )}
      </SheetContent>

      {/* Dialog Ajouter une interaction */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle interaction</DialogTitle>
            <DialogDescription>
              Enregistrer une interaction avec ce membre
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-type">Type *</Label>
              <Select
                value={newContact.type}
                onValueChange={(val) => setNewContact(prev => ({ ...prev, type: val as MemberContact['type'] }))}
              >
                <SelectTrigger id="contact-type">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Appel</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Réunion</SelectItem>
                  <SelectItem value="lunch">Déjeuner</SelectItem>
                  <SelectItem value="event">Événement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-subject">Sujet *</Label>
              <Input
                id="contact-subject"
                placeholder="Ex: Appel de suivi cotisation"
                value={newContact.subject}
                onChange={(e) => setNewContact(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contact-date">Date *</Label>
                <Input
                  id="contact-date"
                  type="date"
                  value={newContact.date}
                  onChange={(e) => setNewContact(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-duration">Durée (min)</Label>
                <Input
                  id="contact-duration"
                  type="number"
                  min="0"
                  placeholder="Ex: 30"
                  value={newContact.duration}
                  onChange={(e) => setNewContact(prev => ({ ...prev, duration: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-description">Description *</Label>
              <Textarea
                id="contact-description"
                placeholder="Description de l'interaction..."
                rows={3}
                value={newContact.description}
                onChange={(e) => setNewContact(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-notes">Notes (optionnel)</Label>
              <Textarea
                id="contact-notes"
                placeholder="Notes additionnelles..."
                rows={2}
                value={newContact.notes}
                onChange={(e) => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddContactOpen(false)}
              disabled={createContactMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddContact}
              disabled={
                createContactMutation.isPending ||
                !newContact.type ||
                !newContact.subject ||
                !newContact.date ||
                !newContact.description
              }
            >
              {createContactMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

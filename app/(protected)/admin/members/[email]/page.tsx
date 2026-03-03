'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Phone, Building2, Briefcase, UserCircle, Calendar, TrendingUp, Pencil, Trash2, UserCheck, ArrowLeft, Link2, Plus, Trash } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { NetworkSection } from '@/components/network/NetworkSection';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

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

interface MemberContact {
  id: string;
  memberEmail: string;
  type: 'meeting' | 'email' | 'call' | 'lunch' | 'event';
  subject: string;
  date: string;
  duration?: number;
  description: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

const CONTACT_TYPE_CONFIG: Record<MemberContact['type'], { label: string; className: string }> = {
  meeting: { label: 'Réunion', className: 'bg-blue-100 text-blue-800' },
  call: { label: 'Appel', className: 'bg-green-100 text-green-800' },
  email: { label: 'Email', className: 'bg-gray-100 text-gray-800' },
  lunch: { label: 'Déjeuner', className: 'bg-orange-100 text-orange-800' },
  event: { label: 'Événement', className: 'bg-purple-100 text-purple-800' },
};

export default function MemberDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const { email } = use(params);
  const decodedEmail = decodeURIComponent(email);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addInteractionOpen, setAddInteractionOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: 'call' as MemberContact['type'],
    subject: '',
    date: new Date().toISOString().split('T')[0],
    duration: '',
    description: '',
    notes: '',
  });

  const detailsQuery = useQuery({
    queryKey: queryKeys.members.detail(decodedEmail),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MemberDetailsData }>(
        `/api/admin/members/${encodeURIComponent(decodedEmail)}/details`
      );
      return response;
    },
  });

  const activitiesQuery = useQuery({
    queryKey: [...queryKeys.members.detail(decodedEmail), 'activities'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Activity[] }>(
        `/api/admin/members/${encodeURIComponent(decodedEmail)}/activities`
      );
      return response;
    },
  });

  const contactsQuery = useQuery({
    queryKey: [...queryKeys.members.detail(decodedEmail), 'contacts'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MemberContact[] }>(
        `/api/admin/members/${encodeURIComponent(decodedEmail)}/contacts`
      );
      return response;
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data: Omit<MemberContact, 'id' | 'memberEmail' | 'createdBy' | 'createdAt'>) =>
      api.post(`/api/admin/members/${encodeURIComponent(decodedEmail)}/contacts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.members.detail(decodedEmail), 'contacts'] });
      toast({ title: 'Interaction ajoutée' });
      setAddInteractionOpen(false);
      setInteractionForm({ type: 'call', subject: '', date: new Date().toISOString().split('T')[0], duration: '', description: '', notes: '' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'ajouter l'interaction", variant: 'destructive' });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) =>
      api.delete(`/api/admin/members/${encodeURIComponent(decodedEmail)}/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.members.detail(decodedEmail), 'contacts'] });
      toast({ title: 'Interaction supprimée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de supprimer l'interaction", variant: 'destructive' });
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

  const getRelationTypeLabel = (type: string) => {
    switch (type) {
      case 'sponsor':
        return 'Parrain/Marraine';
      case 'team':
        return 'Équipe/Collègue';
      case 'custom':
        return 'Relation personnalisée';
      default:
        return type;
    }
  };

  if (detailsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">Membre non trouvé</p>
        <Button onClick={() => router.push('/admin/members')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/admin/members')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              {member.firstName} {member.lastName}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground ml-12">
            <Mail className="h-4 w-4" />
            {member.email}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(member.status)}
            {member.engagementScore !== undefined && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Score: {member.engagementScore}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Informations principales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
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
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Onglets */}
      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="activities">Activité</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="subscriptions">Cotisations</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
          <TabsTrigger value="network">Réseau</TabsTrigger>
        </TabsList>

        {/* Onglet Activité (fil d'actualité) */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique d'activité</CardTitle>
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

        {/* Onglet Tâches */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tâches de suivi</CardTitle>
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
                      {task.priority && (
                        <Badge variant="outline" className="mt-2">
                          Priorité: {task.priority}
                        </Badge>
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

        {/* Onglet Interactions */}
        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Journal d'interactions</CardTitle>
                <CardDescription>
                  {contacts.length} interaction(s)
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddInteractionOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une interaction
              </Button>
            </CardHeader>
            <CardContent>
              {contactsQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : contacts.length > 0 ? (
                <div className="space-y-3">
                  {[...contacts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((contact) => {
                    const typeConfig = CONTACT_TYPE_CONFIG[contact.type];
                    return (
                      <div key={contact.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.className}`}>
                                {typeConfig.label}
                              </span>
                              <span className="font-medium text-sm">{contact.subject}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(contact.date).toLocaleDateString('fr-FR')}
                              {contact.duration ? ` · ${contact.duration} min` : ''}
                            </p>
                            {contact.description && (
                              <p className="text-sm mt-1">{contact.description}</p>
                            )}
                            {contact.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">{contact.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => deleteContactMutation.mutate(contact.id)}
                            disabled={deleteContactMutation.isPending}
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune interaction enregistrée</p>
              )}
            </CardContent>
          </Card>

          {/* Dialog d'ajout d'interaction */}
          <Dialog open={addInteractionOpen} onOpenChange={setAddInteractionOpen}>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Ajouter une interaction</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select
                      value={interactionForm.type}
                      onValueChange={(v) => setInteractionForm(f => ({ ...f, type: v as MemberContact['type'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CONTACT_TYPE_CONFIG) as MemberContact['type'][]).map((t) => (
                          <SelectItem key={t} value={t}>{CONTACT_TYPE_CONFIG[t].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={interactionForm.date}
                      onChange={(e) => setInteractionForm(f => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sujet *</Label>
                  <Input
                    placeholder="Ex: Appel de découverte"
                    value={interactionForm.subject}
                    onChange={(e) => setInteractionForm(f => ({ ...f, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée (minutes)</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={interactionForm.duration}
                    onChange={(e) => setInteractionForm(f => ({ ...f, duration: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    placeholder="Résumé de l'échange..."
                    rows={3}
                    value={interactionForm.description}
                    onChange={(e) => setInteractionForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Notes additionnelles..."
                    rows={2}
                    value={interactionForm.notes}
                    onChange={(e) => setInteractionForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddInteractionOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    if (!interactionForm.subject || !interactionForm.date || !interactionForm.description) {
                      toast({ title: 'Champs requis', description: 'Sujet, date et description sont obligatoires', variant: 'destructive' });
                      return;
                    }
                    createContactMutation.mutate({
                      type: interactionForm.type,
                      subject: interactionForm.subject,
                      date: interactionForm.date,
                      duration: interactionForm.duration ? Number(interactionForm.duration) : undefined,
                      description: interactionForm.description,
                      notes: interactionForm.notes || undefined,
                    });
                  }}
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Onglet Tags */}
        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
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

        {/* Onglet Cotisations */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cotisations</CardTitle>
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

        {/* Onglet Relations - NOUVELLEMENT AJOUTÉ */}
        <TabsContent value="relations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relations</CardTitle>
              <CardDescription>
                {details?.relations?.length || 0} relation(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {details?.relations && details.relations.length > 0 ? (
                <div className="space-y-3">
                  {details.relations.map((relation) => (
                    <div key={relation.id} className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => router.push(`/admin/members/${encodeURIComponent(relation.relatedMemberEmail)}`)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {relation.relatedMemberName || relation.relatedMemberEmail}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getRelationTypeLabel(relation.relationType)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{relation.relationType}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune relation enregistrée</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Réseau */}
        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Réseau</CardTitle>
              <CardDescription>Connexions avec d'autres membres et mécènes</CardDescription>
            </CardHeader>
            <CardContent>
              <NetworkSection
                mode="live"
                ownerEmail={decodedEmail}
                ownerType="member"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Mail, Phone, User } from 'lucide-react';

// ===== Types =====

interface PatronContact {
  id: string;
  patronId: string;
  firstName: string;
  lastName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PatronDonation {
  id: string;
  patronId: string;
  donatedAt: string;
  amount: number;
  occasion: string;
  recordedBy: string;
  createdAt: string;
}

interface PatronUpdate {
  id: string;
  patronId: string;
  type: string;
  subject: string;
  date: string;
  startTime: string | null;
  duration: number | null;
  description: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PatronProposal {
  id: string;
  ideaId: string;
  ideaTitle: string | null;
  patronId: string;
  proposedByAdminEmail: string;
  proposedAt: string;
  status: string;
  comments: string | null;
  updatedAt: string;
}

interface PatronDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  phone: string | null;
  role: string | null;
  notes: string | null;
  status: string;
  department: string | null;
  city: string | null;
  postalCode: string | null;
  sector: string | null;
  referrerId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  contacts: PatronContact[];
  donations: PatronDonation[];
  updates: PatronUpdate[];
  proposals: PatronProposal[];
}

// ===== Helpers =====

function formatAmount(amountInCents: number): string {
  return (amountInCents / 100).toFixed(2) + ' €';
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR');
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'active':
      return 'default';
    case 'proposed':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'proposed':
      return 'Proposé';
    default:
      return status;
  }
}

function getUpdateTypeBadge(type: string): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  switch (type) {
    case 'meeting':
      return { label: 'Réunion', variant: 'default' };
    case 'email':
      return { label: 'Email', variant: 'secondary' };
    case 'call':
      return { label: 'Appel', variant: 'outline' };
    case 'lunch':
      return { label: 'Déjeuner', variant: 'default' };
    case 'event':
      return { label: 'Événement', variant: 'secondary' };
    default:
      return { label: type, variant: 'outline' };
  }
}

function getProposalStatusBadge(status: string): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  switch (status) {
    case 'proposed':
      return { label: 'Proposé', variant: 'secondary' };
    case 'contacted':
      return { label: 'Contacté', variant: 'default' };
    case 'declined':
      return { label: 'Refusé', variant: 'destructive' };
    case 'converted':
      return { label: 'Converti', variant: 'default' };
    default:
      return { label: status, variant: 'outline' };
  }
}

// ===== Skeleton Loading =====

function DetailSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ===== Page Component =====

export default function PatronDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: patron, isLoading, error } = useQuery({
    queryKey: queryKeys.patrons.detail(id),
    queryFn: () => api.get<PatronDetails>(`/api/patrons/${id}/details`),
    enabled: !!id,
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !patron) {
    return (
      <div className="container py-8">
        <Button variant="ghost" onClick={() => router.push('/admin/patrons')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Mécène non trouvé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Ce mécène n\'existe pas ou a été supprimé.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" onClick={() => router.push('/admin/patrons')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">
              {patron.firstName} {patron.lastName}
            </h1>
            <Badge variant={getStatusBadgeVariant(patron.status)}>
              {getStatusLabel(patron.status)}
            </Badge>
          </div>
          {patron.company && (
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <Building2 className="h-4 w-4" />
              {patron.company}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="infos">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts {patron.contacts.length > 0 && `(${patron.contacts.length})`}
          </TabsTrigger>
          <TabsTrigger value="dons">
            Dons {patron.donations.length > 0 && `(${patron.donations.length})`}
          </TabsTrigger>
          <TabsTrigger value="interactions">
            Interactions {patron.updates.length > 0 && `(${patron.updates.length})`}
          </TabsTrigger>
          <TabsTrigger value="propositions">
            Propositions {patron.proposals.length > 0 && `(${patron.proposals.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Onglet Infos */}
        <TabsContent value="infos">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Nom complet
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {patron.firstName} {patron.lastName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </dt>
                  <dd className="mt-1 text-sm">
                    <a href={`mailto:${patron.email}`} className="text-primary hover:underline">
                      {patron.email}
                    </a>
                  </dd>
                </div>

                {patron.company && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      Société
                    </dt>
                    <dd className="mt-1 text-sm">{patron.company}</dd>
                  </div>
                )}

                {patron.phone && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Téléphone
                    </dt>
                    <dd className="mt-1 text-sm">{patron.phone}</dd>
                  </div>
                )}

                {patron.role && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Fonction</dt>
                    <dd className="mt-1 text-sm">{patron.role}</dd>
                  </div>
                )}

                {patron.sector && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Secteur d'activité</dt>
                    <dd className="mt-1 text-sm">{patron.sector}</dd>
                  </div>
                )}

                {patron.department && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Département</dt>
                    <dd className="mt-1 text-sm">{patron.department}</dd>
                  </div>
                )}

                {patron.city && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Ville</dt>
                    <dd className="mt-1 text-sm">
                      {patron.city}
                      {patron.postalCode ? ` (${patron.postalCode})` : ''}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Statut</dt>
                  <dd className="mt-1">
                    <Badge variant={getStatusBadgeVariant(patron.status)}>
                      {getStatusLabel(patron.status)}
                    </Badge>
                  </dd>
                </div>

                {patron.createdAt && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Ajouté le</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">
                      {formatDate(patron.createdAt)}
                      {patron.createdBy ? ` par ${patron.createdBy}` : ''}
                    </dd>
                  </div>
                )}

                {patron.notes && (
                  <div className="col-span-full">
                    <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                    <dd className="mt-1 text-sm whitespace-pre-wrap rounded-md bg-muted/50 p-3">
                      {patron.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Contacts */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contacts ({patron.contacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {patron.contacts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun contact enregistré pour ce mécène.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Fonction</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patron.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contact.role ?? '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                              {contact.email}
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contact.phone ?? '-'}
                        </TableCell>
                        <TableCell>
                          {contact.isPrimary && (
                            <Badge variant="default">Principal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Dons */}
        <TabsContent value="dons">
          <Card>
            <CardHeader>
              <CardTitle>Historique des dons ({patron.donations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {patron.donations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun don enregistré pour ce mécène.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Occasion</TableHead>
                      <TableHead>Enregistré par</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patron.donations.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell className="text-sm">
                          {formatDate(donation.donatedAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(donation.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {donation.occasion}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {donation.recordedBy}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Interactions */}
        <TabsContent value="interactions">
          <Card>
            <CardHeader>
              <CardTitle>Interactions ({patron.updates.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {patron.updates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune interaction enregistrée pour ce mécène.
                </p>
              ) : (
                <div className="space-y-4">
                  {patron.updates.map((update) => {
                    const typeBadge = getUpdateTypeBadge(update.type);
                    return (
                      <div
                        key={update.id}
                        className="flex gap-4 p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className="font-medium text-sm">{update.subject}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(update.date)}
                              {update.startTime ? ` à ${update.startTime}` : ''}
                              {update.duration ? ` (${update.duration} min)` : ''}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {update.description}
                          </p>
                          {update.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Note : {update.notes}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Par {update.createdBy}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Propositions */}
        <TabsContent value="propositions">
          <Card>
            <CardHeader>
              <CardTitle>Propositions idées-mécène ({patron.proposals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {patron.proposals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune proposition enregistrée pour ce mécène.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Idée</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date de proposition</TableHead>
                      <TableHead>Proposé par</TableHead>
                      <TableHead>Commentaires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patron.proposals.map((proposal) => {
                      const statusBadge = getProposalStatusBadge(proposal.status);
                      return (
                        <TableRow key={proposal.id}>
                          <TableCell className="font-medium text-sm">
                            {proposal.ideaTitle ?? 'Idée inconnue'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(proposal.proposedAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {proposal.proposedByAdminEmail}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {proposal.comments ?? '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

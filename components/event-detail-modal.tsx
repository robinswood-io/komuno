'use client';

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Users, Edit, Trash2, Download, ExternalLink, Award, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Event, Inscription, Unsubscription } from "@/shared/schema";
import {
  getSponsorshipLevelLabel,
  getSponsorshipLevelBadgeClass,
  getSponsorshipLevelIcon,
  isPremiumSponsorship,
  type PublicSponsorship
} from "@/lib/sponsorship-utils";
import { exportInscriptions, exportUnsubscriptions } from "@/lib/export-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventWithInscriptions extends Omit<Event, "inscriptionCount"> {
  inscriptionCount: number;
  unsubscriptionCount: number;
}

interface EventDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventWithInscriptions | null;
  onEdit?: (event: EventWithInscriptions) => void;
}

export default function EventDetailModal({
  open,
  onOpenChange,
  event,
  onEdit
}: EventDetailModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInscriptions, setShowInscriptions] = useState(false);
  const [showUnsubscriptions, setShowUnsubscriptions] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Fetch inscriptions for this event
  const { data: inscriptions, isLoading: inscriptionsLoading } = useQuery<Inscription[]>({
    queryKey: [`/api/admin/events/${event?.id}/inscriptions`],
    enabled: !!event?.id && showInscriptions,
  });

  // Fetch unsubscriptions for this event - Always load to get count
  const { data: unsubscriptions, isLoading: unsubscriptionsLoading } = useQuery<Unsubscription[]>({
    queryKey: [`/api/admin/events/${event?.id}/unsubscriptions`],
    enabled: !!event?.id,
  });

  // Fetch public sponsors for this event (visible to everyone)
  const { data: sponsors, isLoading: sponsorsLoading } = useQuery<PublicSponsorship[]>({
    queryKey: [`/api/public/events/${event?.id}/sponsorships`],
    enabled: !!event?.id,
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Événement supprimé",
        description: "L'événement a été définitivement supprimé",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de suppression",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!event) return null;

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUpcoming = new Date(event.date) > new Date();

  const handleEdit = () => {
    if (onEdit) {
      onEdit(event);
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.")) {
      deleteEventMutation.mutate(event.id);
    }
  };

  const exportInscriptionsCSV = () => {
    if (!inscriptions) return;

    const csvContent = [
      "Email,Nom,Commentaire,Date d'inscription",
      ...inscriptions.map(inscription =>
        `"${inscription.email}","${inscription.name || ''}","${inscription.comments || ''}","${new Date(inscription.createdAt).toLocaleDateString('fr-FR')}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inscriptions-${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5 text-primary" />
            Détails de l'événement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Stats */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Badge variant={isUpcoming ? "default" : "secondary"} className="text-sm">
              {isUpcoming ? "📅 À venir" : "✅ Terminé"}
            </Badge>
            {isAdmin && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                {event.inscriptionCount} inscription{event.inscriptionCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h3>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-700">Date et heure</p>
                <p className="text-gray-600">{formatDate(event.date)}</p>
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">Lieu</p>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg">
                {event.description}
              </p>
            </div>
          )}

          {/* HelloAsso Link */}
          {event.helloAssoLink && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Lien d'inscription</h4>
              <a
                href={event.helloAssoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir HelloAsso
              </a>
            </div>
          )}

          {/* Sponsors Section - Public */}
          {sponsors && sponsors.length > 0 && (
            <>
              <Separator />
              <div data-testid={`sponsors-section-${event.id}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-gray-800 text-lg">
                    Sponsors de l'événement ({sponsors.length})
                  </h4>
                </div>

                {sponsorsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sponsors.map((sponsor) => (
                      <div
                        key={sponsor.id}
                        data-testid={`sponsor-item-${sponsor.id}`}
                        className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-200 ${
                          isPremiumSponsorship(sponsor.level)
                            ? 'border-primary bg-gradient-to-br from-green-50 to-white hover:shadow-lg'
                            : 'border-gray-200 bg-white hover:border-primary hover:shadow-md'
                        }`}
                      >
                        {/* Logo */}
                        <div className="flex-shrink-0">
                          {sponsor.logoUrl ? (
                            <img
                              src={sponsor.logoUrl}
                              alt={`Logo ${sponsor.patronFirstName} ${sponsor.patronLastName}`}
                              data-testid={`sponsor-logo-${sponsor.id}`}
                              className="w-20 h-20 object-contain rounded-lg border border-gray-200 bg-white p-2"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-success-dark rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                              {getSponsorshipLevelIcon(sponsor.level)}
                            </div>
                          )}
                        </div>

                        {/* Sponsor Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-lg mb-1">
                            {sponsor.patronFirstName} {sponsor.patronLastName}
                          </div>
                          {sponsor.patronCompany && (
                            <div className="text-sm text-gray-600 mb-2">{sponsor.patronCompany}</div>
                          )}
                          <div className={getSponsorshipLevelBadgeClass(sponsor.level)}>
                            {getSponsorshipLevelIcon(sponsor.level)} {getSponsorshipLevelLabel(sponsor.level)}
                          </div>
                          {sponsor.websiteUrl && (
                            <a
                              href={sponsor.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`sponsor-link-${sponsor.id}`}
                              className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:text-primary font-medium transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Visiter le site web
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {isAdmin && <Separator />}

          {/* Inscriptions Section - Admin only */}
          {isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-700">
                  Inscriptions ({event.inscriptionCount})
                </h4>
              <div className="flex gap-2">
                {inscriptions && inscriptions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-export-inscriptions-dropdown">
                        <Download className="w-4 h-4 mr-1" />
                        Exporter
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => exportInscriptions(
                          event.title,
                          inscriptions.map(i => ({ ...i, createdAt: i.createdAt.toString() })),
                          'pdf'
                        )}
                        data-testid="button-export-inscriptions-pdf"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportInscriptions(
                          event.title,
                          inscriptions.map(i => ({ ...i, createdAt: i.createdAt.toString() })),
                          'excel'
                        )}
                        data-testid="button-export-inscriptions-excel"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={exportInscriptionsCSV}
                        data-testid="button-export-inscriptions-csv"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  onClick={() => setShowInscriptions(!showInscriptions)}
                  variant="outline"
                  size="sm"
                >
                  {showInscriptions ? "Masquer" : "Afficher"}
                </Button>
              </div>
            </div>

            {showInscriptions && (
              <div className="border rounded-lg">
                {inscriptionsLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : inscriptions && inscriptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Commentaire</TableHead>
                          <TableHead>Date d'inscription</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inscriptions.map((inscription) => (
                          <TableRow key={inscription.id}>
                            <TableCell className="font-medium">
                              {inscription.email}
                            </TableCell>
                            <TableCell>
                              {inscription.name || "-"}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={inscription.comments || ""}>
                                {inscription.comments || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(inscription.createdAt).toLocaleDateString("fr-FR")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Aucune inscription pour cet événement
                  </div>
                )}
              </div>
            )}
            </div>
          )}

          {isAdmin && <Separator />}

          {/* Unsubscriptions (Absences) Section - Admin only */}
          {isAdmin && (
            <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-700">
                Absences déclarées ({unsubscriptions?.length || 0})
              </h4>
              <div className="flex gap-2">
                {unsubscriptions && unsubscriptions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-export-unsubscriptions-dropdown">
                        <Download className="w-4 h-4 mr-1" />
                        Exporter
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => exportUnsubscriptions(
                          event.title,
                          unsubscriptions.map(u => ({ ...u, createdAt: u.createdAt.toString() })),
                          'pdf'
                        )}
                        data-testid="button-export-unsubscriptions-pdf"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportUnsubscriptions(
                          event.title,
                          unsubscriptions.map(u => ({ ...u, createdAt: u.createdAt.toString() })),
                          'excel'
                        )}
                        data-testid="button-export-unsubscriptions-excel"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  onClick={() => setShowUnsubscriptions(!showUnsubscriptions)}
                  variant="outline"
                  size="sm"
                >
                  {showUnsubscriptions ? "Masquer" : "Afficher"}
                </Button>
              </div>
            </div>

            {showUnsubscriptions && (
              <div className="border rounded-lg">
                {unsubscriptionsLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : unsubscriptions && unsubscriptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Raison de l'absence</TableHead>
                          <TableHead>Date de déclaration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unsubscriptions.map((unsubscription) => (
                          <TableRow key={unsubscription.id}>
                            <TableCell className="font-medium">
                              {unsubscription.email}
                            </TableCell>
                            <TableCell>
                              {unsubscription.name || "-"}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={unsubscription.comments || ""}>
                                {unsubscription.comments || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(unsubscription.createdAt).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 p-4 text-center">
                    Aucune absence déclarée pour cet événement.
                  </p>
                )}
              </div>
            )}
            </div>
          )}

          {isAdmin && <Separator />}

          {/* Actions - Admin only */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleEdit}
              className="bg-primary hover:bg-primary text-white flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier l'événement
            </Button>

            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={deleteEventMutation.isPending}
              className="sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

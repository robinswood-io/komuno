'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Users, CalendarPlus, UserMinus, Loader2, Clock, Star, MessageCircle, Share2, ExternalLink, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SimplePagination } from "@/components/ui/pagination";
import EventRegistrationModal from "@/components/event-registration-modal";
import type { Event } from "@/shared/schema";
import { shareContent, isShareSupported } from "@/lib/share-utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from '@/contexts/BrandingContext';
import {
  getSponsorshipLevelLabel,
  getSponsorshipLevelBadgeClass,
  getSponsorshipLevelIcon,
  type PublicSponsorship
} from "@/lib/sponsorship-utils";
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';

interface EventWithInscriptions extends Omit<Event, "inscriptionCount"> {
  inscriptionCount: number;
}

// interface PaginatedEventsResponse {
//   success: boolean;
//   data: {
//     data: EventWithInscriptions[];
//     total: number;
//     page: number;
//     limit: number;
//   };
// }

// Sponsors Preview Component
function SponsorsPreview({ eventId }: { eventId: string }) {
  const { data: sponsors, isLoading } = useQuery({
    queryKey: ['events', 'sponsorships', eventId],
    queryFn: () => api.get<PublicSponsorship[]>(`/api/public/events/${eventId}/sponsorships`),
    enabled: !!eventId,
  });

  if (isLoading) {
    return null; // Don't show loading state to keep card clean
  }

  if (!sponsors || sponsors.length === 0) {
    return null; // Don't show section if no sponsors
  }

  // Limit to top 5 sponsors (already sorted by level priority from API)
  const topSponsors = sponsors.slice(0, 5);

  return (
    <div className="mb-5" data-testid={`sponsors-section-${eventId}`}>
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-gray-800">
          Sponsors {sponsors.length > 5 && <span className="text-sm text-gray-500 font-normal">({sponsors.length})</span>}
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {topSponsors.map((sponsor) => (
          <div
            key={sponsor.id}
            data-testid={`sponsor-item-${sponsor.id}`}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all duration-200"
          >
            {sponsor.logoUrl ? (
              <img
                src={sponsor.logoUrl}
                alt={`Logo ${sponsor.patronFirstName} ${sponsor.patronLastName}`}
                data-testid={`sponsor-logo-${sponsor.id}`}
                className="w-12 h-12 object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {getSponsorshipLevelIcon(sponsor.level)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">
                {sponsor.patronFirstName} {sponsor.patronLastName}
              </div>
              {sponsor.patronCompany && (
                <div className="text-xs text-gray-500 truncate">{sponsor.patronCompany}</div>
              )}
              <div className={getSponsorshipLevelBadgeClass(sponsor.level)}>
                {getSponsorshipLevelIcon(sponsor.level)} {getSponsorshipLevelLabel(sponsor.level)}
              </div>
            </div>
            {sponsor.websiteUrl && (
              <a
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`sponsor-link-${sponsor.id}`}
                className="flex-shrink-0 p-2 text-primary hover:bg-primary hover:text-white rounded-full transition-colors"
                title="Visiter le site web"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EventsSection() {
  const [selectedEvent, setSelectedEvent] = useState<EventWithInscriptions | null>(null);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'register' | 'unsubscribe'>('register');
  const [page, setPage] = useState(1);
  const limit = 20;
  const { toast } = useToast();
  const { user } = useAuth();
  const { branding } = useBranding();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // REST API + React Query
  const { data: response, isLoading, error } = useQuery({
    queryKey: queryKeys.events.list({ page, limit }),
    queryFn: () => api.get<PaginatedResponse<EventWithInscriptions>>('/api/events', { page, limit }),
  });

  const events = (response?.success && 'data' in response ? response.data : []) as EventWithInscriptions[];
  const total = (response?.success && 'total' in response ? response.total : 0) as number;
  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error">Erreur lors du chargement des événements</p>
      </div>
    );
  }

  const handleRegisterClick = (event: EventWithInscriptions) => {
    setSelectedEvent(event);
    setModalMode('register');
    setRegistrationModalOpen(true);
  };

  const handleUnsubscribeClick = (event: EventWithInscriptions) => {
    setSelectedEvent(event);
    setModalMode('unsubscribe');
    setRegistrationModalOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (date: string) => {
    const dateObj = new Date(date);
    return {
      day: dateObj.getDate(),
      month: dateObj.toLocaleDateString("fr-FR", { month: "short" }),
      time: dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    };
  };

  const isUpcoming = (date: string) => {
    return new Date(date) > new Date();
  };

  const handleShare = async (event: EventWithInscriptions) => {
    const formattedDate = formatDate(event.date.toString());
    const result = await shareContent({
      title: event.title,
      text: `${event.title} - ${formattedDate}`,
      url: window.location.origin
    });

    if (result.success) {
      if (isShareSupported()) {
        toast({
          title: "✅ Partagé avec succès !",
          description: "L'événement a été partagé.",
        });
      } else {
        toast({
          title: "📋 Lien copié dans le presse-papiers",
          description: "Vous pouvez maintenant partager ce lien.",
        });
      }
    } else if (result.reason === 'cancelled') {
      toast({
        title: "ℹ️ Partage annulé",
        variant: "default",
      });
    } else if (result.reason === 'error') {
      toast({
        title: "❌ Impossible de partager",
        description: result.message || "Une erreur s'est produite",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Welcome Message */}
      <div className="bg-primary rounded-xl shadow-lg p-6 sm:p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/20 rounded-full p-2">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold">Événements à venir</h2>
        </div>
        <p className="text-white text-base sm:text-lg opacity-90">
          Découvrez les prochains événements de la section {branding?.app?.shortName || 'CJD Amiens'} et inscrivez-vous facilement
        </p>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : events && events.length > 0 ? (
        <div className="space-y-6 sm:space-y-8">
          {events.map((event) => {
            const shortDate = formatShortDate(event.date.toString());
            const isEventUpcoming = isUpcoming(event.date.toString());
            const isEventFull = Boolean(event.maxParticipants && event.inscriptionCount >= event.maxParticipants);
            
            return (
              <Card key={event.id} className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-primary overflow-hidden bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Date Badge */}
                    <div className="lg:w-32 flex lg:flex-col items-center justify-center bg-primary text-white p-4 lg:p-6">
                      <div className="text-center">
                        <div className="text-2xl lg:text-4xl font-bold leading-tight">{shortDate.day}</div>
                        <div className="text-sm lg:text-base font-medium uppercase tracking-wide opacity-90">{shortDate.month}</div>
                        <div className="flex items-center justify-center mt-1 lg:mt-2 text-xs lg:text-sm opacity-80">
                          <Clock className="w-3 h-3 mr-1" />
                          {shortDate.time}
                        </div>
                      </div>
                      {isEventUpcoming && (
                        <div className="hidden lg:block mt-3">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium">
                            À venir
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 p-4 lg:p-6">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Title with status indicator */}
                          <div className="flex items-start gap-3 mb-4">
                            <h3 className="font-bold text-xl lg:text-2xl text-gray-800 leading-tight group-hover:text-primary transition-colors">
                              {event.title}
                            </h3>
                            {isEventFull && (
                              <span className="bg-error text-white text-xs font-medium px-2 py-1 rounded-full flex-shrink-0">
                                COMPLET
                              </span>
                            )}
                            {!isEventFull && isEventUpcoming && event.maxParticipants && (
                              event.inscriptionCount / event.maxParticipants > 0.8 && (
                                <span className="bg-warning text-white text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 animate-pulse">
                                  DERNIÈRES PLACES
                                </span>
                              )
                            )}
                          </div>

                          {/* Event Info */}
                          <div className="space-y-3 mb-5">
                            <div className="flex items-start text-gray-600">
                              <Calendar className="w-5 h-5 mr-3 mt-0.5 text-primary flex-shrink-0" />
                              <div>
                                <span className="font-medium text-gray-800">{formatDate(event.date.toString())}</span>
                                <div className="text-sm text-gray-500 mt-1">
                                  {isEventUpcoming ? "Événement à venir" : "Événement passé"}
                                </div>
                              </div>
                            </div>
                            
                            {event.location && (
                              <div className="flex items-start text-gray-600">
                                <MapPin className="w-5 h-5 mr-3 mt-0.5 text-primary flex-shrink-0" />
                                <span className="text-base font-medium text-gray-800">{event.location}</span>
                              </div>
                            )}
                            
                            {event.helloAssoLink && (
                              <div className="flex items-center text-gray-600 bg-info-light rounded-lg p-3">
                                <Star className="w-5 h-5 mr-3 text-info flex-shrink-0" />
                                <a 
                                  href={event.helloAssoLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-info hover:text-info-dark font-medium hover:underline transition-colors"
                                >
                                  💳 Inscription payante - HelloAsso
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {event.description && (
                            <div className="mb-5 p-4 bg-gray-50 rounded-lg border-l-2 border-l-primary">
                              <p className="text-gray-700 text-base leading-relaxed whitespace-pre-line">{event.description}</p>
                            </div>
                          )}

                          {/* Sponsors Section - Public */}
                          <SponsorsPreview eventId={event.id} />

                          {/* Participants Info - Admin only */}
                          {isAdmin && (event.maxParticipants || event.showInscriptionsCount) && (
                            <div className="flex flex-wrap items-center gap-3 p-4 bg-info/10 rounded-lg border border-info">
                              {event.showInscriptionsCount && (
                                <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-sm">
                                  <Users className="w-4 h-4 mr-2 text-info" />
                                  <span className="font-medium text-gray-800">
                                    <span className="text-info font-bold">{event.inscriptionCount}</span> inscrit{event.inscriptionCount > 1 ? 's' : ''}
                                    {event.maxParticipants && (
                                      <>
                                        <span className="text-gray-500 mx-1">/</span>
                                        <span className="font-bold">{event.maxParticipants}</span> places
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                              
                              {event.maxParticipants && event.showAvailableSeats && (
                                <div className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full shadow-sm ${
                                  isEventFull
                                    ? 'bg-error text-white'
                                    : event.inscriptionCount / event.maxParticipants > 0.8 
                                      ? 'bg-warning text-white'
                                      : 'bg-success text-white'
                                }`}>
                                  {isEventFull
                                    ? '🚫 Événement complet' 
                                    : event.maxParticipants - event.inscriptionCount <= 5
                                      ? `⚡ Plus que ${event.maxParticipants - event.inscriptionCount} place${event.maxParticipants - event.inscriptionCount > 1 ? 's' : ''}`
                                      : `✅ ${event.maxParticipants - event.inscriptionCount} places disponibles`}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Registration Buttons */}
                        <div className="flex-shrink-0 xl:ml-8 mt-4 xl:mt-0">
                          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                            {/* Subscribe Button - Show if buttonMode is "subscribe" or "both" */}
                            {(event.buttonMode === "subscribe" || event.buttonMode === "both" || !event.buttonMode) && (
                              <Button
                                onClick={() => handleRegisterClick(event)}
                                disabled={isEventFull}
                                size="lg"
                                className={`text-sm font-semibold px-6 py-3 transition-all duration-200 shadow-lg hover:shadow-xl ${
                                  isEventFull
                                    ? 'bg-muted cursor-not-allowed text-muted-foreground'
                                    : 'bg-primary text-white hover:bg-primary/90 transform hover:scale-105'
                                }`}
                                data-testid="button-register-event"
                              >
                                <CalendarPlus className="w-4 h-4 mr-2" />
                                {isEventFull ? '❌ Complet' : "S'inscrire"}
                              </Button>
                            )}
                            
                            {/* Unsubscribe Button - Show if buttonMode is "unsubscribe" or "both" */}
                            {(event.buttonMode === "unsubscribe" || event.buttonMode === "both") && (
                              <Button
                                onClick={() => handleUnsubscribeClick(event)}
                                variant={event.redUnsubscribeButton ? "destructive" : "outline"}
                                size="lg"
                                className={`text-sm font-semibold px-6 py-3 transition-all duration-200 shadow-lg hover:shadow-xl ${
                                  event.redUnsubscribeButton 
                                    ? 'bg-error text-white hover:bg-error-dark border-error' 
                                    : 'border-error text-error hover:bg-error-light hover:border-error'
                                }`}
                                data-testid="button-unsubscribe-event"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Se désinscrire
                              </Button>
                            )}
                            
                            {/* Custom Button - Show if buttonMode is "custom" */}
                            {event.buttonMode === "custom" && (
                              <Button
                                variant="outline"
                                size="lg"
                                className="border-info text-info hover:bg-info-light"
                                data-testid="button-custom-event"
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                {event.customButtonText?.trim() || "Contacter l'organisateur"}
                              </Button>
                            )}
                            
                            {/* Share Button */}
                            <Button
                              onClick={() => handleShare(event)}
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-primary"
                              data-testid={`button-share-event-${event.id}`}
                              title="Partager cet événement"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-3">Aucun événement prévu pour le moment</h3>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Restez connecté ! De nouveaux événements seront bientôt disponibles pour enrichir vos échanges professionnels.
          </p>
          <div className="mt-6 p-4 bg-success-light rounded-lg inline-block border border-success/20">
            <p className="text-success-dark text-sm font-medium">💡 En attendant, n'hésitez pas à proposer vos propres idées d'événements !</p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && events && events.length > 0 && totalPages > 1 && (
        <SimplePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
        />
      )}

      <EventRegistrationModal
        open={registrationModalOpen}
        onOpenChange={setRegistrationModalOpen}
        event={selectedEvent}
        mode={modalMode}
      />
    </section>
  );
}

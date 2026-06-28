'use client';

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserMinus, Loader2, Calendar, Users, MapPin, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getIdentity, saveIdentity, clearIdentity, createUserIdentity } from "@/lib/user-identity";
import type { Event, InsertInscription, InsertUnsubscription } from "@/shared/schema";
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';

function getSafeHttpRedirectUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

interface EventRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: (Event & { inscriptionCount: number }) | null;
  mode: 'register' | 'unsubscribe';
}

export default function EventRegistrationModal({
  open,
  onOpenChange,
  event,
  mode
}: EventRegistrationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    comments: "",
  });
  const [rememberMe, setRememberMe] = useState(true);
  const isUnsubscribeMode = mode === 'unsubscribe';

  useEffect(() => {
    if (!open) {
      setFormData({ name: "", email: "", company: "", phone: "", comments: "" });
    } else {
      // When opening modal, try to prefill from stored identity
      const storedIdentity = getIdentity();
      if (storedIdentity) {
        setFormData(prev => ({
          ...prev,
          name: storedIdentity.name,
          email: storedIdentity.email
        }));
      }
    }
  }, [open]);

  const registerMutation = useMutation({
    mutationFn: (data: InsertInscription) => api.post<ApiResponse<{ id: string }>>('/api/inscriptions', data),
    onSuccess: () => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });

      // Handle identity saving/clearing based on rememberMe preference
      try {
        if (rememberMe && formData.name.trim() && formData.email.trim()) {
          const identity = createUserIdentity(formData.name.trim(), formData.email.trim());
          saveIdentity(identity);
        } else if (!rememberMe) {
          clearIdentity();
        }
      } catch (error) {
        console.warn('Failed to manage user identity:', error);
      }

      // Vérifier si une redirection externe HTTP(S) est configurée
      const safeRedirectUrl = event?.enableExternalRedirect ? getSafeHttpRedirectUrl(event.externalRedirectUrl) : null;
      if (safeRedirectUrl) {
        toast({
          title: "Inscription confirmee !",
          description: `Vous etes inscrit(e) a "${event?.title}". Vous allez etre redirige vers le site de paiement...`,
          duration: 3000,
        });

        // Rediriger après un court délai pour que l'utilisateur puisse voir le message
        setTimeout(() => {
          window.location.assign(safeRedirectUrl);
        }, 2000);
      } else {
        toast({
          title: "Inscription confirmee !",
          description: `Vous etes inscrit(e) a "${event?.title}". Un email de confirmation vous sera envoye.`,
          duration: 6000,
        });
      }

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur lors de l'inscription",
        description: error.message,
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: (data: InsertUnsubscription) => api.post<ApiResponse<{ id: string }>>('/api/unsubscriptions', data),
    onSuccess: () => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });

      // Handle identity saving/clearing based on rememberMe preference
      try {
        if (rememberMe && formData.name.trim() && formData.email.trim()) {
          const identity = createUserIdentity(formData.name.trim(), formData.email.trim());
          saveIdentity(identity);
        } else if (!rememberMe) {
          clearIdentity();
        }
      } catch (error) {
        console.warn('Failed to manage user identity:', error);
      }

      toast({
        title: "Absence declaree !",
        description: `Votre absence a "${event?.title}" a ete enregistree.`,
        duration: 6000,
      });

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur lors de la declaration d'absence",
        description: error.message,
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (isUnsubscribeMode) {
      // Déclaration d'absence
      if (!formData.name.trim() || !formData.email.trim()) {
        toast({
          title: "Champs requis",
          description: "Veuillez saisir votre nom et email pour déclarer votre absence",
          variant: "destructive",
        });
        return;
      }

      const unsubscription: InsertUnsubscription = {
        eventId: event.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        comments: formData.comments.trim() || undefined,
      };

      unsubscribeMutation.mutate(unsubscription);
    } else {
      // Inscription
      if (!formData.name.trim() || !formData.email.trim()) {
        toast({
          title: "Champs requis",
          description: "Veuillez remplir votre nom et email",
          variant: "destructive",
        });
        return;
      }

      const inscription: InsertInscription = {
        eventId: event.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        company: formData.company.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        comments: formData.comments.trim() || undefined,
      };

      registerMutation.mutate(inscription);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatEventDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left pb-4">
          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
            {isUnsubscribeMode
              ? "Déclarer une absence à l'événement"
              : "S'inscrire à l'événement"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 sm:space-y-4">
              {/* Event Info */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border-l-4 border-primary">
                <h3 className="font-semibold text-base sm:text-lg text-gray-800 mb-2 line-clamp-2">{event.title}</h3>
                <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-start sm:items-center">
                    <Calendar className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
                    <span className="break-words">{formatEventDate(event.date.toString())}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-start sm:items-center">
                      <MapPin className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
                      <span className="break-words">{event.location}</span>
                    </div>
                  )}
                  {(event.showInscriptionsCount || event.showAvailableSeats) && (
                    <div className="flex items-start sm:items-center">
                      <Users className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
                      <span className="break-words">
                        {event.showInscriptionsCount && `${event.inscriptionCount} personne(s) inscrite(s)`}
                        {event.showInscriptionsCount && event.maxParticipants && event.showAvailableSeats && " / "}
                        {event.maxParticipants && event.showAvailableSeats && `${event.maxParticipants} places maximum`}
                      </span>
                    </div>
                  )}
                </div>
                {event.description && (
                  <p className="mt-3 text-xs sm:text-sm text-gray-700 break-words whitespace-pre-line">{event.description}</p>
                )}
              </div>

              <p className="text-xs sm:text-sm text-gray-600">
                {isUnsubscribeMode
                  ? "Saisissez votre nom et email pour déclarer votre absence à cet événement."
                  : "Remplissez les informations ci-dessous pour confirmer votre inscription."}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>


        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {isUnsubscribeMode ? (
            /* Formulaire de désinscription */
            <>
              <div className="bg-warning-light border border-warning rounded-lg p-4">
                <h3 className="text-warning-dark font-medium mb-2">📝 Déclaration d'absence</h3>
                <p className="text-warning-dark text-sm">
                  Informez-nous que vous ne pourrez pas participer à cet événement. Cette information aide à mieux organiser nos événements.
                </p>
              </div>

              {/* Name Field for Unsubscription */}
              <div className="space-y-2">
                <Label htmlFor="unsubscribe-name" className="text-sm sm:text-base font-medium text-gray-700">
                  Votre nom *
                </Label>
                <Input
                  id="unsubscribe-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  required
                  className="text-sm sm:text-base focus:ring-primary focus:border-primary h-10 sm:h-11"
                  maxLength={100}
                  data-testid="input-unsubscribe-name"
                />
                <p className="text-xs text-gray-500">
                  Indiquez votre nom complet
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unsubscribe-email" className="text-sm sm:text-base font-medium text-gray-700">
                  Votre email *
                </Label>
                <Input
                  id="unsubscribe-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="votre.email@exemple.com"
                  required
                  className="text-sm sm:text-base focus:ring-primary focus:border-primary h-10 sm:h-11"
                  data-testid="input-unsubscribe-email"
                />
                <p className="text-xs text-gray-500">
                  Votre adresse email de contact
                </p>
              </div>

              {/* Comments Field for Unsubscription */}
              <div className="space-y-2">
                <Label htmlFor="absence-reason" className="text-sm sm:text-base font-medium text-gray-700">
                  Raison de l'absence (optionnel)
                </Label>
                <Textarea
                  id="absence-reason"
                  value={formData.comments}
                  onChange={(e) => handleInputChange("comments", e.target.value)}
                  placeholder="Ex: empêchement de dernière minute, maladie, autre engagement..."
                  rows={3}
                  className="text-sm sm:text-base focus:ring-primary focus:border-primary resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  Optionnel - Cela nous aide à mieux comprendre - {500 - formData.comments.length} caractères restants
                </p>
              </div>
            </>
          ) : (
            /* Formulaire d'inscription */
            <>
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="participant-name" className="text-sm sm:text-base font-medium text-gray-700">
                  Votre nom complet *
                </Label>
                <Input
                  id="participant-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  required
                  className="text-sm sm:text-base focus:ring-primary focus:border-primary h-10 sm:h-11"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500">
                  Ce nom apparaîtra sur la liste des participants
                </p>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="participant-email" className="text-sm sm:text-base font-medium text-gray-700">
                  Votre email *
                </Label>
                <Input
                  id="participant-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="jean.dupont@exemple.com"
                  required
                  className="text-sm sm:text-base focus:ring-primary focus:border-primary h-10 sm:h-11"
                  maxLength={100}
                  data-testid="input-participant-email"
                />
                <p className="text-xs text-gray-500">
                  Pour recevoir les informations et confirmations de l'événement
                </p>
              </div>

              {/* Company Field */}
              <div className="space-y-2">
                <Label htmlFor="participant-company" className="text-sm sm:text-base font-medium text-gray-700">
                  Société (optionnel)
                </Label>
                <Input
                  id="participant-company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  placeholder="Votre société"
                  className="text-sm sm:text-base focus:ring-primary focus:border-primary h-10 sm:h-11"
                  maxLength={100}
                  data-testid="input-company-event"
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="participant-phone" className="text-sm sm:text-base font-medium text-gray-700">
                  Téléphone (optionnel)
                </Label>
                <Input
                  id="participant-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="text-sm sm:text-base focus:ring-primary focus:border-primary h-10 sm:h-11"
                  maxLength={20}
                  data-testid="input-phone-event"
                />
              </div>

              {/* Comments Field (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="participant-comments" className="text-sm sm:text-base font-medium text-gray-700">
                  Commentaires ou informations particulières
                </Label>
                <Textarea
                  id="participant-comments"
                  value={formData.comments}
                  onChange={(e) => handleInputChange("comments", e.target.value)}
                  placeholder="Ex: régime alimentaire, nombre d'accompagnants, questions..."
                  rows={3}
                  className="text-sm sm:text-base focus:ring-primary focus:border-primary resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  Optionnel - {500 - formData.comments.length} caractères restants
                </p>
              </div>
            </>
          )}

          {/* Identity Management Section */}
          <div className="space-y-3 pt-2 border-t border-gray-200">
            {/* Remember Me Checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="mt-0.5"
                data-testid="checkbox-remember-me"
              />
              <div className="flex-1">
                <Label htmlFor="remember-me" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Se souvenir de mes informations
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Vos nom et email seront sauvegardés localement pour faciliter vos prochaines inscriptions
                </p>
              </div>
            </div>

            {/* Clear Information Button */}
            {getIdentity() && (
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    try {
                      clearIdentity();
                      setFormData(prev => ({ ...prev, name: "", email: "" }));
                      toast({
                        title: "✅ Informations effacées",
                        description: "Vos informations personnelles ont été supprimées.",
                        duration: 3000,
                      });
                    } catch (error) {
                      console.error('Failed to clear identity:', error);
                      toast({
                        title: "❌ Erreur",
                        description: "Impossible d'effacer les informations.",
                        variant: "destructive",
                        duration: 3000,
                      });
                    }
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 h-auto p-1"
                  data-testid="button-clear-identity"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Effacer mes informations sauvegardées
                </Button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t">
            <Button
              type="submit"
              disabled={isUnsubscribeMode ? unsubscribeMutation.isPending : registerMutation.isPending}
              className={`flex-1 h-11 sm:h-12 text-sm sm:text-base ${
                isUnsubscribeMode
                  ? 'bg-error hover:bg-error-dark text-white'
                  : 'bg-primary hover:bg-primary text-white'
              }`}
            >
              {isUnsubscribeMode ? (
                unsubscribeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Désinscription en cours...</span>
                    <span className="sm:hidden">Désinscription...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Déclarer mon absence</span>
                    <span className="sm:hidden">Déclarer absence</span>
                  </>
                )
              ) : (
                registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Inscription en cours...</span>
                    <span className="sm:hidden">Inscription...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Confirmer mon inscription</span>
                    <span className="sm:hidden">S'inscrire</span>
                  </>
                )
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUnsubscribeMode ? unsubscribeMutation.isPending : registerMutation.isPending}
              className="sm:px-8 h-11 sm:h-12 text-sm sm:text-base"
            >
              Annuler
            </Button>
          </div>
        </form>

        {/* Additional Info */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-info-light rounded-lg border-l-4 border-info">
          <h4 className="font-medium text-info-dark mb-2 text-sm sm:text-base">ℹ️ À propos de votre inscription</h4>
          <ul className="text-xs sm:text-sm text-info-dark space-y-1">
            <li>• Vous recevrez un email de confirmation</li>
            <li>• Votre email ne sera utilisé que pour cet événement</li>
            <li>• En cas d'empêchement, contactez l'organisation</li>
            <li>• Les inscriptions sont fermes et définitives</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Vote, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getIdentity, saveIdentity, clearIdentity, createUserIdentity } from "@/lib/user-identity";
import type { Idea } from "@/shared/schema";
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';

interface VoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: (Idea & { voteCount: number }) | null;
}

interface VoteData {
  ideaId: string;
  voterName: string;
  voterEmail: string;
}

export default function VoteModal({ open, onOpenChange, idea }: VoteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    voterName: "",
    voterEmail: "",
  });
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (open) {
      // Prefill form with stored identity if available
      const storedIdentity = getIdentity();
      if (storedIdentity) {
        setFormData({
          voterName: storedIdentity.name,
          voterEmail: storedIdentity.email,
        });
      }
    } else {
      // Only clear if no stored identity or user chose not to remember
      if (!rememberMe) {
        setFormData({ voterName: "", voterEmail: "" });
      }
    }
  }, [open, rememberMe]);

  const voteMutation = useMutation({
    mutationFn: (data: VoteData) => api.post<ApiResponse<{ id: string }>>('/api/votes', data),
    onSuccess: () => {
      // Handle identity storage based on rememberMe preference
      try {
        if (rememberMe && formData.voterName && formData.voterEmail) {
          const identity = createUserIdentity(formData.voterName, formData.voterEmail);
          saveIdentity(identity);
        } else if (!rememberMe) {
          clearIdentity();
        }
      } catch (error) {
        console.warn('Failed to manage user identity:', error);
      }

      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
      onOpenChange(false);
      toast({
        title: "Vote enregistré avec succès !",
        description: "Merci pour votre participation",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer votre vote",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea) return;

    voteMutation.mutate({
      ideaId: idea.id,
      voterName: formData.voterName,
      voterEmail: formData.voterEmail,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClearInfo = () => {
    try {
      clearIdentity();
      setFormData({ voterName: "", voterEmail: "" });
      toast({
        title: "Informations effacées",
        description: "Vos informations ont été supprimées",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effacer les informations",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md mx-3 sm:mx-auto" data-testid="modal-vote">
        <DialogHeader>
          <DialogTitle>Voter pour cette idée</DialogTitle>
        </DialogHeader>

        {idea && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md" data-testid="text-idea-summary">
            <h4 className="font-medium text-gray-800" data-testid="text-idea-title">{idea.title}</h4>
            {idea.description && (
              <p className="text-sm text-gray-600 mt-1" data-testid="text-idea-description">{idea.description}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="voter-name" className="text-sm font-medium text-gray-700">
              Votre nom *
            </Label>
            <Input
              id="voter-name"
              type="text"
              value={formData.voterName}
              onChange={(e) => handleInputChange("voterName", e.target.value)}
              placeholder="Prénom Nom"
              required
              className="focus:ring-primary focus:border-primary"
              data-testid="input-voter-name"
            />
          </div>

          <div>
            <Label htmlFor="voter-email" className="text-sm font-medium text-gray-700">
              Votre email *
            </Label>
            <Input
              id="voter-email"
              type="email"
              value={formData.voterEmail}
              onChange={(e) => handleInputChange("voterEmail", e.target.value)}
              placeholder="email@exemple.com"
              required
              className="focus:ring-primary focus:border-primary"
              data-testid="input-voter-email"
            />
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              data-testid="checkbox-remember-me"
            />
            <Label
              htmlFor="remember-me"
              className="text-sm text-gray-700 cursor-pointer"
              data-testid="label-remember-me"
            >
              Se souvenir de moi
            </Label>
          </div>

          {/* Clear info button */}
          {(formData.voterName || formData.voterEmail) && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleClearInfo}
                className="text-xs text-gray-500 hover:text-gray-700 underline flex items-center gap-1"
                data-testid="button-clear-info"
              >
                <X className="w-3 h-3" />
                Effacer mes informations
              </button>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={voteMutation.isPending}
              data-testid="button-cancel-vote"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={voteMutation.isPending}
              className="bg-primary hover:bg-primary"
              data-testid="button-submit-vote"
            >
              {voteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Vote className="w-4 h-4 mr-2" />
              )}
              Confirmer le vote
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

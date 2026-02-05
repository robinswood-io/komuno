'use client';

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { Loader2, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Idea } from "@/shared/schema";

interface EditIdeaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: Idea | null;
}

export default function EditIdeaModal({ open, onOpenChange, idea }: EditIdeaModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposedBy, setProposedBy] = useState("");
  const [proposedByEmail, setProposedByEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mettre à jour les états quand l'idée change ou le modal s'ouvre
  useEffect(() => {
    if (open && idea) {
      setTitle(idea.title || "");
      setDescription(idea.description || "");
      setProposedBy(idea.proposedBy || "");
      setProposedByEmail(idea.proposedByEmail || "");
      // Format date for datetime-local input (remove seconds and timezone)
      const formattedDate = idea.createdAt ? new Date(idea.createdAt).toISOString().slice(0, 16) : "";
      setCreatedAt(formattedDate);
    } else if (!open) {
      // Réinitialiser les champs quand le modal se ferme
      setTitle("");
      setDescription("");
      setProposedBy("");
      setProposedByEmail("");
      setCreatedAt("");
    }
  }, [open, idea]);

  const updateIdeaMutation = useMutation({
    mutationFn: async (data: { title: string; description: string | null; proposedBy: string; proposedByEmail: string; createdAt?: string }) => {
      if (!idea) throw new Error("Aucune idée sélectionnée");

      const response = await fetch(`/api/admin/ideas/${idea.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la mise à jour");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({
        title: "✅ Idée modifiée",
        description: "L'idée a été mise à jour avec succès",
        variant: "default",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "❌ Erreur de validation",
        description: "Le titre est requis",
        variant: "destructive",
      });
      return;
    }

    updateIdeaMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      proposedBy: proposedBy.trim(),
      proposedByEmail: proposedByEmail.trim(),
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
    });
  };

  const handleCancel = () => {
    setTitle(idea?.title || "");
    setDescription(idea?.description || "");
    setProposedBy(idea?.proposedBy || "");
    setProposedByEmail(idea?.proposedByEmail || "");
    const formattedDate = idea?.createdAt ? new Date(idea.createdAt).toISOString().slice(0, 16) : "";
    setCreatedAt(formattedDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Modifier l'idée
          </DialogTitle>
          <DialogDescription>
            Modifier les informations de l'idée proposée
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-sm font-medium text-gray-700">
              Titre *
            </Label>
            <Input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entrez le titre de l'idée..."
              className="w-full"
              required
              maxLength={255}
              data-testid="input-edit-title"
            />
            <p className="text-xs text-gray-500">
              {title.length}/255 caractères
            </p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700">
              Description (vous pouvez ajouter des images)
            </Label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Décrivez votre idée en détail... Vous pouvez ajouter du formatage et des images."
              maxLength={10000}
              testId="editor-edit-description"
            />
          </div>

          {/* Author Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-author-name" className="text-sm font-medium text-gray-700">
                Nom de l'auteur *
              </Label>
              <Input
                id="edit-author-name"
                type="text"
                value={proposedBy}
                onChange={(e) => setProposedBy(e.target.value)}
                placeholder="Nom de l'auteur..."
                className="w-full"
                required
                maxLength={100}
                data-testid="input-edit-author-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-author-email" className="text-sm font-medium text-gray-700">
                Email de l'auteur *
              </Label>
              <Input
                id="edit-author-email"
                type="email"
                value={proposedByEmail}
                onChange={(e) => setProposedByEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="w-full"
                required
                data-testid="input-edit-author-email"
              />
            </div>
          </div>

          {/* Publication Date Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-created-at" className="text-sm font-medium text-gray-700">
              📅 Date de publication
            </Label>
            <Input
              id="edit-created-at"
              type="datetime-local"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="w-full"
              data-testid="input-edit-created-at"
            />
            <p className="text-xs text-gray-500">
              Modifiez la date et l'heure de publication de cette idée
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateIdeaMutation.isPending}
              className="px-6"
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={updateIdeaMutation.isPending || !title.trim()}
              className="bg-primary hover:bg-primary px-6"
              data-testid="button-save-edit"
            >
              {updateIdeaMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

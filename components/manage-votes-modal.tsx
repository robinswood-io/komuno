'use client';

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ThumbsUp, Mail, User, Plus, Loader2, Download, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Idea } from "@/shared/schema";
import { exportVoters } from "@/lib/export-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IdeaWithVotes extends Omit<Idea, "voteCount"> {
  voteCount: number;
}

interface Vote {
  id: string;
  ideaId: string;
  voterName: string;
  voterEmail: string;
  createdAt: Date;
}

interface ManageVotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: IdeaWithVotes | null;
}

export default function ManageVotesModal({
  open,
  onOpenChange,
  idea
}: ManageVotesModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVote, setNewVote] = useState({
    voterName: "",
    voterEmail: ""
  });

  const { data: votes, isLoading } = useQuery<Vote[]>({
    queryKey: ["/api/admin/votes", idea?.id],
    enabled: !!idea?.id && open,
  });

  const deleteVoteMutation = useMutation({
    mutationFn: async (voteId: string) => {
      await apiRequest("DELETE", `/api/admin/votes/${voteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/votes", idea?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({
        title: "Vote supprimé",
        description: "Le vote a été supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le vote",
        variant: "destructive",
      });
    },
  });

  const addVoteMutation = useMutation({
    mutationFn: async (vote: { ideaId: string; voterName: string; voterEmail: string }) => {
      const res = await apiRequest("POST", "/api/admin/votes", vote);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || "Erreur lors de l'ajout du vote");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/votes", idea?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      setNewVote({ voterName: "", voterEmail: "" });
      setShowAddForm(false);
      toast({
        title: "Vote ajouté",
        description: "Le vote a été ajouté avec succès",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!open) {
      setShowAddForm(false);
      setNewVote({ voterName: "", voterEmail: "" });
    }
  }, [open]);

  const handleDeleteVote = (voteId: string, voterName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le vote de ${voterName} ?`)) {
      deleteVoteMutation.mutate(voteId);
    }
  };

  const handleAddVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea || !newVote.voterName.trim() || !newVote.voterEmail.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le nom et l'email",
        variant: "destructive",
      });
      return;
    }

    addVoteMutation.mutate({
      ideaId: idea.id,
      voterName: newVote.voterName.trim(),
      voterEmail: newVote.voterEmail.trim(),
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!idea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader className="text-left pb-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-primary" />
                Gérer les votes
              </DialogTitle>
              <DialogDescription className="text-sm">
                Idée: <span className="font-medium">{idea.title}</span>
              </DialogDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!votes || votes.length === 0}
                  className="shrink-0"
                  data-testid="button-export-dropdown"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => votes && exportVoters(idea.title, votes.map(v => ({ ...v, createdAt: v.createdAt.toString() })), 'pdf')}
                  data-testid="button-export-pdf"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => votes && exportVoters(idea.title, votes.map(v => ({ ...v, createdAt: v.createdAt.toString() })), 'excel')}
                  data-testid="button-export-excel"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-3 bg-info-light rounded-lg">
                <div className="text-2xl font-bold text-info-dark">{votes?.length || 0}</div>
                <div className="text-gray-600">Votes</div>
              </div>
            </CardContent>
          </Card>

          {/* Add vote form */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Ajouter un vote</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  data-testid="button-toggle-add-vote-form"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {showAddForm ? "Annuler" : "Ajouter"}
                </Button>
              </div>
            </CardHeader>
            {showAddForm && (
              <CardContent>
                <form onSubmit={handleAddVote} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-voter-name" className="text-sm">Nom du votant *</Label>
                      <Input
                        id="add-voter-name"
                        value={newVote.voterName}
                        onChange={(e) => setNewVote(prev => ({ ...prev, voterName: e.target.value }))}
                        placeholder="Nom du votant"
                        required
                        data-testid="input-add-voter-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-voter-email" className="text-sm">Email du votant *</Label>
                      <Input
                        id="add-voter-email"
                        type="email"
                        value={newVote.voterEmail}
                        onChange={(e) => setNewVote(prev => ({ ...prev, voterEmail: e.target.value }))}
                        placeholder="email@exemple.com"
                        required
                        data-testid="input-add-voter-email"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={addVoteMutation.isPending}
                    className="bg-primary hover:bg-primary"
                    data-testid="button-submit-vote"
                  >
                    {addVoteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ajout...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter le vote
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Votes table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Liste des votants</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : votes && votes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Date du vote</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {votes.map((vote) => (
                        <TableRow key={vote.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              {vote.voterName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              <a
                                href={`mailto:${vote.voterEmail}`}
                                className="text-info hover:underline"
                              >
                                {vote.voterEmail}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDate(vote.createdAt.toString())}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteVote(vote.id, vote.voterName)}
                              disabled={deleteVoteMutation.isPending}
                              className="text-error hover:text-error-dark hover:bg-error-light"
                              data-testid={`button-delete-vote-${vote.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ThumbsUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Aucun vote</h3>
                  <p className="text-gray-500">Aucune personne n'a encore voté pour cette idée.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

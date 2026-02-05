'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ThumbsUp, Lightbulb, Loader2, Vote, Plus, ChevronDown, ChevronUp, Star, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SimplePagination } from "@/components/ui/pagination";
import VoteModal from "@/components/vote-modal";
import type { Idea } from "@/shared/schema";
import { IDEA_STATUS } from "@/shared/schema";
import { shareContent, isShareSupported } from "@/lib/share-utils";
import { useToast } from "@/hooks/use-toast";
// import { getShortAppName } from '@/lib/config/branding';
import { useBranding } from '@/contexts/BrandingContext';
import { isNewIdea } from "@/lib/adminUtils";
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';

interface IdeaWithVotes extends Omit<Idea, "voteCount"> {
  voteCount: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case IDEA_STATUS.APPROVED:
      return 'bg-success-light text-success-dark border-success ring-1 ring-success';
    case IDEA_STATUS.PENDING:
      return 'bg-warning-light text-warning-dark border-warning ring-1 ring-warning';
    case IDEA_STATUS.REJECTED:
      return 'bg-error-light text-error-dark border-error ring-1 ring-error';
    case IDEA_STATUS.UNDER_REVIEW:
      return 'bg-info-light text-info-dark border-info ring-1 ring-info';
    case IDEA_STATUS.POSTPONED:
      return 'bg-muted text-muted-foreground border-border ring-1 ring-border';
    case IDEA_STATUS.COMPLETED:
      return 'bg-success-light text-success-dark border-success ring-1 ring-success';
    default:
      return 'bg-muted text-muted-foreground border-border ring-1 ring-border';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case IDEA_STATUS.APPROVED:
      return 'Idée soumise au vote';
    case IDEA_STATUS.PENDING:
      return 'En attente';
    case IDEA_STATUS.REJECTED:
      return 'Rejetée';
    case IDEA_STATUS.UNDER_REVIEW:
      return 'En cours d\'étude';
    case IDEA_STATUS.POSTPONED:
      return 'Reportée';
    case IDEA_STATUS.COMPLETED:
      return 'Réalisée';
    default:
      return status;
  }
};

interface IdeasSectionProps {
  onNavigateToPropose?: () => void;
}

export default function IdeasSection({ onNavigateToPropose }: IdeasSectionProps) {
  useBranding(); // Load branding context
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithVotes | null>(null);
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const limit = 20;
  const { toast } = useToast();

  // REST API + React Query
  const { data: response, isLoading, error } = useQuery({
    queryKey: queryKeys.ideas.list({ page, limit }),
    queryFn: () => api.get<PaginatedResponse<IdeaWithVotes>>('/api/ideas', { page, limit }),
  });

  const ideas = (response?.success && 'data' in response ? response.data : []) as IdeaWithVotes[];
  const total = (response?.success && 'total' in response ? response.total : 0) as number;
  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error">Erreur lors du chargement des idées</p>
      </div>
    );
  }

  const toggleDescription = (ideaId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(ideaId)) {
        next.delete(ideaId);
      } else {
        next.add(ideaId);
      }
      return next;
    });
  };

  const handleShare = async (idea: IdeaWithVotes) => {
    try {
      await shareContent({
        title: idea.title,
        text: idea.description || '',
        url: window.location.href
      });
      toast({
        title: "Partagé",
        description: "L'idée a été partagée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de partager l'idée",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2" data-testid="ideas-page-title">
            <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8" />
            Idées - Boîte à Kiffs
          </h1>
          <p className="text-gray-600 mt-1">Proposez vos idées et votez pour vos préférées</p>
        </div>
        {onNavigateToPropose && (
          <Button
            onClick={onNavigateToPropose}
            className="bg-primary hover:bg-primary text-white shadow-md"
            data-testid="button-propose-idea"
          >
            <Plus className="mr-2 h-4 w-4" />
            Proposer une idée
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Ideas Grid */}
      {!isLoading && ideas.length === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="text-center py-12">
            <Lightbulb className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">Aucune idée pour le moment</p>
            <p className="text-gray-500 text-sm mt-2">Soyez le premier à proposer une idée !</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && ideas.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {ideas.map((idea) => {
              const isExpanded = expandedDescriptions.has(idea.id);
              const descriptionTooLong = (idea.description?.length || 0) > 150;
              const displayDescription = isExpanded || !descriptionTooLong
                ? idea.description
                : idea.description?.slice(0, 150) + '...';
              const isNew = isNewIdea(idea.createdAt);

              return (
                <Card
                  key={idea.id}
                  className="bg-white hover:shadow-lg transition-shadow duration-200 border border-gray-200 relative overflow-hidden"
                >
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(idea.status)}`}>
                      {getStatusLabel(idea.status)}
                    </span>
                  </div>

                  {/* New Badge */}
                  {isNew && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-info text-white animate-pulse">
                        <Star className="w-3 h-3" />
                        Nouveau
                      </span>
                    </div>
                  )}

                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {/* Title */}
                      <h3 className={`text-lg sm:text-xl font-semibold text-gray-900 pr-24 ${isNew ? 'pt-6' : ''}`}>
                        {idea.title}
                      </h3>

                      {/* Description */}
                      {idea.description && (
                        <div>
                          <p className="text-gray-700 text-sm sm:text-base whitespace-pre-wrap">
                            {displayDescription}
                          </p>
                          {descriptionTooLong && (
                            <button
                              onClick={() => toggleDescription(idea.id)}
                              className="text-primary hover:text-primary text-sm font-medium mt-2 flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Voir moins
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  Voir plus
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-4">
                          {/* Vote Count */}
                          <div className="flex items-center gap-1 text-gray-600">
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm font-medium">{idea.voteCount || 0}</span>
                          </div>

                          {/* Proposed By */}
                          <div className="text-xs text-gray-500">
                            Par {idea.proposedBy}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Share Button */}
                          {isShareSupported() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare(idea)}
                              className="text-gray-600 hover:text-primary"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Vote Button */}
                          {idea.status === IDEA_STATUS.APPROVED && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedIdea(idea);
                                setVoteModalOpen(true);
                              }}
                              className="bg-primary hover:bg-primary text-white"
                              data-testid={`button-vote-${idea.id}`}
                            >
                              <Vote className="mr-1 h-4 w-4" />
                              Voter
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <SimplePagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Vote Modal */}
      {selectedIdea && (
        <VoteModal
          idea={selectedIdea}
          open={voteModalOpen}
          onOpenChange={setVoteModalOpen}
        />
      )}
    </div>
  );
}

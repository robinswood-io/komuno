'use client';

import { useQuery } from '@tanstack/react-query';
import { Wrench, ExternalLink, Star, Tag, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ToolCategory, ToolWithCategory } from '@/shared/schema';
import { useModuleGuard } from '@/hooks/use-module-guard';

export default function ToolsPage() {
  const { isEnabled, isLoading: moduleLoading } = useModuleGuard('tools');
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ToolCategory[]>({
    queryKey: ['/api/tools/categories'],
  });

  const { data: tools = [], isLoading: toolsLoading } = useQuery<ToolWithCategory[]>({
    queryKey: ['/api/tools'],
  });

  const { data: featuredTools = [] } = useQuery<ToolWithCategory[]>({
    queryKey: ['/api/tools/featured'],
  });

  const isLoading = categoriesLoading || toolsLoading || moduleLoading;

  // Grouper les outils par catégorie
  const toolsByCategory = tools.reduce((acc, tool) => {
    const categoryId = tool.categoryId || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(tool);
    return acc;
  }, {} as Record<string, ToolWithCategory[]>);

  const uncategorizedTools = toolsByCategory['uncategorized'] || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isEnabled) {
    return null;
  }

  // Si aucun outil n'existe, afficher le message "coming soon"
  if (tools.length === 0) {
    return (
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* En-tête de la page */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-full p-4">
              <Wrench className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Les outils du dirigeant
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez nos outils et ressources exclusives pour accompagner votre réussite entrepreneuriale
          </p>
        </div>

        {/* Section "Coming Soon" */}
        <div className="bg-primary rounded-xl shadow-lg p-8 sm:p-12 text-white text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Bientôt disponible</h2>
          <p className="text-success-light text-lg mb-6">
            Nous préparons une suite d'outils innovants pour vous accompagner dans votre développement professionnel.
          </p>
          <div className="inline-flex items-center bg-white/20 rounded-full px-6 py-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse mr-3"></div>
            <span className="font-medium">En cours de développement</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
      {/* En-tête */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex justify-center mb-4">
          <div className="bg-primary rounded-full p-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Les outils du dirigeant
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
          Découvrez nos outils et ressources exclusives pour accompagner votre réussite entrepreneuriale
        </p>
      </div>

      {/* Outils mis en avant */}
      {featuredTools.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900">Outils recommandés</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} featured />
            ))}
          </div>
        </div>
      )}

      {/* Outils par catégorie */}
      {categories.map((category) => {
        const categoryTools = toolsByCategory[category.id] || [];
        if (categoryTools.length === 0) return null;

        return (
          <div key={category.id} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${category.color || '#10b981'}20` }}
              >
                <Wrench className="w-5 h-5" style={{ color: category.color || '#10b981' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                {category.description && (
                  <p className="text-gray-600">{category.description}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Outils sans catégorie */}
      {uncategorizedTools.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Wrench className="w-5 h-5 text-gray-500" />
            <h2 className="text-2xl font-bold text-gray-900">Autres outils</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uncategorizedTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      )}

      {/* Appel à l'action */}
      <div className="mt-12 text-center">
        <div className="bg-gray-50 rounded-xl p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Vous avez des suggestions ?
          </h3>
          <p className="text-gray-600 mb-6">
            Nous aimerions connaître vos besoins pour enrichir cette liste d'outils.
          </p>
          <button
            onClick={() => window.location.href = 'mailto:contact@cjd-amiens.fr?subject=Suggestions pour les outils du dirigeant'}
            className="bg-primary hover:bg-primary/90 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200"
          >
            Nous faire part de vos idées
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant carte d'outil
function ToolCard({ tool, featured = false }: { tool: ToolWithCategory; featured?: boolean }) {
  return (
    <Card className={`hover:shadow-lg transition-shadow duration-300 ${featured ? 'border-primary border-2' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {tool.logoUrl ? (
            <img
              src={tool.logoUrl}
              alt={tool.name}
              className="w-12 h-12 object-contain rounded-lg bg-gray-50 p-1"
            />
          ) : (
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {tool.name}
              {featured && <Star className="w-4 h-4 text-yellow-500" />}
            </CardTitle>
            {tool.price && (
              <CardDescription className="text-primary font-medium">
                {tool.price}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tool.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{tool.description}</p>
        )}

        {tool.tags && tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {tool.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {tool.link && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(tool.link!, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Accéder à l'outil
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

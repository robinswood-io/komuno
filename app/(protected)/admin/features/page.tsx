'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/contexts/BrandingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Lightbulb,
  Calendar,
  Users,
  DollarSign,
  Bell,
  Shield,
  Palette,
  Sparkles,
} from 'lucide-react';

interface Feature {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  category: string;
}

/**
 * Page Toggle Features
 * Permet d'activer/désactiver les fonctionnalités de l'application
 */
export default function AdminFeaturesPage() {
  const { toast } = useToast();
  const { branding } = useBranding();
  const [isSaving, setIsSaving] = useState(false);

  // Features de l'application (mock pour démonstration)
  const [features, setFeatures] = useState<Feature[]>([
    {
      id: 'ideas',
      name: branding?.app?.ideaBoxName || 'Boîte à Kiffs',
      description: 'Système de proposition et vote d\'idées',
      icon: Lightbulb,
      enabled: true,
      category: 'core',
    },
    {
      id: 'events',
      name: 'Événements',
      description: 'Gestion des événements et inscriptions',
      icon: Calendar,
      enabled: true,
      category: 'core',
    },
    {
      id: 'members',
      name: 'CRM Membres',
      description: 'Gestion des membres et statistiques',
      icon: Users,
      enabled: true,
      category: 'crm',
    },
    {
      id: 'patrons',
      name: 'Sponsors',
      description: 'Gestion des sponsors et mécènes',
      icon: DollarSign,
      enabled: true,
      category: 'crm',
    },
    {
      id: 'notifications',
      name: 'Notifications Push',
      description: 'Notifications push web pour les utilisateurs',
      icon: Bell,
      enabled: false,
      category: 'engagement',
    },
    {
      id: 'branding',
      name: 'Personnalisation',
      description: 'Configuration du branding et des couleurs',
      icon: Palette,
      enabled: true,
      category: 'customization',
    },
  ]);

  const handleToggle = (featureId: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Simuler une sauvegarde API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Configuration sauvegardée',
        description: 'Les modifications des fonctionnalités ont été enregistrées',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    { id: 'core', name: 'Fonctionnalités principales', color: 'bg-info' },
    { id: 'crm', name: 'CRM & Gestion', color: 'bg-success' },
    { id: 'engagement', name: 'Engagement', color: 'bg-purple-500' },
    { id: 'security', name: 'Sécurité', color: 'bg-error' },
    { id: 'customization', name: 'Personnalisation', color: 'bg-warning' },
    { id: 'ai', name: 'Intelligence Artificielle', color: 'bg-pink-500' },
  ];

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Fonctionnalités</h1>
          <p className="text-muted-foreground">
            Activez ou désactivez les fonctionnalités de l'application
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Enregistrer les modifications
        </Button>
      </div>

      <div className="space-y-6">
        {categories.map((category) => {
          const categoryFeatures = features.filter((f) => f.category === category.id);

          if (categoryFeatures.length === 0) return null;

          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${category.color}`} />
                  {category.name}
                </CardTitle>
                <CardDescription>
                  {categoryFeatures.filter((f) => f.enabled).length} sur{' '}
                  {categoryFeatures.length} activées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{feature.name}</h3>
                            <Badge
                              variant={feature.enabled ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {feature.enabled ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={() => handleToggle(feature.id)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistiques globales */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques des fonctionnalités</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{features.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Actives</p>
              <p className="text-2xl font-bold text-success-dark">
                {features.filter((f) => f.enabled).length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Inactives</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {features.filter((f) => !f.enabled).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

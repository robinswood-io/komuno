'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useBranding } from '@/contexts/BrandingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Palette, RotateCcw, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { brandingCore, type BrandingCore } from '@/lib/config/branding-core';
import { api, type ApiResponse } from '@/lib/api/client';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface BrandingApiData {
  config?: string;
  isDefault?: boolean;
}

const appKeys: Array<keyof BrandingCore['app']> = ['name', 'shortName', 'description', 'ideaBoxName', 'showLogo'];
const orgKeys: Array<keyof BrandingCore['organization']> = ['name', 'fullName', 'tagline', 'url', 'email'];
const colorKeys: Array<keyof BrandingCore['colors']> = [
  'primary',
  'primaryDark',
  'primaryLight',
  'secondary',
  'accent',
];
const pwaKeys: Array<keyof BrandingCore['pwa']> = [
  'themeColor',
  'backgroundColor',
  'display',
  'orientation',
  'lang',
];
const linkKeys: Array<keyof BrandingCore['links']> = ['website', 'support'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function createDefaultConfig(): BrandingCore {
  return {
    organization: { ...(brandingCore.organization as Record<string, unknown>) } as typeof brandingCore.organization,
    app: { ...(brandingCore.app as Record<string, unknown>) } as typeof brandingCore.app,
    colors: { ...(brandingCore.colors as Record<string, unknown>) } as typeof brandingCore.colors,
    fonts: { ...(brandingCore.fonts as Record<string, unknown>) } as typeof brandingCore.fonts,
    pwa: { ...(brandingCore.pwa as Record<string, unknown>) } as typeof brandingCore.pwa,
    social: { ...(brandingCore.social as Record<string, unknown>) } as typeof brandingCore.social,
    links: { ...(brandingCore.links as Record<string, unknown>) } as typeof brandingCore.links,
  };
}

function mergeConfig(raw: unknown): BrandingCore {
  const base = createDefaultConfig();
  if (!isRecord(raw)) {
    return base;
  }

  if (isRecord(raw.app)) {
    appKeys.forEach((key) => {
      const value = getString((raw.app as Record<string, unknown>)?.[key as string]);
      if (value !== undefined) {
        (base.app as Record<string, unknown>)[key] = value;
      }
    });
  }

  if (isRecord(raw.organization)) {
    orgKeys.forEach((key) => {
      const value = getString((raw.organization as Record<string, unknown>)?.[key as string]);
      if (value !== undefined) {
        (base.organization as Record<string, unknown>)[key] = value;
      }
    });
  }

  if (isRecord(raw.colors)) {
    colorKeys.forEach((key) => {
      const value = getString((raw.colors as Record<string, unknown>)?.[key as string]);
      if (value !== undefined) {
        (base.colors as Record<string, unknown>)[key] = value;
      }
    });
  }

  if (isRecord(raw.pwa)) {
    pwaKeys.forEach((key) => {
      const value = getString((raw.pwa as Record<string, unknown>)?.[key as string]);
      if (value !== undefined) {
        (base.pwa as Record<string, unknown>)[key] = value;
      }
    });
  }

  if (isRecord(raw.links)) {
    linkKeys.forEach((key) => {
      const value = getString((raw.links as Record<string, unknown>)?.[key as string]);
      if (value !== undefined) {
        (base.links as Record<string, unknown>)[key] = value;
      }
    });
  }

  return base;
}

function isDefaultBranding(config: BrandingCore): boolean {
  const defaults = createDefaultConfig();
  const appMatches = appKeys.every((key) => config.app[key] === defaults.app[key]);
  const orgMatches = orgKeys.every((key) => config.organization[key] === defaults.organization[key]);
  const colorMatches = colorKeys.every((key) => config.colors[key] === defaults.colors[key]);
  return appMatches && orgMatches && colorMatches;
}

export default function AdminBrandingPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { branding, reloadBranding } = useBranding();
  const [config, setConfig] = useState<BrandingCore>(createDefaultConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Tous les utilisateurs connectés ont accès au branding
  const hasAccess = user !== null;

  const badgeLabel = useMemo(() => (isDefault ? 'Par défaut' : 'Personnalisé'), [isDefault]);

  const fetchBranding = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<ApiResponse<BrandingApiData>>('/api/admin/branding');
      const rawConfig = response.data?.config;
      const parsed = rawConfig ? JSON.parse(rawConfig) : null;
      const merged = mergeConfig(parsed);
      setConfig(merged);
      setIsDefault(response.data?.isDefault ?? isDefaultBranding(merged));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de charger la configuration';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!hasAccess) {
      setIsLoading(false);
      return;
    }
    void fetchBranding();
  }, [fetchBranding, hasAccess]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.put<ApiResponse<BrandingApiData>>('/api/admin/branding', {
        config: JSON.stringify(config),
      });
      if (response.success) {
        // Recharger le branding pour appliquer les nouvelles couleurs
        await reloadBranding();
        toast({
          title: 'Branding sauvegardé avec succès',
          description: 'Les modifications ont été enregistrées et appliquées.',
        });
        setIsDefault(isDefaultBranding(config));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de sauvegarder';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await api.delete<ApiResponse<BrandingApiData>>('/api/admin/branding');
      const defaults = createDefaultConfig();
      setConfig(defaults);
      setIsDefault(true);
      // Recharger le branding pour appliquer les couleurs par défaut
      await reloadBranding();
      toast({
        title: 'Configuration réinitialisée aux valeurs par défaut',
        description: 'Les couleurs par défaut ont été appliquées.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de réinitialiser';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Valider le type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Type de fichier non valide',
        description: 'Formats acceptés: PNG, JPG, SVG, WebP',
        variant: 'destructive',
      });
      return;
    }

    // Valider la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'Taille maximale: 5MB',
        variant: 'destructive',
      });
      return;
    }

    setLogoFile(file);

    // Créer preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await fetch('/api/admin/branding/logo', {
        method: 'POST',
        body: formData,
        headers: {
          // API client ajoute automatiquement auth headers
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Échec de l\'upload');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Logo uploadé avec succès',
          description: `Le logo a été enregistré: ${result.data.filename}`,
        });

        // Recharger le branding
        await reloadBranding();

        // Réinitialiser le formulaire
        setLogoFile(null);
        setLogoPreview(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d\'uploader le logo';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (!hasAccess && !isLoading) {
    return (
      <div className="container py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Accès refusé</CardTitle>
            <CardDescription>
              Cette page est réservée aux administrateurs. Veuillez vous connecter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild data-testid="button-back-admin">
              <Link href="/admin">Retour à l'administration</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnalisation Branding</h1>
          <p className="text-muted-foreground">
            Personnalisation de l'application et de l'organisation.
          </p>
        </div>
        <Badge data-testid="badge-branding-status">{badgeLabel}</Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-branding">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" data-testid="button-reset-branding">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la réinitialisation</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes les personnalisations seront supprimées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                data-testid="button-confirm-reset-branding"
                onClick={() => void handleReset()}
              >
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuration
          </CardTitle>
          <CardDescription>Modifiez les informations et couleurs principales.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="app">
            <AccordionItem value="app">
              <AccordionTrigger data-testid="accordion-trigger-app">Application</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom de l'application</label>
                  <Input
                    data-testid="input-app-name"
                    value={config.app.name}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        app: { ...prev.app, name: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom court</label>
                  <Input
                    data-testid="input-app-short-name"
                    value={config.app.shortName}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        app: { ...prev.app, shortName: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    data-testid="input-app-description"
                    value={config.app.description}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        app: { ...prev.app, description: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom boîte à idées</label>
                  <Input
                    data-testid="input-app-idea-box-name"
                    value={config.app.ideaBoxName}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        app: { ...prev.app, ideaBoxName: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="organization">
              <AccordionTrigger data-testid="accordion-trigger-organization">Organisation</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom de l'organisation</label>
                  <Input
                    data-testid="input-org-name"
                    value={config.organization.name}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        organization: { ...prev.organization, name: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom complet</label>
                  <Input
                    data-testid="input-org-full-name"
                    value={config.organization.fullName}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        organization: { ...prev.organization, fullName: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Baseline</label>
                  <Input
                    data-testid="input-org-tagline"
                    value={config.organization.tagline}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        organization: { ...prev.organization, tagline: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site web</label>
                  <Input
                    data-testid="input-org-url"
                    value={config.organization.url}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        organization: { ...prev.organization, url: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    data-testid="input-org-email"
                    value={config.organization.email}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        organization: { ...prev.organization, email: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="appearance">
              <AccordionTrigger data-testid="accordion-trigger-appearance">Apparence</AccordionTrigger>
              <AccordionContent className="space-y-6">
                {/* Logo Section */}
                <div className="space-y-3 pb-4 border-b">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Logo de l'application
                  </label>

                  {/* Current Logo */}
                  {branding.assets?.logo && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Logo actuel:</p>
                      <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                        <Image
                          src={branding.assets.logo}
                          alt="Logo actuel"
                          width={80}
                          height={80}
                          className="object-contain"
                        />
                        <div className="text-xs text-muted-foreground">
                          {branding.assets.logo}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logo Preview */}
                  {logoPreview && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Prévisualisation:</p>
                      <div className="flex items-center gap-4 p-3 border rounded-lg bg-primary/5">
                        <Image
                          src={logoPreview}
                          alt="Prévisualisation"
                          width={80}
                          height={80}
                          className="object-contain"
                        />
                        <div className="text-xs text-muted-foreground">
                          {logoFile?.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Controls */}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={handleLogoFileChange}
                      className="flex-1"
                      data-testid="input-logo-file"
                    />
                    <Button
                      onClick={handleLogoUpload}
                      disabled={!logoFile || isUploadingLogo}
                      data-testid="button-upload-logo"
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés: PNG, JPG, SVG, WebP. Taille max: 5MB
                  </p>
                </div>

                {/* Show Logo Toggle */}
                <div className="flex items-center justify-between space-x-4 pb-4 border-b">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-logo" className="text-sm font-medium">
                      Afficher le logo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Afficher ou masquer le logo dans l'en-tête de l'application
                    </p>
                  </div>
                  <Switch
                    id="show-logo"
                    checked={config.app.showLogo ?? true}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        app: { ...prev.app, showLogo: checked },
                      } as BrandingCore))
                    }
                    data-testid="switch-show-logo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Couleur primaire</label>
                  <div className="flex items-center gap-3">
                    <Input
                      data-testid="input-color-primary"
                      value={config.colors.primary}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, primary: event.target.value },
                        } as BrandingCore))
                      }
                    />
                    <Input
                      type="color"
                      aria-label="Couleur primaire"
                      data-testid="input-color-primary-picker"
                      value={config.colors.primary}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, primary: event.target.value },
                        } as BrandingCore))
                      }
                      className="w-14 h-10 p-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primaire sombre</label>
                  <div className="flex items-center gap-3">
                    <Input
                      data-testid="input-color-primary-dark"
                      value={config.colors.primaryDark}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, primaryDark: event.target.value },
                        } as BrandingCore))
                      }
                    />
                    <Input
                      type="color"
                      aria-label="Primaire sombre"
                      data-testid="input-color-primary-dark-picker"
                      value={config.colors.primaryDark}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, primaryDark: event.target.value },
                        } as BrandingCore))
                      }
                      className="w-14 h-10 p-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primaire claire</label>
                  <div className="flex items-center gap-3">
                    <Input
                      data-testid="input-color-primary-light"
                      value={config.colors.primaryLight}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, primaryLight: event.target.value },
                        } as BrandingCore))
                      }
                    />
                    <Input
                      type="color"
                      aria-label="Primaire claire"
                      data-testid="input-color-primary-light-picker"
                      value={config.colors.primaryLight}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, primaryLight: event.target.value },
                        } as BrandingCore))
                      }
                      className="w-14 h-10 p-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Couleur secondaire</label>
                  <div className="flex items-center gap-3">
                    <Input
                      data-testid="input-color-secondary"
                      value={config.colors.secondary}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, secondary: event.target.value },
                        } as BrandingCore))
                      }
                    />
                    <Input
                      type="color"
                      aria-label="Couleur secondaire"
                      data-testid="input-color-secondary-picker"
                      value={config.colors.secondary}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, secondary: event.target.value },
                        } as BrandingCore))
                      }
                      className="w-14 h-10 p-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pwa" data-testid="accordion-pwa">
              <AccordionTrigger data-testid="accordion-trigger-pwa">PWA</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Couleur du thème</label>
                  <div className="flex items-center gap-3">
                    <Input
                      data-testid="input-pwa-theme-color"
                      value={config.pwa.themeColor}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          pwa: { ...prev.pwa, themeColor: event.target.value },
                        } as BrandingCore))
                      }
                    />
                    <Input
                      type="color"
                      aria-label="Couleur du thème"
                      data-testid="input-pwa-theme-color-picker"
                      value={config.pwa.themeColor}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          pwa: { ...prev.pwa, themeColor: event.target.value },
                        } as BrandingCore))
                      }
                      className="w-14 h-10 p-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Couleur de fond</label>
                  <div className="flex items-center gap-3">
                    <Input
                      data-testid="input-pwa-bg-color"
                      value={config.pwa.backgroundColor}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          pwa: { ...prev.pwa, backgroundColor: event.target.value },
                        } as BrandingCore))
                      }
                    />
                    <Input
                      type="color"
                      aria-label="Couleur de fond"
                      data-testid="input-pwa-bg-color-picker"
                      value={config.pwa.backgroundColor}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          pwa: { ...prev.pwa, backgroundColor: event.target.value },
                        } as BrandingCore))
                      }
                      className="w-14 h-10 p-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="links" data-testid="accordion-links">
              <AccordionTrigger data-testid="accordion-trigger-links">Liens</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site principal</label>
                  <Input
                    value={config.links.website}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        links: { ...prev.links, website: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Support</label>
                  <Input
                    value={config.links.support}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        links: { ...prev.links, support: event.target.value },
                      } as BrandingCore))
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

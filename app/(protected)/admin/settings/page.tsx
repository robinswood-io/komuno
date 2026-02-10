'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/contexts/BrandingContext';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdministratorsTab } from './_components/administrators-tab';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Save,
  Calendar,
  Lightbulb,
  Package,
  Wrench,
  AlertCircle,
  Palette,
  Settings as SettingsIcon,
  Bell,
  Upload,
  RotateCcw,
  Users,
  Shield,
} from 'lucide-react';
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

interface ModuleConfig {
  enabled: boolean;
  label: string;
  description: string;
}

interface ModulesConfig {
  events: ModuleConfig;
  ideas: ModuleConfig;
  loans: ModuleConfig;
  tools: ModuleConfig;
}

const MODULE_ICONS = {
  events: Calendar,
  ideas: Lightbulb,
  loans: Package,
  tools: Wrench,
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { branding, reloadBranding } = useBranding();
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'general');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Query - Utilisateur actuel pour vérifier le rôle
  const { data: currentUser } = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ email: string; role: string }>>('/api/auth/user');
      return response.data;
    },
  });

  const canManageAdmins = currentUser?.role === 'super_admin';

  // Modules state
  const [modules, setModules] = useState<ModulesConfig | null>(null);

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    appName: '',
    organizationName: '',
    email: '',
    timezone: 'Europe/Paris',
    language: 'fr',
    itemsPerPage: '20',
  });

  // Branding colors
  const [brandingColors, setBrandingColors] = useState({
    primary: '',
    success: '',
    warning: '',
    error: '',
  });

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (branding) {
      setModules((branding.modules as ModulesConfig) || null);
      setGeneralSettings({
        appName: branding.app?.name || '',
        organizationName: branding.organization?.name || '',
        email: branding.organization?.email || '',
        timezone: 'Europe/Paris',
        language: 'fr',
        itemsPerPage: '20',
      });
      setBrandingColors({
        primary: branding.colors?.primary || '',
        success: branding.colors?.success || '',
        warning: branding.colors?.warning || '',
        error: branding.colors?.error || '',
      });

      // Logo preview
      const appWithLogo = branding.app as { logoUrl?: string };
      if (appWithLogo?.logoUrl) {
        setLogoPreview(appWithLogo.logoUrl);
      }
    }
  }, [branding]);

  const handleToggleModule = (moduleKey: keyof ModulesConfig) => {
    if (!modules) return;
    setModules({
      ...modules,
      [moduleKey]: {
        ...modules[moduleKey],
        enabled: !modules[moduleKey].enabled,
      },
    });
  };

  const handleSaveModules = async () => {
    if (!modules || !branding) return;

    setIsSaving(true);
    try {
      const updatedConfig = {
        ...branding,
        modules,
      };

      const response = await api.post<ApiResponse<unknown>>(
        '/api/admin/branding/config',
        { config: JSON.stringify(updatedConfig) }
      );

      if (response.success) {
        toast({
          title: 'Modules enregistrés',
          description: 'La configuration des modules a été mise à jour',
        });
        await reloadBranding();
      }
    } catch (error) {
      console.error('Erreur save modules:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les modules',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!branding) return;

    setIsSaving(true);
    try {
      const updatedConfig = {
        ...branding,
        app: {
          ...branding.app,
          name: generalSettings.appName,
        },
        organization: {
          ...branding.organization,
          name: generalSettings.organizationName,
          email: generalSettings.email,
        },
      };

      const response = await api.post<ApiResponse<unknown>>(
        '/api/admin/branding/config',
        { config: JSON.stringify(updatedConfig) }
      );

      if (response.success) {
        toast({
          title: 'Configuration enregistrée',
          description: 'Les paramètres généraux ont été mis à jour',
        });
        await reloadBranding();
      }
    } catch (error) {
      console.error('Erreur save general:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!branding) return;

    setIsSaving(true);
    try {
      const updatedConfig = {
        ...branding,
        colors: {
          ...branding.colors,
          ...brandingColors,
        },
      };

      const response = await api.post<ApiResponse<unknown>>(
        '/api/admin/branding/config',
        { config: JSON.stringify(updatedConfig) }
      );

      if (response.success) {
        toast({
          title: 'Branding enregistré',
          description: 'L\'apparence a été mise à jour',
        });
        await reloadBranding();
      }
    } catch (error) {
      console.error('Erreur save branding:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le branding',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Logo uploadé',
          description: 'Le logo a été mis à jour avec succès',
        });
        setLogoFile(null);
        await reloadBranding();
      }
    } catch (error) {
      console.error('Erreur upload logo:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleResetBranding = async () => {
    setIsResetting(true);
    try {
      const response = await api.post<ApiResponse<unknown>>('/api/admin/branding/reset');

      if (response.success) {
        toast({
          title: 'Branding réinitialisé',
          description: 'La configuration a été restaurée par défaut',
        });
        await reloadBranding();
      }
    } catch (error) {
      console.error('Erreur reset branding:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de réinitialiser le branding',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!branding || !modules) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-2">
          Gérez la configuration de votre application
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Général
          </TabsTrigger>
          <TabsTrigger value="modules">
            <Wrench className="h-4 w-4 mr-2" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Apparence
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          {canManageAdmins && (
            <TabsTrigger value="admins">
              <Users className="h-4 w-4 mr-2" />
              Administrateurs
            </TabsTrigger>
          )}
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration générale</CardTitle>
              <CardDescription>
                Informations de base de votre application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appName">Nom de l'application</Label>
                <Input
                  id="appName"
                  value={generalSettings.appName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, appName: e.target.value })}
                  placeholder="Mon Application"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de l'organisation</Label>
                <Input
                  id="orgName"
                  value={generalSettings.organizationName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, organizationName: e.target.value })}
                  placeholder="Mon Organisation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email de contact</Label>
                <Input
                  id="email"
                  type="email"
                  value={generalSettings.email}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                  placeholder="contact@exemple.fr"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select
                    value={generalSettings.timezone}
                    onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Langue par défaut</Label>
                  <Select
                    value={generalSettings.language}
                    onValueChange={(value) => setGeneralSettings({ ...generalSettings, language: value })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemsPerPage">Éléments par page</Label>
                <Select
                  value={generalSettings.itemsPerPage}
                  onValueChange={(value) => setGeneralSettings({ ...generalSettings, itemsPerPage: value })}
                >
                  <SelectTrigger id="itemsPerPage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveGeneral} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Les modules désactivés seront masqués du site public et ne pourront pas être modifiés.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.keys(modules) as Array<keyof ModulesConfig>).map((moduleKey) => {
              const module = modules[moduleKey];
              const Icon = MODULE_ICONS[moduleKey];

              return (
                <Card key={moduleKey} className={!module.enabled ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${module.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Icon className={`h-5 w-5 ${module.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{module.label}</CardTitle>
                          <CardDescription className="text-sm mt-1">{module.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={module.enabled}
                        onCheckedChange={() => handleToggleModule(moduleKey)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${module.enabled ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <span className="text-muted-foreground">
                        {module.enabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveModules} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Uploadez le logo de votre organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logoPreview && (
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img src={logoPreview} alt="Logo preview" className="max-h-32 object-contain" />
                </div>
              )}
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                />
                <Button
                  onClick={handleLogoUpload}
                  disabled={!logoFile || isUploadingLogo}
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Uploader
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Couleurs</CardTitle>
              <CardDescription>
                Personnalisez les couleurs de votre application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Couleur principale</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={brandingColors.primary}
                      onChange={(e) => setBrandingColors({ ...brandingColors, primary: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={brandingColors.primary}
                      onChange={(e) => setBrandingColors({ ...brandingColors, primary: e.target.value })}
                      placeholder="#00a844"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="successColor">Couleur succès</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={brandingColors.success}
                      onChange={(e) => setBrandingColors({ ...brandingColors, success: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={brandingColors.success}
                      onChange={(e) => setBrandingColors({ ...brandingColors, success: e.target.value })}
                      placeholder="#00c853"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warningColor">Couleur avertissement</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={brandingColors.warning}
                      onChange={(e) => setBrandingColors({ ...brandingColors, warning: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={brandingColors.warning}
                      onChange={(e) => setBrandingColors({ ...brandingColors, warning: e.target.value })}
                      placeholder="#ffa726"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="errorColor">Couleur erreur</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={brandingColors.error}
                      onChange={(e) => setBrandingColors({ ...brandingColors, error: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={brandingColors.error}
                      onChange={(e) => setBrandingColors({ ...brandingColors, error: e.target.value })}
                      placeholder="#f44336"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isResetting}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Réinitialiser le branding?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action restaurera la configuration par défaut. Toutes vos personnalisations seront perdues.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetBranding}>
                    Réinitialiser
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleSaveBranding} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configurez les notifications de l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  La configuration des notifications sera disponible prochainement.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Administrators Tab */}
        {canManageAdmins && (
          <TabsContent value="admins" className="space-y-6">
            <AdministratorsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

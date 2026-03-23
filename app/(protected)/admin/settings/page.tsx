'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/contexts/BrandingContext';
import { brandingCore } from '@/lib/config/branding-core';
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
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Send,
  Server,
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

  // Email SMTP state
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: 465,
    secure: true,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Query - Configuration email
  const { data: emailConfigData } = useQuery({
    queryKey: ['email-config'],
    queryFn: () => api.get<{ success: boolean; data: Record<string, unknown> | null }>('/api/admin/email-config'),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (emailConfigData?.data) {
      const cfg = emailConfigData.data as Record<string, unknown>;
      setEmailConfig(prev => ({
        ...prev,
        host: (cfg.host as string) || '',
        port: (cfg.port as number) || 465,
        secure: (cfg.secure as boolean) ?? true,
        username: (cfg.username as string) || '',
        fromEmail: (cfg.fromEmail as string) || '',
        fromName: (cfg.fromName as string) || '',
        password: '', // Jamais retourné par l'API
      }));
    }
  }, [emailConfigData]);

  // Query - Utilisateur actuel pour vérifier le rôle
  const { data: currentUser } = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ email: string; role: string }>>('/api/auth/user');
      return response.data;
    },
  });

  const canManageAdmins = currentUser?.role === 'super_admin';

  // Modules state — initialisé avec les defaults pour éviter le spinner infini
  const [modules, setModules] = useState<ModulesConfig>(() => brandingCore.modules as ModulesConfig);

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
    primaryDark: '',
    primaryLight: '',
    secondary: '',
    accent: '',
    success: '',
    successDark: '',
    successLight: '',
    warning: '',
    warningDark: '',
    error: '',
    errorDark: '',
    info: '',
    infoDark: '',
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    enableEmailNotifications: true,
    enablePushNotifications: true,
    notifyOnNewIdea: true,
    notifyOnNewEvent: true,
    notifyOnEventUpdate: true,
    notifyOnNewInscription: true,
    notifyOnLoanRequest: true,
  });

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (branding) {
      setModules((branding.modules as ModulesConfig) ?? (brandingCore.modules as ModulesConfig));
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
        primaryDark: branding.colors?.primaryDark || '',
        primaryLight: branding.colors?.primaryLight || '',
        secondary: branding.colors?.secondary || '',
        accent: branding.colors?.accent || '',
        success: branding.colors?.success || '',
        successDark: branding.colors?.successDark || '',
        successLight: branding.colors?.successLight || '',
        warning: branding.colors?.warning || '',
        warningDark: branding.colors?.warningDark || '',
        error: branding.colors?.error || '',
        errorDark: branding.colors?.errorDark || '',
        info: branding.colors?.info || '',
        infoDark: branding.colors?.infoDark || '',
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

  const handleSaveEmail = async () => {
    setIsSavingEmail(true);
    setEmailTestResult(null);
    try {
      const payload: Record<string, unknown> = {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        username: emailConfig.username,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
      };
      if (emailConfig.password) payload.password = emailConfig.password;
      await api.put<{ success: boolean }>('/api/admin/email-config', payload);
      toast({ title: 'Configuration email enregistrée', description: 'Serveur SMTP mis à jour' });
      setEmailConfig(prev => ({ ...prev, password: '' }));
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer la configuration SMTP', variant: 'destructive' });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setEmailTestResult(null);
    try {
      const result = await api.get<{ success: boolean; message?: string }>('/api/admin/test-email');
      if (result.success) {
        setEmailTestResult({ ok: true, message: 'Connexion SMTP réussie ✅' });
      } else {
        setEmailTestResult({ ok: false, message: result.message || 'Échec du test' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors du test';
      setEmailTestResult({ ok: false, message: msg });
    } finally {
      setIsTestingEmail(false);
    }
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

  if (!branding) {
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
        <TabsList className={`grid w-full ${canManageAdmins ? 'grid-cols-6' : 'grid-cols-5'}`}>
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
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          {canManageAdmins && (
            <TabsTrigger value="admins">
              <Users className="h-4 w-4 mr-2" />
              Admins
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
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-4">Couleurs principales</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primaire</Label>
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
                    <Label>Secondaire</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={brandingColors.secondary}
                        onChange={(e) => setBrandingColors({ ...brandingColors, secondary: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={brandingColors.secondary}
                        onChange={(e) => setBrandingColors({ ...brandingColors, secondary: e.target.value })}
                        placeholder="#1a1a1a"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={brandingColors.accent}
                        onChange={(e) => setBrandingColors({ ...brandingColors, accent: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={brandingColors.accent}
                        onChange={(e) => setBrandingColors({ ...brandingColors, accent: e.target.value })}
                        placeholder="#2196f3"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-4">Couleurs d'état</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Succès</Label>
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
                    <Label>Avertissement</Label>
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
                    <Label>Erreur</Label>
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
                  <div className="space-y-2">
                    <Label>Information</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={brandingColors.info}
                        onChange={(e) => setBrandingColors({ ...brandingColors, info: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={brandingColors.info}
                        onChange={(e) => setBrandingColors({ ...brandingColors, info: e.target.value })}
                        placeholder="#2196f3"
                        className="flex-1"
                      />
                    </div>
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
              <CardTitle>Paramètres généraux</CardTitle>
              <CardDescription>
                Activez ou désactivez les canaux de notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications par email</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoyer des notifications par email aux utilisateurs
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.enableEmailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, enableEmailNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications push</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoyer des notifications push sur navigateur
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.enablePushNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, enablePushNotifications: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Types de notifications</CardTitle>
              <CardDescription>
                Choisissez quels événements déclenchent des notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Nouvelle idée</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifier lors de la publication d'une nouvelle idée
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.notifyOnNewIdea}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, notifyOnNewIdea: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Nouvel événement</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifier lors de la création d'un nouvel événement
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.notifyOnNewEvent}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, notifyOnNewEvent: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modification d'événement</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifier les inscrits lors d'une modification d'événement
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.notifyOnEventUpdate}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, notifyOnEventUpdate: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Nouvelle inscription</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifier les admins lors d'une inscription à un événement
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.notifyOnNewInscription}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, notifyOnNewInscription: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Demande de prêt</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifier lors d'une nouvelle demande de prêt de matériel
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.notifyOnLoanRequest}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, notifyOnLoanRequest: checked })
                  }
                />
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

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Server className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Serveur d'envoi (SMTP)</CardTitle>
                  <CardDescription>
                    Configurez le serveur d'envoi pour les emails automatiques (notifications, propositions membres, etc.)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="smtp-host">Serveur SMTP *</Label>
                  <Input
                    id="smtp-host"
                    placeholder="ssl0.ovh.net"
                    value={emailConfig.host}
                    onChange={e => setEmailConfig({ ...emailConfig, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={emailConfig.port}
                    onChange={e => setEmailConfig({ ...emailConfig, port: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Secure toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Connexion sécurisée (SSL/TLS)</Label>
                  <p className="text-sm text-muted-foreground">
                    Activé par défaut sur le port 465. Désactiver pour STARTTLS (port 587).
                  </p>
                </div>
                <Switch
                  checked={emailConfig.secure}
                  onCheckedChange={checked => setEmailConfig({ ...emailConfig, secure: checked })}
                />
              </div>

              {/* Credentials */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Identifiant SMTP</Label>
                  <Input
                    id="smtp-user"
                    placeholder="user@domaine.fr"
                    value={emailConfig.username}
                    onChange={e => setEmailConfig({ ...emailConfig, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="smtp-pass"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={emailConfigData?.data ? '••••••••' : ''}
                      value={emailConfig.password}
                      onChange={e => setEmailConfig({ ...emailConfig, password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {emailConfigData?.data && !emailConfig.password && (
                    <p className="text-xs text-muted-foreground">Laisser vide pour conserver le mot de passe actuel</p>
                  )}
                </div>
              </div>

              {/* From */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-email">Email expéditeur *</Label>
                  <Input
                    id="from-email"
                    type="email"
                    placeholder="noreply@domaine.fr"
                    value={emailConfig.fromEmail}
                    onChange={e => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-name">Nom d'affichage</Label>
                  <Input
                    id="from-name"
                    placeholder="CJD Amiens"
                    value={emailConfig.fromName}
                    onChange={e => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                  />
                </div>
              </div>

              {/* Test result */}
              {emailTestResult && (
                <Alert className={emailTestResult.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {emailTestResult.ok
                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                    : <XCircle className="h-4 w-4 text-red-600" />
                  }
                  <AlertDescription className={emailTestResult.ok ? 'text-green-800' : 'text-red-800'}>
                    {emailTestResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Aperçu branding emails */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Palette className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Style des emails</CardTitle>
                  <CardDescription>
                    Les emails automatiques utilisent automatiquement la couleur principale définie dans l'onglet Apparence.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden text-sm">
                {/* Mini preview email */}
                <div
                  className="px-6 py-4 text-white text-center"
                  style={{ background: (branding as Record<string, unknown> & { colors?: { primary?: string } })?.colors?.primary || '#00a844' }}
                >
                  <p className="font-semibold">{(branding as Record<string, unknown> & { app?: { shortName?: string; name?: string } })?.app?.shortName || 'Votre app'}</p>
                  <p className="text-xs opacity-80 mt-0.5">Notification administrative</p>
                </div>
                <div className="p-4 bg-white space-y-2">
                  <p className="text-xs text-muted-foreground">Contenu de la notification...</p>
                  <div
                    className="inline-block text-white text-xs px-4 py-2 rounded"
                    style={{ background: (branding as Record<string, unknown> & { colors?: { primary?: string } })?.colors?.primary || '#00a844' }}
                  >
                    Accéder au tableau de bord
                  </div>
                </div>
                <div className="px-4 py-2 bg-gray-50 text-center text-xs text-gray-500">
                  {(branding as Record<string, unknown> & { organization?: { fullName?: string; name?: string } })?.organization?.fullName || 'Votre organisation'} — Notification automatique
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Modifiez la couleur principale dans l'onglet <button onClick={() => setActiveTab('branding')} className="text-primary underline">Apparence</button> pour changer le style des emails.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleTestEmail} disabled={isTestingEmail || !emailConfig.host}>
              {isTestingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Tester la connexion
            </Button>
            <Button onClick={handleSaveEmail} disabled={isSavingEmail}>
              {isSavingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
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

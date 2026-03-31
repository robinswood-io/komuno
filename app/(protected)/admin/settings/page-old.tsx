'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/contexts/BrandingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Bell, Mail, Shield, Settings as SettingsIcon, AlertTriangle, Users } from 'lucide-react';
import { AdministratorsTab } from './_components/administrators-tab';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

/**
 * Page Paramètres Admin
 * Configuration de l'application
 */
export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { branding } = useBranding();
  const [isSaving, setIsSaving] = useState(false);

  // Query - Utilisateur actuel pour vérifier le rôle
  const { data: currentUser } = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ email: string; role: string }>>('/api/auth/user');
      return response.data;
    },
  });

  const canManageAdmins = currentUser?.role === 'super_admin';

  // Configuration Email
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: process.env.NEXT_PUBLIC_SMTP_HOST || '',
    smtpPort: process.env.NEXT_PUBLIC_SMTP_PORT || '587',
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'CJD Amiens',
  });

  // Configuration Notifications
  const [notificationConfig, setNotificationConfig] = useState({
    enablePushNotifications: true,
    enableEmailNotifications: true,
    notifyOnNewIdea: true,
    notifyOnNewEvent: true,
    notifyOnNewInscription: true,
    notifyOnVote: false,
  });

  // Configuration Sécurité
  const [securityConfig, setSecurityConfig] = useState({
    sessionTimeout: '3600',
    requireEmailVerification: true,
    enableTwoFactor: false,
    maxLoginAttempts: '5',
    lockoutDuration: '900',
  });

  // Configuration Maintenance
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    maintenanceMode: false,
    maintenanceMessage: 'L\'application est actuellement en maintenance. Veuillez réessayer plus tard.',
    allowedIPs: '',
  });

  // Configuration Générale
  const [generalConfig, setGeneralConfig] = useState<{
    appName: string;
    supportEmail: string;
    itemsPerPage: string;
    defaultLanguage: string;
    timezone: string;
  }>({
    appName: branding?.app?.name || 'CJD Amiens - Boîte à Kiffs',
    supportEmail: 'contact@cjd-amiens.fr',
    itemsPerPage: '20',
    defaultLanguage: 'fr',
    timezone: 'Europe/Paris',
  });

  const handleSaveEmailConfig = async () => {
    setIsSaving(true);
    try {
      // Simuler la sauvegarde
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Configuration Email',
        description: 'Les paramètres email ont été enregistrés avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la configuration email',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotificationConfig = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Configuration Notifications',
        description: 'Les paramètres de notifications ont été enregistrés avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la configuration des notifications',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurityConfig = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Configuration Sécurité',
        description: 'Les paramètres de sécurité ont été enregistrés avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la configuration de sécurité',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMaintenanceConfig = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Configuration Maintenance',
        description: 'Les paramètres de maintenance ont été enregistrés avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la configuration de maintenance',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneralConfig = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Configuration Générale',
        description: 'Les paramètres généraux ont été enregistrés avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la configuration générale',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground">
            Configuration de l'application et des services
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Général
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Sécurité
          </TabsTrigger>
          {canManageAdmins && (
            <TabsTrigger value="administrators">
              <Users className="h-4 w-4 mr-2" />
              Administrateurs
            </TabsTrigger>
          )}
          <TabsTrigger value="maintenance">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        {/* Configuration Générale */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Générale</CardTitle>
              <CardDescription>
                Paramètres généraux de l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="appName">Nom de l'application</Label>
                    <Input
                      id="appName"
                      value={generalConfig.appName}
                      onChange={(e) =>
                        setGeneralConfig({ ...generalConfig, appName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="supportEmail">Email de support</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={generalConfig.supportEmail}
                      onChange={(e) =>
                        setGeneralConfig({ ...generalConfig, supportEmail: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="itemsPerPage">Items par page</Label>
                      <Input
                        id="itemsPerPage"
                        type="number"
                        value={generalConfig.itemsPerPage}
                        onChange={(e) =>
                          setGeneralConfig({ ...generalConfig, itemsPerPage: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultLanguage">Langue par défaut</Label>
                      <Select
                        value={generalConfig.defaultLanguage}
                        onValueChange={(value) =>
                          setGeneralConfig({ ...generalConfig, defaultLanguage: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Fuseau horaire</Label>
                      <Select
                        value={generalConfig.timezone}
                        onValueChange={(value) =>
                          setGeneralConfig({ ...generalConfig, timezone: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                          <SelectItem value="Europe/London">Europe/London</SelectItem>
                          <SelectItem value="America/New_York">America/New_York</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveGeneralConfig} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Email SMTP */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Email SMTP</CardTitle>
              <CardDescription>
                Paramètres pour l'envoi d'emails transactionnels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">Serveur SMTP</Label>
                    <Input
                      id="smtpHost"
                      value={emailConfig.smtpHost}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPort">Port SMTP</Label>
                    <Input
                      id="smtpPort"
                      value={emailConfig.smtpPort}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, smtpPort: e.target.value })
                      }
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpUser">Nom d'utilisateur</Label>
                    <Input
                      id="smtpUser"
                      value={emailConfig.smtpUser}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, smtpUser: e.target.value })
                      }
                      placeholder="your-email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPassword">Mot de passe</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={emailConfig.smtpPassword}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })
                      }
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromEmail">Email expéditeur</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={emailConfig.fromEmail}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, fromEmail: e.target.value })
                      }
                      placeholder="noreply@cjd-amiens.fr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromName">Nom expéditeur</Label>
                    <Input
                      id="fromName"
                      value={emailConfig.fromName}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, fromName: e.target.value })
                      }
                      placeholder="CJD Amiens"
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveEmailConfig} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des Notifications</CardTitle>
              <CardDescription>
                Gérez les notifications push et email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer les notifications push pour l'application PWA
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.enablePushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationConfig({
                        ...notificationConfig,
                        enablePushNotifications: checked,
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer les notifications par email
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.enableEmailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationConfig({
                        ...notificationConfig,
                        enableEmailNotifications: checked,
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <Label>Événements de notification</Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyNewIdea" className="font-normal">
                        Nouvelle idée proposée
                      </Label>
                      <Switch
                        id="notifyNewIdea"
                        checked={notificationConfig.notifyOnNewIdea}
                        onCheckedChange={(checked) =>
                          setNotificationConfig({
                            ...notificationConfig,
                            notifyOnNewIdea: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyNewEvent" className="font-normal">
                        Nouvel événement créé
                      </Label>
                      <Switch
                        id="notifyNewEvent"
                        checked={notificationConfig.notifyOnNewEvent}
                        onCheckedChange={(checked) =>
                          setNotificationConfig({
                            ...notificationConfig,
                            notifyOnNewEvent: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyNewInscription" className="font-normal">
                        Nouvelle inscription à un événement
                      </Label>
                      <Switch
                        id="notifyNewInscription"
                        checked={notificationConfig.notifyOnNewInscription}
                        onCheckedChange={(checked) =>
                          setNotificationConfig({
                            ...notificationConfig,
                            notifyOnNewInscription: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyVote" className="font-normal">
                        Nouveau vote sur une idée
                      </Label>
                      <Switch
                        id="notifyVote"
                        checked={notificationConfig.notifyOnVote}
                        onCheckedChange={(checked) =>
                          setNotificationConfig({
                            ...notificationConfig,
                            notifyOnVote: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveNotificationConfig} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Sécurité */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Sécurité</CardTitle>
              <CardDescription>
                Paramètres de sécurité et d'authentification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Durée de session (secondes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securityConfig.sessionTimeout}
                      onChange={(e) =>
                        setSecurityConfig({ ...securityConfig, sessionTimeout: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Durée avant déconnexion automatique
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="maxLoginAttempts">Tentatives de connexion max</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={securityConfig.maxLoginAttempts}
                      onChange={(e) =>
                        setSecurityConfig({ ...securityConfig, maxLoginAttempts: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Avant verrouillage du compte
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="lockoutDuration">Durée de verrouillage (secondes)</Label>
                  <Input
                    id="lockoutDuration"
                    type="number"
                    value={securityConfig.lockoutDuration}
                    onChange={(e) =>
                      setSecurityConfig({ ...securityConfig, lockoutDuration: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Durée du verrouillage après échec de connexion
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Vérification email obligatoire</Label>
                      <p className="text-sm text-muted-foreground">
                        Les nouveaux utilisateurs doivent vérifier leur email
                      </p>
                    </div>
                    <Switch
                      checked={securityConfig.requireEmailVerification}
                      onCheckedChange={(checked) =>
                        setSecurityConfig({
                          ...securityConfig,
                          requireEmailVerification: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Authentification à deux facteurs</Label>
                      <p className="text-sm text-muted-foreground">
                        Activer 2FA pour les administrateurs
                      </p>
                    </div>
                    <Switch
                      checked={securityConfig.enableTwoFactor}
                      onCheckedChange={(checked) =>
                        setSecurityConfig({
                          ...securityConfig,
                          enableTwoFactor: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveSecurityConfig} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Administrateurs */}
        {canManageAdmins && (
          <TabsContent value="administrators">
            <AdministratorsTab />
          </TabsContent>
        )}

        {/* Configuration Maintenance */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Mode Maintenance</CardTitle>
              <CardDescription>
                Configuration du mode maintenance de l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {maintenanceConfig.maintenanceMode && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Mode maintenance actif</AlertTitle>
                  <AlertDescription>
                    L'application est actuellement en mode maintenance. Les utilisateurs normaux ne peuvent pas accéder au site.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Activer le mode maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Désactiver l'accès public à l'application
                    </p>
                  </div>
                  <Switch
                    checked={maintenanceConfig.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setMaintenanceConfig({
                        ...maintenanceConfig,
                        maintenanceMode: checked,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maintenanceMessage">Message de maintenance</Label>
                  <Input
                    id="maintenanceMessage"
                    value={maintenanceConfig.maintenanceMessage}
                    onChange={(e) =>
                      setMaintenanceConfig({
                        ...maintenanceConfig,
                        maintenanceMessage: e.target.value,
                      })
                    }
                    placeholder="Message affiché pendant la maintenance"
                  />
                </div>
                <div>
                  <Label htmlFor="allowedIPs">IPs autorisées (séparées par des virgules)</Label>
                  <Input
                    id="allowedIPs"
                    value={maintenanceConfig.allowedIPs}
                    onChange={(e) =>
                      setMaintenanceConfig({
                        ...maintenanceConfig,
                        allowedIPs: e.target.value,
                      })
                    }
                    placeholder="192.168.1.1, 10.0.0.1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ces adresses IP pourront toujours accéder à l'application
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveMaintenanceConfig} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

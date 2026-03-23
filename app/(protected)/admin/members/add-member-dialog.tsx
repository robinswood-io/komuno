'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, User, Building2 as Building2Icon, MapPin, ClipboardList, Network } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { NetworkSection, type PendingConnection } from '@/components/network/NetworkSection';
import { SiretSearch, type SiretCompanyData } from '@/components/ui/siret-search';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: MemberFormData['status'] | ProspectionStatus;
}

const SONCAS_OPTIONS = [
  { value: 'Sécurité', label: 'Sécurité', description: 'Recherche la fiabilité et la stabilité' },
  { value: 'Orgueil', label: 'Orgueil', description: 'Sensible au prestige et à la reconnaissance' },
  { value: 'Nouveauté', label: 'Nouveauté', description: 'Attire par l\'innovation et l\'originalité' },
  { value: 'Confort', label: 'Confort', description: 'Privilégie la facilité et le bien-être' },
  { value: 'Argent', label: 'Argent', description: 'Motivé par le retour sur investissement' },
  { value: 'Sympathie', label: 'Sympathie', description: 'Décide par la relation et la confiance' },
] as const;

type ProspectionStatus = 'Qualification' | 'R1' | 'R2' | 'Contractualisation' | 'Hors cible' | 'En réflexion' | 'Refusé' | 'Signé';

interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  department: string;
  city: string;
  postalCode: string;
  firstContactDate?: Date;
  meetingDate?: Date;
  sector: string;
  phone: string;
  role: string;
  notes: string;
  soncasProfile?: 'Sécurité' | 'Orgueil' | 'Nouveauté' | 'Confort' | 'Argent' | 'Sympathie';
  assignedTo?: string;
  status: 'active' | 'proposed' | 'inactive';
  prospectionStatus?: ProspectionStatus;
}

interface Administrator {
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

const PIPELINE_STATUSES: ProspectionStatus[] = ['Qualification', 'R1', 'R2', 'Contractualisation', 'Hors cible', 'En réflexion', 'Refusé', 'Signé'];

function isPipelineStatus(s: string | undefined): s is ProspectionStatus {
  return PIPELINE_STATUSES.includes(s as ProspectionStatus);
}

export function AddMemberDialog({ open, onOpenChange, defaultStatus }: AddMemberDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: adminsData } = useQuery({
    queryKey: queryKeys.admin.administrators.list(),
    queryFn: () => api.get<{ success: boolean; data: Administrator[] }>('/api/admin/administrators'),
    staleTime: 5 * 60 * 1000,
  });

  const resolvedStatus: MemberFormData['status'] = isPipelineStatus(defaultStatus) ? 'proposed' : (defaultStatus ?? 'active');
  const resolvedProspectionStatus: ProspectionStatus | undefined = isPipelineStatus(defaultStatus) ? defaultStatus : undefined;

  // Form state
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    department: '',
    city: '',
    postalCode: '',
    sector: '',
    phone: '',
    role: '',
    notes: '',
    soncasProfile: undefined,
    assignedTo: undefined,
    status: resolvedStatus,
    prospectionStatus: resolvedProspectionStatus,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormData, string>>>({});
  const [pendingConnections, setPendingConnections] = useState<PendingConnection[]>([]);

  // Mutation pour créer un membre
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/admin/members', data),
    onSuccess: async (_, variables) => {
      // Create pending network connections
      await Promise.allSettled(
        pendingConnections.map((conn) =>
          api.post('/api/network', {
            ownerEmail: variables.email,
            ownerType: 'member',
            connectedEmail: conn.email,
            connectedType: conn.type,
          }),
        ),
      );
      toast({
        title: 'Membre ajouté',
        description: 'Le membre a été créé avec succès',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      department: '',
      city: '',
      postalCode: '',
      firstContactDate: undefined,
      meetingDate: undefined,
      sector: '',
      phone: '',
      role: '',
      notes: '',
      soncasProfile: undefined,
      assignedTo: undefined,
      status: resolvedStatus,
      prospectionStatus: resolvedProspectionStatus,
    });
    setErrors({});
    setPendingConnections([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MemberFormData, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof MemberFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSiretSelect = (data: SiretCompanyData) => {
    setFormData((prev) => ({
      ...prev,
      ...(data.company && { company: data.company }),
      ...(data.city && { city: data.city }),
      ...(data.postalCode && { postalCode: data.postalCode }),
      ...(data.department && { department: data.department }),
      ...(data.sector && { sector: data.sector }),
    }));
  };

  const handleDateChange = (field: 'firstContactDate' | 'meetingDate', value: Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (validateForm()) {
      createMutation.mutate({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        company: formData.company.trim() || undefined,
        department: formData.department.trim() || undefined,
        city: formData.city.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        firstContactDate: formData.firstContactDate?.toISOString(),
        meetingDate: formData.meetingDate?.toISOString(),
        sector: formData.sector.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        role: formData.role.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        soncasProfile: formData.soncasProfile || undefined,
        assignedTo: formData.assignedTo || undefined,
        status: formData.status,
        prospectionStatus: formData.prospectionStatus || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
          <DialogDescription>
            Créez un nouveau membre dans le système de gestion CRM
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Informations de base */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="p-1.5 rounded-md bg-blue-50">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Informations de base</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Prénom */}
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  placeholder=""
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={createMutation.isPending}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>

              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  placeholder=""
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={createMutation.isPending}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder=""
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={createMutation.isPending}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  placeholder=""
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>

              {/* Fonction */}
              <div className="space-y-2">
                <Label htmlFor="role">Fonction</Label>
                <Input
                  id="role"
                  placeholder=""
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Informations entreprise */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-amber-50">
                  <Building2Icon className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">Informations entreprise</h3>
              </div>
              <SiretSearch onSelect={handleSiretSelect} disabled={createMutation.isPending} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Entreprise</Label>
              <Input
                id="company"
                placeholder=""
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector">Secteur d'activité</Label>
              <Input
                id="sector"
                placeholder=""
                value={formData.sector}
                onChange={(e) => handleInputChange('sector', e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
          </div>

          {/* Localisation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="p-1.5 rounded-md bg-emerald-50">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Localisation</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Ville */}
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder=""
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>

              {/* Code postal */}
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input
                  id="postalCode"
                  placeholder=""
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Département */}
              <div className="space-y-2">
                <Label htmlFor="department">Département</Label>
                <Input
                  id="department"
                  placeholder=""
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Dates et statut */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="p-1.5 rounded-md bg-purple-50">
                <ClipboardList className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Suivi pipeline</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date 1er contact */}
              <div className="space-y-2">
                <Label htmlFor="firstContactDate">Date 1er contact</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.firstContactDate && 'text-muted-foreground'
                      )}
                      disabled={createMutation.isPending}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.firstContactDate ? (
                        format(formData.firstContactDate, 'PPP', { locale: fr })
                      ) : (
                        'Sélectionner une date'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.firstContactDate}
                      onSelect={(date) => handleDateChange('firstContactDate', date)}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date RDV */}
              <div className="space-y-2">
                <Label htmlFor="meetingDate">Date RDV</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.meetingDate && 'text-muted-foreground'
                      )}
                      disabled={createMutation.isPending}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.meetingDate ? (
                        format(formData.meetingDate, 'PPP', { locale: fr })
                      ) : (
                        'Sélectionner une date'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.meetingDate}
                      onSelect={(date) => handleDateChange('meetingDate', date)}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Notes et statut */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes additionnelles..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={createMutation.isPending}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="soncasProfile">Profil SONCAS</Label>
              <Select
                value={formData.soncasProfile ?? ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, soncasProfile: value as MemberFormData['soncasProfile'] || undefined }))}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="soncasProfile">
                  <SelectValue placeholder="Sélectionner un profil..." />
                </SelectTrigger>
                <SelectContent>
                  {SONCAS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="font-medium">{opt.value}</span>
                      <span className="text-muted-foreground text-xs ml-2">— {opt.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Responsable</Label>
              <Select
                value={formData.assignedTo ?? user?.email ?? ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value || undefined }))}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder="Choisir un responsable..." />
                </SelectTrigger>
                <SelectContent>
                  {(adminsData?.data ?? []).map((admin) => (
                    <SelectItem key={admin.email} value={admin.email}>
                      <span className="font-medium">
                        {admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : admin.email}
                      </span>
                      {admin.firstName && admin.lastName && (
                        <span className="text-muted-foreground text-xs ml-2">— {admin.email}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut membre</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as MemberFormData['status'] }))}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="proposed">Proposé</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prospectionStatus">Étape pipeline</Label>
              <Select
                value={formData.prospectionStatus ?? '__none__'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, prospectionStatus: value === '__none__' ? undefined : value as ProspectionStatus }))}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="prospectionStatus">
                  <SelectValue placeholder="Aucune (membre actif)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune (membre actif)</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Phases actives</SelectLabel>
                    <SelectItem value="Qualification">Qualification</SelectItem>
                    <SelectItem value="R1">R1</SelectItem>
                    <SelectItem value="R2">R2</SelectItem>
                    <SelectItem value="Contractualisation">Contractualisation</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Archivés</SelectLabel>
                    <SelectItem value="Hors cible">Hors cible</SelectItem>
                    <SelectItem value="En réflexion">En réflexion</SelectItem>
                    <SelectItem value="Refusé">Refusé</SelectItem>
                    <SelectItem value="Signé">Signé</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Réseau */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <div className="p-1.5 rounded-md bg-indigo-50">
              <Network className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Réseau</h3>
          </div>
        </div>
        <div className="pt-1">
          <NetworkSection
            mode="controlled"
            ownerType="member"
            value={pendingConnections}
            onChange={setPendingConnections}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={createMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {createMutation.isPending ? 'Création en cours...' : 'Ajouter le membre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

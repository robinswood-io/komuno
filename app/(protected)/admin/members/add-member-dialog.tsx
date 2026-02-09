'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api/client';
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  status: 'active' | 'proposed' | 'inactive' | '2027' | 'Refusé' | 'A contacter' | 'RDV prévu' | 'Intérêt - à relancer';
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormData, string>>>({});

  // Mutation pour créer un membre
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/admin/members', data),
    onSuccess: () => {
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
      status: 'active',
    });
    setErrors({});
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
        status: formData.status,
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

        <div className="grid gap-4 py-4">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations de base</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Prénom */}
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
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
                  placeholder="Dupont"
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
                placeholder="jean.dupont@example.com"
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
                  placeholder="06 12 34 56 78"
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
                  placeholder="Directeur"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Informations entreprise */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations entreprise</h3>

            <div className="space-y-2">
              <Label htmlFor="company">Entreprise</Label>
              <Input
                id="company"
                placeholder="Entreprise SAS"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector">Secteur d'activité</Label>
              <Input
                id="sector"
                placeholder="Services aux entreprises"
                value={formData.sector}
                onChange={(e) => handleInputChange('sector', e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
          </div>

          {/* Localisation */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Localisation</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Ville */}
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Amiens"
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
                  placeholder="80000"
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
                  placeholder="Somme"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Dates et statut */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Suivi</h3>

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
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value as any)}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Statuts membres</SelectLabel>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="proposed">Proposé</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Statuts prospection</SelectLabel>
                    <SelectItem value="2027">Cible 2027</SelectItem>
                    <SelectItem value="Refusé">Refusé</SelectItem>
                    <SelectItem value="A contacter">À contacter</SelectItem>
                    <SelectItem value="RDV prévu">RDV prévu</SelectItem>
                    <SelectItem value="Intérêt - à relancer">Intérêt - à relancer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
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

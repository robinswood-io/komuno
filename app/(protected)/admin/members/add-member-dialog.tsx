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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  status: 'active' | 'inactive';
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
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<MemberFormData>>({});

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
      status: 'active',
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<MemberFormData> = {};

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

  const handleSubmit = () => {
    if (validateForm()) {
      createMutation.mutate({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        company: formData.company.trim() || undefined,
        status: formData.status,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
          <DialogDescription>
            Créez un nouveau membre dans le système de gestion CRM
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Prénom */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">
              Prénom *
            </Label>
            <div className="col-span-3">
              <Input
                id="firstName"
                name="firstName"
                placeholder="Jean"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={createMutation.isPending}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
              )}
            </div>
          </div>

          {/* Nom */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">
              Nom *
            </Label>
            <div className="col-span-3">
              <Input
                id="lastName"
                name="lastName"
                placeholder="Dupont"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                disabled={createMutation.isPending}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email *
            </Label>
            <div className="col-span-3">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jean.dupont@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={createMutation.isPending}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Entreprise */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="company" className="text-right">
              Entreprise
            </Label>
            <div className="col-span-3">
              <Input
                id="company"
                name="company"
                placeholder="Entreprise SAS"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
          </div>

          {/* Statut */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Statut
            </Label>
            <div className="col-span-3">
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  handleInputChange('status', value as 'active' | 'inactive')
                }
                disabled={createMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
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

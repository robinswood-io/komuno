'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api, queryKeys } from '@/lib/api/client';
import { NetworkSection } from '@/components/network/NetworkSection';
import { SiretSearch, type SiretCompanyData } from '@/components/ui/siret-search';

interface Patron {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  role?: string;
  notes?: string;
  status?: string;
  city?: string;
  postalCode?: string;
  department?: string;
  sector?: string;
}

interface EditPatronModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patron: Patron | null;
}

export default function EditPatronModal({ open, onOpenChange, patron }: EditPatronModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [department, setDepartment] = useState('');
  const [sector, setSector] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mettre a jour les etats quand le patron change ou le modal s'ouvre
  useEffect(() => {
    if (open && patron) {
      setFirstName(patron.firstName || '');
      setLastName(patron.lastName || '');
      setEmail(patron.email || '');
      setCompany(patron.company || '');
      setPhone(patron.phone || '');
      setRole(patron.role || '');
      setNotes(patron.notes || '');
      setCity(patron.city || '');
      setPostalCode(patron.postalCode || '');
      setDepartment(patron.department || '');
      setSector(patron.sector || '');
    } else if (!open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setCompany('');
      setPhone('');
      setRole('');
      setNotes('');
      setCity('');
      setPostalCode('');
      setDepartment('');
      setSector('');
    }
  }, [open, patron]);

  const handleSiretSelect = (data: SiretCompanyData) => {
    if (data.company) setCompany(data.company);
    if (data.city) setCity(data.city);
    if (data.postalCode) setPostalCode(data.postalCode);
    if (data.department) setDepartment(data.department);
    if (data.sector) setSector(data.sector);
  };

  const updatePatronMutation = useMutation({
    mutationFn: async (data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      company?: string;
      phone?: string;
      role?: string;
      notes?: string;
      city?: string;
      postalCode?: string;
      department?: string;
      sector?: string;
    }) => {
      if (!patron) throw new Error('Aucun sponsor selectione');
      return api.patch(`/api/patrons/${patron.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patrons.all });
      toast({
        title: 'Sponsor modifie',
        description: 'Le sponsor a ete mis a jour avec succes',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast({
        title: 'Erreur de validation',
        description: 'Le prenom est requis',
        variant: 'destructive',
      });
      return;
    }

    if (!lastName.trim()) {
      toast({
        title: 'Erreur de validation',
        description: 'Le nom est requis',
        variant: 'destructive',
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: 'Erreur de validation',
        description: 'L\'email est requis',
        variant: 'destructive',
      });
      return;
    }

    updatePatronMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      company: company.trim() || undefined,
      phone: phone.trim() || undefined,
      role: role.trim() || undefined,
      notes: notes.trim() || undefined,
      city: city.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      department: department.trim() || undefined,
      sector: sector.trim() || undefined,
    });
  };

  const handleCancel = () => {
    if (patron) {
      setFirstName(patron.firstName || '');
      setLastName(patron.lastName || '');
      setEmail(patron.email || '');
      setCompany(patron.company || '');
      setPhone(patron.phone || '');
      setRole(patron.role || '');
      setNotes(patron.notes || '');
      setCity(patron.city || '');
      setPostalCode(patron.postalCode || '');
      setDepartment(patron.department || '');
      setSector(patron.sector || '');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600" />
            Modifier le sponsor
          </DialogTitle>
          <DialogDescription>
            Modifier les informations du sponsor
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* FirstName and LastName Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name" className="text-sm font-medium text-gray-700">
                Prenom *
              </Label>
              <Input
                id="edit-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Entrez le prenom..."
                className="w-full"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-last-name" className="text-sm font-medium text-gray-700">
                Nom *
              </Label>
              <Input
                id="edit-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Entrez le nom..."
                className="w-full"
                required
                maxLength={100}
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">
              Email *
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="w-full"
              required
            />
          </div>

          {/* Company Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-700">Entreprise</Label>
              <SiretSearch onSelect={handleSiretSelect} disabled={updatePatronMutation.isPending} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-company" className="text-sm font-medium text-gray-700">
                  Société
                </Label>
                <Input
                  id="edit-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nom de la société..."
                  className="w-full"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-sm font-medium text-gray-700">
                  Fonction
                </Label>
                <Input
                  id="edit-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ex: Directeur, President..."
                  className="w-full"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sector" className="text-sm font-medium text-gray-700">
                Secteur d'activité
              </Label>
              <Input
                id="edit-sector"
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ex: Commerce, Services aux entreprises..."
                className="w-full"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-postal-code" className="text-sm font-medium text-gray-700">
                  Code postal
                </Label>
                <Input
                  id="edit-postal-code"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="80000"
                  className="w-full"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-city" className="text-sm font-medium text-gray-700">
                  Ville
                </Label>
                <Input
                  id="edit-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Amiens"
                  className="w-full"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-department" className="text-sm font-medium text-gray-700">
                  Département
                </Label>
                <Input
                  id="edit-department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Somme"
                  className="w-full"
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">
              Telephone
            </Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="w-full"
              maxLength={20}
            />
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes" className="text-sm font-medium text-gray-700">
              Notes
            </Label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des notes ou commentaires..."
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-gray-500">
              {notes.length}/2000 caracteres
            </p>
          </div>

          {/* Réseau */}
          {patron && (
            <div className="pt-2 border-t border-gray-100">
              <NetworkSection
                mode="live"
                ownerEmail={patron.email}
                ownerType="patron"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updatePatronMutation.isPending}
              className="px-6"
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={updatePatronMutation.isPending || !firstName.trim() || !lastName.trim() || !email.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-6"
            >
              {updatePatronMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

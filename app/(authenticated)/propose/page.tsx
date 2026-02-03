'use client';

import { useMutation } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, ArrowLeft } from 'lucide-react';
import type { Idea } from '@shared/schema';

interface IdeaFormData {
  title: string;
  description?: string;
  proposedBy: string;
  proposedByEmail: string;
  company?: string;
  phone?: string;
}

export default function ProposePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState<IdeaFormData>({
    title: '',
    description: '',
    proposedBy: '',
    proposedByEmail: '',
    company: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createIdeaMutation = useMutation({
    mutationFn: (data: IdeaFormData) => api.post<ApiResponse<Idea>>('/api/ideas', data),
    onSuccess: () => {
      toast({
        title: "Idee soumise!",
        description: "Votre idee a ete envoyee avec succes.",
      });
      router.push('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = "Le titre doit contenir au moins 3 caractères";
    }

    if (!formData.proposedBy || formData.proposedBy.trim().length < 2) {
      newErrors.proposedBy = "Le nom doit contenir au moins 2 caractères";
    }

    if (!formData.proposedByEmail || !/^\S+@\S+\.\S+$/.test(formData.proposedByEmail)) {
      newErrors.proposedByEmail = "Veuillez saisir une adresse email valide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Nettoyer les champs optionnels vides
    const cleanedData = {
      title: formData.title,
      description: formData.description || undefined,
      proposedBy: formData.proposedBy,
      proposedByEmail: formData.proposedByEmail,
      company: formData.company || undefined,
      phone: formData.phone || undefined,
    };

    createIdeaMutation.mutate(cleanedData);
  };

  const handleChange = (field: keyof IdeaFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'accueil
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cjd-green rounded-full">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Proposer une idée</CardTitle>
                <p className="text-gray-600 mt-1">
                  Partagez votre idée pour améliorer notre association
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Titre de l'idée *
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Ex: Organiser un afterwork mensuel"
                  className={errors.title ? 'border-error' : ''}
                />
                {errors.title && (
                  <span className="text-error text-sm mt-1 block">{errors.title}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Décrivez votre idée en détail..."
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Votre nom *
                  </label>
                  <Input
                    value={formData.proposedBy}
                    onChange={(e) => handleChange('proposedBy', e.target.value)}
                    placeholder="Jean Dupont"
                    className={errors.proposedBy ? 'border-error' : ''}
                  />
                  {errors.proposedBy && (
                    <span className="text-error text-sm mt-1 block">{errors.proposedBy}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Votre email *
                  </label>
                  <Input
                    value={formData.proposedByEmail}
                    onChange={(e) => handleChange('proposedByEmail', e.target.value)}
                    type="email"
                    placeholder="jean@example.com"
                    className={errors.proposedByEmail ? 'border-error' : ''}
                  />
                  {errors.proposedByEmail && (
                    <span className="text-error text-sm mt-1 block">{errors.proposedByEmail}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Entreprise (optionnel)
                  </label>
                  <Input
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="Mon Entreprise"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Téléphone (optionnel)
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-cjd-green hover:bg-cjd-green-dark"
                disabled={createIdeaMutation.isPending}
              >
                {createIdeaMutation.isPending ? 'Envoi en cours...' : 'Soumettre mon idée'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

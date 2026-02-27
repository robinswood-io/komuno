'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AddPatronModal from '@/components/add-patron-modal';
import EditPatronModal from '@/components/edit-patron-modal';

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
}

/**
 * Page Gestion Sponsors (Mecenes)
 * CRUD complet sur les sponsors avec pagination et recherche
 */
export default function AdminPatronsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPatron, setSelectedPatron] = useState<Patron | null>(null);

  // Query pour lister les sponsors
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.patrons.list({ page, limit: 20, search: search || undefined }),
    queryFn: () => api.get<PaginatedResponse<Patron>>('/api/patrons', {
      page,
      limit: 20,
      search: search || undefined,
    }),
  });

  // Mutation pour supprimer un sponsor
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/patrons/${id}`),
    onSuccess: () => {
      toast({
        title: 'Sponsor supprime',
        description: 'Le sponsor a ete supprime avec succes',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.patrons.all });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer ce sponsor ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (patron: Patron) => {
    setSelectedPatron(patron);
    setEditModalOpen(true);
  };

  // Note: Status toggle is not currently supported for patrons
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStatusToggle = (_id: string, _currentStatus: string) => {
    toast({
      title: 'Non implemente',
      description: 'La modification du statut n\'est pas encore disponible',
      variant: 'destructive',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>Impossible de charger les sponsors</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion Sponsors</h1>
          <p className="text-muted-foreground">
            Gestion des sponsors et mecenes de l'association
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un sponsor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des sponsors</CardTitle>
          <CardDescription>
            {data?.total || 0} sponsors au total
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Societe</TableHead>
                <TableHead>Fonction</TableHead>
                <TableHead>Telephone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((patron: Patron) => (
                  <TableRow
                    key={patron.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/patrons/${patron.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {patron.firstName} {patron.lastName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {patron.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      {patron.company ? (
                        <Badge variant="outline">{patron.company}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {patron.role || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {patron.phone || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleEdit(patron); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDelete(patron.id); }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucun sponsor trouve
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && Math.ceil(data.total / data.limit) > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Precedent
              </Button>
              <div className="flex items-center px-4 text-sm">
                Page {page} sur {Math.ceil(data.total / data.limit)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(Math.ceil(data.total / data.limit), p + 1))}
                disabled={page === Math.ceil(data.total / data.limit)}
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddPatronModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <EditPatronModal open={editModalOpen} onOpenChange={setEditModalOpen} patron={selectedPatron} />
    </div>
  );
}

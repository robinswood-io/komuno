'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  ExternalLink,
  Star,
  StarOff,
  Eye,
  EyeOff,
  GripVertical,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ToolCategory, Tool, ToolWithCategory } from '@/shared/schema';

// Types locaux
interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  isActive: boolean;
}

interface ToolFormData {
  name: string;
  description: string;
  categoryId: string | null;
  logoUrl: string;
  price: string;
  link: string;
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  order: number;
}

const defaultCategoryForm: CategoryFormData = {
  name: '',
  description: '',
  icon: 'Wrench',
  color: '#10b981',
  order: 0,
  isActive: true,
};

const defaultToolForm: ToolFormData = {
  name: '',
  description: '',
  categoryId: null,
  logoUrl: '',
  price: '',
  link: '',
  tags: [],
  isFeatured: false,
  isActive: true,
  order: 0,
};

const ICON_OPTIONS = [
  'Wrench', 'Users', 'Calendar', 'ChartBar', 'Lightbulb', 'Briefcase',
  'Globe', 'Shield', 'Zap', 'Target', 'TrendingUp', 'Award',
];

export default function AdminToolsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ToolCategory | null>(null);
  const [editingTool, setEditingTool] = useState<ToolWithCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(defaultCategoryForm);
  const [toolForm, setToolForm] = useState<ToolFormData>(defaultToolForm);
  const [tagInput, setTagInput] = useState('');

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ToolCategory[]>({
    queryKey: ['/api/admin/tools/categories', { includeInactive: 'true' }],
  });

  const { data: tools = [], isLoading: toolsLoading } = useQuery<ToolWithCategory[]>({
    queryKey: ['/api/admin/tools', { includeInactive: 'true' }],
  });

  const { data: stats } = useQuery<{ categoriesCount: number; toolsCount: number; featuredCount: number }>({
    queryKey: ['/api/admin/tools/stats'],
  });

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const res = await apiRequest('POST', '/api/admin/tools/categories', data);
      if (!res.ok) throw new Error('Erreur lors de la création');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools/stats'] });
      setCategoryDialogOpen(false);
      setCategoryForm(defaultCategoryForm);
      toast({ title: 'Catégorie créée' });
    },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      const res = await apiRequest('PUT', `/api/admin/tools/categories/${id}`, data);
      if (!res.ok) throw new Error('Erreur lors de la modification');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools'] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm(defaultCategoryForm);
      toast({ title: 'Catégorie modifiée' });
    },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/tools/categories/${id}`);
      if (!res.ok) throw new Error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools/stats'] });
      toast({ title: 'Catégorie supprimée' });
    },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  // Tool Mutations
  const createToolMutation = useMutation({
    mutationFn: async (data: ToolFormData) => {
      const res = await apiRequest('POST', '/api/admin/tools', {
        ...data,
        categoryId: data.categoryId || null,
        logoUrl: data.logoUrl || null,
        price: data.price || null,
        link: data.link || null,
      });
      if (!res.ok) throw new Error('Erreur lors de la création');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools/stats'] });
      setToolDialogOpen(false);
      setToolForm(defaultToolForm);
      toast({ title: 'Outil créé' });
    },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const updateToolMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ToolFormData> }) => {
      const res = await apiRequest('PUT', `/api/admin/tools/${id}`, {
        ...data,
        categoryId: data.categoryId || null,
        logoUrl: data.logoUrl || null,
        price: data.price || null,
        link: data.link || null,
      });
      if (!res.ok) throw new Error('Erreur lors de la modification');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools'] });
      setToolDialogOpen(false);
      setEditingTool(null);
      setToolForm(defaultToolForm);
      toast({ title: 'Outil modifié' });
    },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/tools/${id}`);
      if (!res.ok) throw new Error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools/stats'] });
      toast({ title: 'Outil supprimé' });
    },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  // Handlers
  const openCategoryDialog = (category?: ToolCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'Wrench',
        color: category.color || '#10b981',
        order: category.order,
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm(defaultCategoryForm);
    }
    setCategoryDialogOpen(true);
  };

  const openToolDialog = (tool?: ToolWithCategory) => {
    if (tool) {
      setEditingTool(tool);
      setToolForm({
        name: tool.name,
        description: tool.description || '',
        categoryId: tool.categoryId,
        logoUrl: tool.logoUrl || '',
        price: tool.price || '',
        link: tool.link || '',
        tags: tool.tags || [],
        isFeatured: tool.isFeatured,
        isActive: tool.isActive,
        order: tool.order,
      });
    } else {
      setEditingTool(null);
      setToolForm(defaultToolForm);
    }
    setToolDialogOpen(true);
  };

  const handleCategorySubmit = () => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleToolSubmit = () => {
    if (editingTool) {
      updateToolMutation.mutate({ id: editingTool.id, data: toolForm });
    } else {
      createToolMutation.mutate(toolForm);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !toolForm.tags.includes(tagInput.trim())) {
      setToolForm({ ...toolForm, tags: [...toolForm.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setToolForm({ ...toolForm, tags: toolForm.tags.filter((t) => t !== tag) });
  };

  const handleDeleteCategory = (category: ToolCategory) => {
    if (confirm(`Supprimer la catégorie "${category.name}" ? Les outils associés seront décatégorisés.`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleDeleteTool = (tool: ToolWithCategory) => {
    if (confirm(`Supprimer l'outil "${tool.name}" ?`)) {
      deleteToolMutation.mutate(tool.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            Outils du Dirigeant
          </h1>
          <p className="text-muted-foreground">
            Gérez les catégories et outils disponibles pour les membres
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.categoriesCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outils</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.toolsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mis en avant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.featuredCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tools">Outils</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openToolDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un outil
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {toolsLoading ? (
                <div className="p-8 text-center">Chargement...</div>
              ) : tools.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Aucun outil. Cliquez sur "Ajouter un outil" pour commencer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="text-center">Featured</TableHead>
                      <TableHead className="text-center">Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tools.map((tool) => (
                      <TableRow key={tool.id} className={!tool.isActive ? 'opacity-50' : ''}>
                        <TableCell>
                          {tool.logoUrl ? (
                            <img
                              src={tool.logoUrl}
                              alt={tool.name}
                              className="w-8 h-8 object-contain rounded"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <Wrench className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {tool.name}
                            {tool.link && (
                              <a href={tool.link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 text-gray-400 hover:text-primary" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tool.category ? (
                            <Badge variant="outline">{tool.category.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{tool.price || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tool.tags?.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {(tool.tags?.length ?? 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(tool.tags?.length ?? 0) - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {tool.isFeatured ? (
                            <Star className="w-4 h-4 text-yellow-500 mx-auto" />
                          ) : (
                            <StarOff className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {tool.isActive ? (
                            <Eye className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openToolDialog(tool)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteTool(tool)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCategoryDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une catégorie
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {categoriesLoading ? (
                <div className="p-8 text-center">Chargement...</div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Aucune catégorie. Cliquez sur "Ajouter une catégorie" pour commencer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Ordre</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Icône</TableHead>
                      <TableHead>Couleur</TableHead>
                      <TableHead className="text-center">Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id} className={!category.isActive ? 'opacity-50' : ''}>
                        <TableCell>
                          <span className="text-muted-foreground">{category.order}</span>
                        </TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {category.description || '-'}
                        </TableCell>
                        <TableCell>{category.icon || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: category.color || '#10b981' }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {category.color}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {category.isActive ? (
                            <Eye className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openCategoryDialog(category)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteCategory(category)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Nom *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Gestion financière"
              />
            </div>
            <div>
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Description de la catégorie..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cat-icon">Icône</Label>
                <Select
                  value={categoryForm.icon}
                  onValueChange={(value) => setCategoryForm({ ...categoryForm, icon: value })}
                >
                  <SelectTrigger id="cat-icon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cat-color">Couleur</Label>
                <div className="flex gap-2">
                  <Input
                    id="cat-color"
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    placeholder="#10b981"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cat-order">Ordre d'affichage</Label>
                <Input
                  id="cat-order"
                  type="number"
                  value={categoryForm.order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="cat-active">Actif</Label>
                <Switch
                  id="cat-active"
                  checked={categoryForm.isActive}
                  onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCategorySubmit} disabled={!categoryForm.name.trim()}>
              {editingCategory ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tool Dialog */}
      <Dialog open={toolDialogOpen} onOpenChange={setToolDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTool ? 'Modifier l\'outil' : 'Nouvel outil'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="tool-name">Nom *</Label>
                <Input
                  id="tool-name"
                  value={toolForm.name}
                  onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                  placeholder="Ex: Notion"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="tool-description">Description</Label>
                <Textarea
                  id="tool-description"
                  value={toolForm.description}
                  onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                  placeholder="Description de l'outil..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="tool-category">Catégorie</Label>
                <Select
                  value={toolForm.categoryId || 'none'}
                  onValueChange={(value) => setToolForm({ ...toolForm, categoryId: value === 'none' ? null : value })}
                >
                  <SelectTrigger id="tool-category">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune catégorie</SelectItem>
                    {categories.filter(c => c.isActive).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tool-price">Prix</Label>
                <Input
                  id="tool-price"
                  value={toolForm.price}
                  onChange={(e) => setToolForm({ ...toolForm, price: e.target.value })}
                  placeholder="Ex: Gratuit, 10€/mois"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="tool-logo">URL du logo</Label>
                <Input
                  id="tool-logo"
                  value={toolForm.logoUrl}
                  onChange={(e) => setToolForm({ ...toolForm, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="tool-link">Lien vers l'outil</Label>
                <Input
                  id="tool-link"
                  value={toolForm.link}
                  onChange={(e) => setToolForm({ ...toolForm, link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Ajouter un tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {toolForm.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="tool-order">Ordre d'affichage</Label>
                <Input
                  id="tool-order"
                  type="number"
                  value={toolForm.order}
                  onChange={(e) => setToolForm({ ...toolForm, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tool-featured">Mettre en avant</Label>
                  <Switch
                    id="tool-featured"
                    checked={toolForm.isFeatured}
                    onCheckedChange={(checked) => setToolForm({ ...toolForm, isFeatured: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="tool-active">Actif</Label>
                  <Switch
                    id="tool-active"
                    checked={toolForm.isActive}
                    onCheckedChange={(checked) => setToolForm({ ...toolForm, isActive: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToolDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleToolSubmit} disabled={!toolForm.name.trim()}>
              {editingTool ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

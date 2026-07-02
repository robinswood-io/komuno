'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Plus, RefreshCw, Target, Trash2, Users, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, queryKeys } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type ApiResponse<T> = { success: boolean; data: T };

type EventRecord = { id: string; title: string; date: string; location?: string | null; status: string };
type Plan = { id: string; status: string; riskLevel: string; ownerEmail?: string | null; summary?: string | null; dueDate?: string | null; notes?: string | null } | null;
type Workstream = { id: string; name: string; category?: string | null; status: string; ownerEmail?: string | null; dueDate?: string | null; priority: number; description?: string | null };
type Supplier = { id: string; name: string; category?: string | null; status: string; contactName?: string | null; contactEmail?: string | null; rating?: number | null; notes?: string | null };
type Quote = { id: string; supplierId: string; title: string; amountInCents: number; currency: string; status: string; validUntil?: string | null };
type Commitment = { id: string; supplierId: string; title: string; committedAmountInCents: number; actualAmountInCents?: number | null; currency: string; status: string };
type Objective = { id: string; type: string; label: string; targetValue: number; currentValue: number; unit?: string | null; status: string };
type BudgetLine = { id: string; type: string; label: string; category?: string | null; plannedAmountInCents: number; committedAmountInCents: number; actualAmountInCents: number; currency: string; status: string };
type Operations = {
  event: EventRecord;
  plan: Plan;
  workstreams: Workstream[];
  suppliers: Supplier[];
  quotes: Quote[];
  commitments: Commitment[];
  objectives: Objective[];
  budgetLines: BudgetLine[];
  summary: {
    counts: Record<string, number>;
    budget: Record<string, number>;
    warnings: Array<{ type: string; message: string }>;
  };
};

function euros(cents?: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function toCents(value: string) {
  return Math.round(Number(value || '0') * 100);
}

function statusBadge(status?: string) {
  if (!status) return 'secondary' as const;
  if (['ready', 'done', 'completed', 'selected', 'accepted', 'paid', 'achieved', 'actual'].includes(status)) return 'default' as const;
  if (['blocked', 'critical', 'cancelled', 'rejected', 'expired', 'missed'].includes(status)) return 'destructive' as const;
  return 'secondary' as const;
}

export default function EventOperationsPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [planForm, setPlanForm] = useState({ status: 'planning', riskLevel: 'normal', ownerEmail: '', dueDate: '', summary: '', notes: '' });
  const [workstreamForm, setWorkstreamForm] = useState({ name: '', category: '', ownerEmail: '', dueDate: '', priority: '3', description: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', category: '', contactName: '', contactEmail: '', status: 'identified', rating: '', notes: '' });
  const [quoteForm, setQuoteForm] = useState({ supplierId: '', title: '', amount: '', status: 'requested', validUntil: '' });
  const [commitmentForm, setCommitmentForm] = useState({ supplierId: '', title: '', committedAmount: '', actualAmount: '', status: 'planned' });
  const [objectiveForm, setObjectiveForm] = useState({ type: 'participants', label: '', targetValue: '', currentValue: '', unit: '' });
  const [budgetForm, setBudgetForm] = useState({ type: 'expense', label: '', category: '', plannedAmount: '', committedAmount: '', actualAmount: '' });

  const operationsQuery = useQuery({
    queryKey: queryKeys.events.operations(eventId),
    queryFn: async () => (await api.get<ApiResponse<Operations>>(`/api/admin/events/${eventId}/operations`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.events.operations(eventId) });

  const savePlanMutation = useMutation({
    mutationFn: async () => api.put<ApiResponse<Plan>>(`/api/admin/events/${eventId}/operations/plan`, {
      ...planForm,
      ownerEmail: planForm.ownerEmail || null,
      dueDate: planForm.dueDate || null,
      summary: planForm.summary || null,
      notes: planForm.notes || null,
    }),
    onSuccess: () => { toast({ title: 'Plan mis à jour' }); invalidate(); },
    onError: (error: Error) => toast({ title: 'Erreur plan', description: error.message, variant: 'destructive' }),
  });

  const createMutation = useMutation({
    mutationFn: async ({ kind, payload }: { kind: string; payload: unknown }) => api.post<ApiResponse<unknown>>(`/api/admin/events/${eventId}/operations/${kind}`, payload),
    onSuccess: () => { toast({ title: 'Élément ajouté' }); invalidate(); },
    onError: (error: Error) => toast({ title: 'Création impossible', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ kind, id }: { kind: string; id: string }) => api.delete<ApiResponse<unknown>>(`/api/admin/events/${eventId}/operations/${kind}/${id}`),
    onSuccess: () => { toast({ title: 'Élément supprimé' }); invalidate(); },
    onError: (error: Error) => toast({ title: 'Suppression impossible', description: error.message, variant: 'destructive' }),
  });

  const ops = operationsQuery.data;
  const suppliers = ops?.suppliers || [];

  useEffect(() => {
    if (!ops?.plan) return;
    setPlanForm({
      status: ops.plan.status || 'planning',
      riskLevel: ops.plan.riskLevel || 'normal',
      ownerEmail: ops.plan.ownerEmail || '',
      dueDate: ops.plan.dueDate || '',
      summary: ops.plan.summary || '',
      notes: ops.plan.notes || '',
    });
  }, [ops?.plan?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-2 px-0">
            <Link href="/admin/events"><ArrowLeft className="mr-2 h-4 w-4" /> Retour événements</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Pilotage événement</h1>
          <p className="text-muted-foreground">{ops?.event.title || 'Chargement…'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => invalidate()}><RefreshCw className="mr-2 h-4 w-4" /> Actualiser</Button>
          <Button variant="outline" onClick={() => { window.location.href = `/api/admin/events/${eventId}/operations/export.csv`; }}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      {operationsQuery.isLoading && <Card><CardContent className="p-6 text-muted-foreground">Chargement du pilotage…</CardContent></Card>}

      {ops && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Marge prévue</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{euros(ops.summary.budget.plannedMargin)}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Dépenses engagées</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{euros(ops.summary.budget.committedExpense)}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Prestataires retenus</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{ops.summary.counts.selectedSuppliers || 0}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Objectifs atteints</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{ops.summary.counts.achievedObjectives || 0}/{ops.summary.counts.objectives || 0}</CardContent></Card>
          </div>

          {ops.summary.warnings.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader><CardTitle>Alertes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {ops.summary.warnings.map(warning => <p key={warning.type} className="text-sm text-destructive">• {warning.message}</p>)}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Plan opérationnel</CardTitle><CardDescription>Statut global, responsable, risque et notes.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div><Label>Statut</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={planForm.status} onChange={e => setPlanForm({ ...planForm, status: e.target.value })}><option value="planning">Planning</option><option value="in_progress">En cours</option><option value="ready">Prêt</option><option value="completed">Terminé</option><option value="cancelled">Annulé</option></select></div>
              <div><Label>Risque</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={planForm.riskLevel} onChange={e => setPlanForm({ ...planForm, riskLevel: e.target.value })}><option value="low">Faible</option><option value="normal">Normal</option><option value="high">Élevé</option><option value="critical">Critique</option></select></div>
              <div><Label>Responsable email</Label><Input value={planForm.ownerEmail} onChange={e => setPlanForm({ ...planForm, ownerEmail: e.target.value })} /></div>
              <div><Label>Échéance</Label><Input type="date" value={planForm.dueDate} onChange={e => setPlanForm({ ...planForm, dueDate: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Résumé</Label><Input value={planForm.summary} onChange={e => setPlanForm({ ...planForm, summary: e.target.value })} /></div>
              <div className="md:col-span-3"><Label>Notes</Label><Textarea rows={3} value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} /></div>
              <div><Button onClick={() => savePlanMutation.mutate()}>Enregistrer le plan</Button></div>
              {ops.plan && <div className="md:col-span-2 text-sm text-muted-foreground">Plan actuel : <Badge variant={statusBadge(ops.plan.status)}>{ops.plan.status}</Badge> · risque <Badge variant={statusBadge(ops.plan.riskLevel)}>{ops.plan.riskLevel}</Badge></div>}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Lots / postes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2"><Input placeholder="Nom" value={workstreamForm.name} onChange={e => setWorkstreamForm({ ...workstreamForm, name: e.target.value })} /><Input placeholder="Catégorie" value={workstreamForm.category} onChange={e => setWorkstreamForm({ ...workstreamForm, category: e.target.value })} /><Input placeholder="Owner email" value={workstreamForm.ownerEmail} onChange={e => setWorkstreamForm({ ...workstreamForm, ownerEmail: e.target.value })} /><Input type="date" value={workstreamForm.dueDate} onChange={e => setWorkstreamForm({ ...workstreamForm, dueDate: e.target.value })} /></div>
                <Button size="sm" disabled={!workstreamForm.name} onClick={() => { createMutation.mutate({ kind: 'workstreams', payload: { ...workstreamForm, ownerEmail: workstreamForm.ownerEmail || null, dueDate: workstreamForm.dueDate || null, priority: Number(workstreamForm.priority) } }); setWorkstreamForm({ name: '', category: '', ownerEmail: '', dueDate: '', priority: '3', description: '' }); }}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                <div className="space-y-2">{ops.workstreams.map(item => <Row key={item.id} title={item.name} subtitle={item.category || item.ownerEmail || ''} status={item.status} onDelete={() => deleteMutation.mutate({ kind: 'workstreams', id: item.id })} />)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Prestataires</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2"><Input placeholder="Nom prestataire" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} /><Input placeholder="Catégorie" value={supplierForm.category} onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })} /><Input placeholder="Contact" value={supplierForm.contactName} onChange={e => setSupplierForm({ ...supplierForm, contactName: e.target.value })} /><Input placeholder="Email" value={supplierForm.contactEmail} onChange={e => setSupplierForm({ ...supplierForm, contactEmail: e.target.value })} /></div>
                <select className="h-10 rounded-md border bg-background px-3" value={supplierForm.status} onChange={e => setSupplierForm({ ...supplierForm, status: e.target.value })}><option value="identified">Identifié</option><option value="contacted">Contacté</option><option value="quote_requested">Devis demandé</option><option value="selected">Retenu</option><option value="rejected">Rejeté</option></select>
                <Button size="sm" disabled={!supplierForm.name} onClick={() => { createMutation.mutate({ kind: 'suppliers', payload: { ...supplierForm, category: supplierForm.category || null, contactName: supplierForm.contactName || null, contactEmail: supplierForm.contactEmail || null, rating: supplierForm.rating ? Number(supplierForm.rating) : null } }); setSupplierForm({ name: '', category: '', contactName: '', contactEmail: '', status: 'identified', rating: '', notes: '' }); }}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                <div className="space-y-2">{ops.suppliers.map(item => <Row key={item.id} title={item.name} subtitle={item.category || item.contactEmail || ''} status={item.status} onDelete={() => deleteMutation.mutate({ kind: 'suppliers', id: item.id })} />)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Devis</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2"><select className="h-10 rounded-md border bg-background px-3" value={quoteForm.supplierId} onChange={e => setQuoteForm({ ...quoteForm, supplierId: e.target.value })}><option value="">Prestataire…</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><Input placeholder="Titre" value={quoteForm.title} onChange={e => setQuoteForm({ ...quoteForm, title: e.target.value })} /><Input placeholder="Montant €" value={quoteForm.amount} onChange={e => setQuoteForm({ ...quoteForm, amount: e.target.value })} /><Input type="date" value={quoteForm.validUntil} onChange={e => setQuoteForm({ ...quoteForm, validUntil: e.target.value })} /></div>
                <Button size="sm" disabled={!quoteForm.supplierId || !quoteForm.title} onClick={() => { createMutation.mutate({ kind: 'quotes', payload: { supplierId: quoteForm.supplierId, title: quoteForm.title, amountInCents: toCents(quoteForm.amount), status: quoteForm.status, validUntil: quoteForm.validUntil || null } }); setQuoteForm({ supplierId: '', title: '', amount: '', status: 'requested', validUntil: '' }); }}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                <div className="space-y-2">{ops.quotes.map(item => <Row key={item.id} title={`${item.title} · ${euros(item.amountInCents)}`} subtitle={suppliers.find(s => s.id === item.supplierId)?.name || ''} status={item.status} onDelete={() => deleteMutation.mutate({ kind: 'quotes', id: item.id })} />)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Engagements</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2"><select className="h-10 rounded-md border bg-background px-3" value={commitmentForm.supplierId} onChange={e => setCommitmentForm({ ...commitmentForm, supplierId: e.target.value })}><option value="">Prestataire…</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><Input placeholder="Titre" value={commitmentForm.title} onChange={e => setCommitmentForm({ ...commitmentForm, title: e.target.value })} /><Input placeholder="Engagé €" value={commitmentForm.committedAmount} onChange={e => setCommitmentForm({ ...commitmentForm, committedAmount: e.target.value })} /><Input placeholder="Réel €" value={commitmentForm.actualAmount} onChange={e => setCommitmentForm({ ...commitmentForm, actualAmount: e.target.value })} /></div>
                <Button size="sm" disabled={!commitmentForm.supplierId || !commitmentForm.title} onClick={() => { createMutation.mutate({ kind: 'commitments', payload: { supplierId: commitmentForm.supplierId, title: commitmentForm.title, committedAmountInCents: toCents(commitmentForm.committedAmount), actualAmountInCents: commitmentForm.actualAmount ? toCents(commitmentForm.actualAmount) : null, status: commitmentForm.status } }); setCommitmentForm({ supplierId: '', title: '', committedAmount: '', actualAmount: '', status: 'planned' }); }}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                <div className="space-y-2">{ops.commitments.map(item => <Row key={item.id} title={`${item.title} · ${euros(item.committedAmountInCents)}`} subtitle={suppliers.find(s => s.id === item.supplierId)?.name || ''} status={item.status} onDelete={() => deleteMutation.mutate({ kind: 'commitments', id: item.id })} />)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Objectifs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2"><select className="h-10 rounded-md border bg-background px-3" value={objectiveForm.type} onChange={e => setObjectiveForm({ ...objectiveForm, type: e.target.value })}><option value="participants">Participants</option><option value="revenue">Revenus</option><option value="margin">Marge</option><option value="sponsors">Sponsors</option><option value="satisfaction">Satisfaction</option><option value="custom">Autre</option></select><Input placeholder="Label" value={objectiveForm.label} onChange={e => setObjectiveForm({ ...objectiveForm, label: e.target.value })} /><Input placeholder="Cible" value={objectiveForm.targetValue} onChange={e => setObjectiveForm({ ...objectiveForm, targetValue: e.target.value })} /><Input placeholder="Actuel" value={objectiveForm.currentValue} onChange={e => setObjectiveForm({ ...objectiveForm, currentValue: e.target.value })} /></div>
                <Button size="sm" disabled={!objectiveForm.label} onClick={() => { createMutation.mutate({ kind: 'objectives', payload: { ...objectiveForm, targetValue: Number(objectiveForm.targetValue || 0), currentValue: Number(objectiveForm.currentValue || 0), unit: objectiveForm.unit || null } }); setObjectiveForm({ type: 'participants', label: '', targetValue: '', currentValue: '', unit: '' }); }}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                <div className="space-y-2">{ops.objectives.map(item => <Row key={item.id} title={`${item.label} · ${item.currentValue}/${item.targetValue}${item.unit ? ` ${item.unit}` : ''}`} subtitle={item.type} status={item.status} onDelete={() => deleteMutation.mutate({ kind: 'objectives', id: item.id })} />)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5" /> Budget</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2"><select className="h-10 rounded-md border bg-background px-3" value={budgetForm.type} onChange={e => setBudgetForm({ ...budgetForm, type: e.target.value })}><option value="expense">Dépense</option><option value="income">Revenu</option></select><Input placeholder="Libellé" value={budgetForm.label} onChange={e => setBudgetForm({ ...budgetForm, label: e.target.value })} /><Input placeholder="Prévu €" value={budgetForm.plannedAmount} onChange={e => setBudgetForm({ ...budgetForm, plannedAmount: e.target.value })} /><Input placeholder="Engagé €" value={budgetForm.committedAmount} onChange={e => setBudgetForm({ ...budgetForm, committedAmount: e.target.value })} /></div>
                <Button size="sm" disabled={!budgetForm.label} onClick={() => { createMutation.mutate({ kind: 'budget-lines', payload: { type: budgetForm.type, label: budgetForm.label, category: budgetForm.category || null, plannedAmountInCents: toCents(budgetForm.plannedAmount), committedAmountInCents: toCents(budgetForm.committedAmount), actualAmountInCents: toCents(budgetForm.actualAmount) } }); setBudgetForm({ type: 'expense', label: '', category: '', plannedAmount: '', committedAmount: '', actualAmount: '' }); }}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                <div className="space-y-2">{ops.budgetLines.map(item => <Row key={item.id} title={`${item.label} · ${euros(item.plannedAmountInCents)}`} subtitle={item.type} status={item.status} onDelete={() => deleteMutation.mutate({ kind: 'budget-lines', id: item.id })} />)}</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ title, subtitle, status, onDelete }: { title: string; subtitle?: string; status: string; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <div className="truncate font-medium">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusBadge(status)}>{status}</Badge>
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

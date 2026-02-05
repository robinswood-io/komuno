'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type ApiResponse } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Plus, Download, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BudgetStats {
  totalAllocated: number;
  totalSpent: number;
  count: number;
  balance: number;
}

interface ExpenseStats {
  total: number;
  average: number;
  count: number;
  categoriesCount: number;
}

interface KPIs {
  totalBudget: number;
  totalExpenses: number;
  balance: number;
  utilizationRate: number;
}

interface Budget {
  id: string;
  name: string;
  category?: string;
  amount: number;
  spent?: number;
  period: string;
}

interface Expense {
  id: string;
  description: string;
  category?: string;
  amount: number;
  date: string;
}

interface FinancialRevenue {
  id: string;
  revenueType: 'donation' | 'grant' | 'sponsorship' | 'other';
  sourceName: string;
  sourceContact?: string;
  amountInCents: number;
  categoryId?: string;
  receivedDate: string;
  paymentMethod?: string;
  receiptUrl?: string;
  notes?: string;
}

interface RevenueStats {
  totalAmount: number;
  countByType: Array<{ type: string; count: number; total: number }>;
  topDonors: Array<{ name: string; total: number }>;
}

export interface MemberSubscription {
  id: string;
  memberName: string;
  memberEmail: string;
  subscriptionType: 'adherent' | 'parrain' | 'bienfaiteur' | 'autre';
  amountInCents: number;
  durationType: 'monthly' | 'quarterly' | 'yearly';
  paymentDate: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending';
  paymentMethod?: string;
  notes?: string;
}

export interface SubscriptionType {
  id: string;
  name: string;
  description?: string;
  amountInCents: number;
  durationType: 'monthly' | 'quarterly' | 'yearly';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { subscriptions: number };
}

export interface SubscriptionStats {
  totalAmount: number;
  activeMembers: number;
  expiringMembersCount: number;
  renewalRate: number;
  byType: Array<{ type: string; count: number; total: number }>;
}

interface DashboardOverview {
  subscriptions: {
    total: number;
    activeMembers: number;
  };
  revenues: {
    total: number;
    byType: {
      donations: number;
      grants: number;
      sponsorships: number;
    };
  };
  expenses: {
    total: number;
    count: number;
  };
  treasury: {
    balance: number;
    trend: 'up' | 'down' | 'stable';
  };
}

/**
 * Page Dashboard Financier Admin
 * Vue d'ensemble des finances avec budgets et depenses
 */
export default function AdminFinancialPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showBudgetDeleteConfirmDialog, setShowBudgetDeleteConfirmDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Form states
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    category: '',
    amount: '',
    period: 'year' as 'month' | 'quarter' | 'year',
    year: currentYear,
  });

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [editExpenseForm, setEditExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [editBudgetForm, setEditBudgetForm] = useState({
    name: '',
    category: '',
    amount: '',
    period: 'year' as 'month' | 'quarter' | 'year',
  });

  // Revenue state
  const [showCreateRevenueModal, setShowCreateRevenueModal] = useState(false);
  const [showEditRevenueModal, setShowEditRevenueModal] = useState(false);
  const [showDeleteRevenueConfirmDialog, setShowDeleteRevenueConfirmDialog] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState<FinancialRevenue | null>(null);

  const [revenueForm, setRevenueForm] = useState<{
    revenueType: 'donation' | 'grant' | 'sponsorship' | 'other';
    sourceName: string;
    sourceContact: string;
    amount: string;
    categoryId: string;
    receivedDate: string;
    paymentMethod: string;
    receiptUrl: string;
    notes: string;
  }>({
    revenueType: 'donation',
    sourceName: '',
    sourceContact: '',
    amount: '',
    categoryId: '',
    receivedDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    receiptUrl: '',
    notes: '',
  });

  const [editRevenueForm, setEditRevenueForm] = useState<{
    revenueType: 'donation' | 'grant' | 'sponsorship' | 'other';
    sourceName: string;
    sourceContact: string;
    amount: string;
    categoryId: string;
    receivedDate: string;
    paymentMethod: string;
    receiptUrl: string;
    notes: string;
  }>({
    revenueType: 'donation',
    sourceName: '',
    sourceContact: '',
    amount: '',
    categoryId: '',
    receivedDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    receiptUrl: '',
    notes: '',
  });

  // Subscription state
  const [showCreateSubscriptionModal, setShowCreateSubscriptionModal] = useState(false);
  const [showEditSubscriptionModal, setShowEditSubscriptionModal] = useState(false);
  const [showDeleteSubscriptionConfirmDialog, setShowDeleteSubscriptionConfirmDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<MemberSubscription | null>(null);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<'all' | 'active' | 'expired' | 'pending'>('all');

  // Subscription Types state
  const [subscriptionTypesTab, setSubscriptionTypesTab] = useState<'members' | 'types'>('members');
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [showDeleteTypeConfirmDialog, setShowDeleteTypeConfirmDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<SubscriptionType | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [typeForm, setTypeForm] = useState<{
    name: string;
    description: string;
    amount: string;
    durationType: 'monthly' | 'quarterly' | 'yearly';
    isActive: boolean;
  }>({
    name: '',
    description: '',
    amount: '',
    durationType: 'yearly',
    isActive: true,
  });

  const [assignForm, setAssignForm] = useState({
    subscriptionTypeId: '',
    memberName: '',
    memberEmail: '',
    startDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    notes: '',
  });

  const [subscriptionForm, setSubscriptionForm] = useState<{
    memberName: string;
    memberEmail: string;
    subscriptionType: 'adherent' | 'parrain' | 'bienfaiteur' | 'autre';
    amount: string;
    durationType: 'monthly' | 'quarterly' | 'yearly';
    paymentDate: string;
    paymentMethod: string;
    notes: string;
  }>({
    memberName: '',
    memberEmail: '',
    subscriptionType: 'adherent',
    amount: '',
    durationType: 'yearly',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    notes: '',
  });

  const [editSubscriptionForm, setEditSubscriptionForm] = useState<{
    memberName: string;
    memberEmail: string;
    subscriptionType: 'adherent' | 'parrain' | 'bienfaiteur' | 'autre';
    amount: string;
    durationType: 'monthly' | 'quarterly' | 'yearly';
    paymentDate: string;
    paymentMethod: string;
    notes: string;
  }>({
    memberName: '',
    memberEmail: '',
    subscriptionType: 'adherent',
    amount: '',
    durationType: 'yearly',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    notes: '',
  });

  // Queries
  const { data: budgetStats, isLoading: loadingBudgetStats } = useQuery({
    queryKey: queryKeys.financial.budgetStats({ year: selectedYear }),
    queryFn: () => api.get<ApiResponse<BudgetStats>>('/api/admin/finance/budgets/stats', { year: selectedYear }),
  });

  const { data: expenseStats, isLoading: loadingExpenseStats } = useQuery({
    queryKey: queryKeys.financial.expenseStats({ year: selectedYear }),
    queryFn: () => api.get<ApiResponse<ExpenseStats>>('/api/admin/finance/expenses/stats', { year: selectedYear }),
  });

  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: queryKeys.financial.budgets({ year: selectedYear }),
    queryFn: () => api.get<Budget[]>('/api/admin/finance/budgets', { year: selectedYear }),
  });

  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: queryKeys.financial.expenses({ year: selectedYear }),
    queryFn: () => api.get<Expense[]>('/api/admin/finance/expenses', { year: selectedYear }),
  });

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: queryKeys.financial.kpis({ year: selectedYear }),
    queryFn: () => api.get<ApiResponse<KPIs>>('/api/admin/finance/kpis/extended', { year: selectedYear }),
  });

  // Revenue queries
  const { data: revenues, isLoading: loadingRevenues } = useQuery({
    queryKey: ['financial', 'revenues', selectedYear],
    queryFn: () => api.get<FinancialRevenue[]>('/api/admin/finance/revenues', { year: selectedYear }),
  });

  const { data: revenueStatsResponse, isLoading: loadingRevenueStats } = useQuery({
    queryKey: ['financial', 'revenues', 'stats', selectedYear],
    queryFn: () => api.get<ApiResponse<RevenueStats>>('/api/admin/finance/revenues/stats', { year: selectedYear }),
  });

  const revenueStats = revenueStatsResponse?.data;
  const revenuesList = (revenues && Array.isArray(revenues) ? revenues : []) as FinancialRevenue[];

  // Subscription queries
  const { data: subscriptions, isLoading: loadingSubscriptions } = useQuery({
    queryKey: ['financial', 'subscriptions', selectedYear],
    queryFn: () => api.get<MemberSubscription[]>('/api/admin/finance/subscriptions', { year: selectedYear }),
  });

  const { data: subscriptionStatsResponse, isLoading: loadingSubscriptionStats } = useQuery({
    queryKey: ['financial', 'subscriptions', 'stats', selectedYear],
    queryFn: () => api.get<ApiResponse<SubscriptionStats>>('/api/admin/finance/subscriptions/stats', { year: selectedYear }),
  });

  const subscriptionStats = subscriptionStatsResponse?.data;
  const subscriptionsList = (subscriptions && Array.isArray(subscriptions) ? subscriptions : []) as MemberSubscription[];

  // Filter subscriptions based on status
  const filteredSubscriptions = subscriptionsList.filter(sub => {
    if (subscriptionStatusFilter === 'all') return true;
    return sub.status === subscriptionStatusFilter;
  });

  // Subscription Types queries
  const { data: subscriptionTypesResponse, isLoading: loadingTypes } = useQuery({
    queryKey: ['financial', 'subscription-types'],
    queryFn: () => api.get<ApiResponse<SubscriptionType[]>>('/api/admin/finance/subscription-types'),
  });

  const subscriptionTypes = (subscriptionTypesResponse?.data || []) as SubscriptionType[];
  const activeTypes = subscriptionTypes.filter(t => t.isActive);

  // Dashboard query
  const { data: dashboardOverview, isLoading: loadingDashboard } = useQuery({
    queryKey: ['financial', 'dashboard', 'overview', selectedYear],
    queryFn: () => api.get<ApiResponse<DashboardOverview>>('/api/admin/finance/dashboard/overview', { year: selectedYear }),
  });

  const dashboardData = dashboardOverview?.data;

  // Mutations
  const createBudgetMutation = useMutation({
    mutationFn: (data: {
      name: string;
      category: string;
      amountInCents: number;
      period: 'month' | 'quarter' | 'year';
      year: number;
      createdBy: string;
    }) => api.post('/api/admin/finance/budgets', data),
    onSuccess: () => {
      toast({
        title: 'Budget cree',
        description: 'Le budget a ete cree avec succes',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.all });
      setShowBudgetModal(false);
      resetBudgetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: {
      description: string;
      amountInCents: number;
      category: string;
      expenseDate: string;
      createdBy: string;
    }) => api.post('/api/admin/finance/expenses', data),
    onSuccess: () => {
      toast({
        title: 'Depense creee',
        description: 'La depense a ete enregistree avec succes',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.all });
      setShowExpenseModal(false);
      resetExpenseForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data: {
      id: string;
      description: string;
      amountInCents: number;
      category: string;
      expenseDate: string;
    }) => api.put(`/api/admin/finance/expenses/${data.id}`, {
      description: data.description,
      amountInCents: data.amountInCents,
      category: data.category,
      expenseDate: data.expenseDate,
    }),
    onSuccess: () => {
      toast({
        title: 'Depense modifiee',
        description: 'La depense a ete mise a jour avec succes',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.all });
      setShowEditExpenseModal(false);
      setSelectedExpense(null);
      resetEditExpenseForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/finance/expenses/${id}`),
    onSuccess: () => {
      toast({
        title: 'Depense supprimee',
        description: 'La depense a ete supprimee avec succes',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.all });
      setShowDeleteConfirmDialog(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: (data: {
      id: string;
      name: string;
      category: string;
      amountInCents: number;
      period: 'month' | 'quarter' | 'year';
    }) => api.put(`/api/admin/finance/budgets/${data.id}`, {
      name: data.name,
      category: data.category,
      amountInCents: data.amountInCents,
      period: data.period,
    }),
    onSuccess: () => {
      toast({
        title: 'Budget modifie',
        description: 'Le budget a ete mis a jour avec succes',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.all });
      setShowEditBudgetModal(false);
      setSelectedBudget(null);
      resetEditBudgetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/finance/budgets/${id}`),
    onSuccess: () => {
      toast({
        title: 'Budget supprime',
        description: 'Le budget a ete supprime avec succes',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.all });
      setShowBudgetDeleteConfirmDialog(false);
      setSelectedBudget(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Revenue mutations
  const createRevenueMutation = useMutation({
    mutationFn: (data: {
      revenueType: 'donation' | 'grant' | 'sponsorship' | 'other';
      sourceName: string;
      sourceContact?: string;
      amountInCents: number;
      categoryId?: string;
      receivedDate: string;
      paymentMethod?: string;
      receiptUrl?: string;
      notes?: string;
      createdBy: string;
    }) => api.post('/api/admin/finance/revenues', data),
    onSuccess: () => {
      toast({
        title: 'Revenu cree',
        description: 'Le revenu a ete enregistre avec succes',
      });
      queryClient.invalidateQueries({ queryKey: ['financial', 'revenues'] });
      setShowCreateRevenueModal(false);
      resetRevenueForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateRevenueMutation = useMutation({
    mutationFn: (data: {
      id: string;
      revenueType: 'donation' | 'grant' | 'sponsorship' | 'other';
      sourceName: string;
      sourceContact?: string;
      amountInCents: number;
      categoryId?: string;
      receivedDate: string;
      paymentMethod?: string;
      receiptUrl?: string;
      notes?: string;
    }) => api.put(`/api/admin/finance/revenues/${data.id}`, {
      revenueType: data.revenueType,
      sourceName: data.sourceName,
      sourceContact: data.sourceContact,
      amountInCents: data.amountInCents,
      categoryId: data.categoryId,
      receivedDate: data.receivedDate,
      paymentMethod: data.paymentMethod,
      receiptUrl: data.receiptUrl,
      notes: data.notes,
    }),
    onSuccess: () => {
      toast({
        title: 'Revenu modifie',
        description: 'Le revenu a ete mis a jour avec succes',
      });
      queryClient.invalidateQueries({ queryKey: ['financial', 'revenues'] });
      setShowEditRevenueModal(false);
      setSelectedRevenue(null);
      resetEditRevenueForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteRevenueMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/finance/revenues/${id}`),
    onSuccess: () => {
      toast({
        title: 'Revenu supprime',
        description: 'Le revenu a ete supprime avec succes',
      });
      queryClient.invalidateQueries({ queryKey: ['financial', 'revenues'] });
      setShowDeleteRevenueConfirmDialog(false);
      setSelectedRevenue(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Subscription mutations
  const createSubscriptionMutation = useMutation({
    mutationFn: (data: {
      memberName: string;
      memberEmail: string;
      subscriptionType: string;
      amountInCents: number;
      durationType: string;
      paymentDate: string;
      paymentMethod: string;
      notes?: string;
      createdBy: string;
    }) => api.post('/api/admin/finance/subscriptions', data),
    onSuccess: () => {
      toast({
        title: 'Cotisation creee',
        description: 'La cotisation a ete enregistree avec succes',
      });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscriptions'] });
      setShowCreateSubscriptionModal(false);
      resetSubscriptionForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: (data: {
      id: string;
      memberName: string;
      memberEmail: string;
      subscriptionType: string;
      amountInCents: number;
      durationType: string;
      paymentDate: string;
      paymentMethod: string;
      notes?: string;
    }) => api.put(`/api/admin/finance/subscriptions/${data.id}`, {
      memberName: data.memberName,
      memberEmail: data.memberEmail,
      subscriptionType: data.subscriptionType,
      amountInCents: data.amountInCents,
      durationType: data.durationType,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    }),
    onSuccess: () => {
      toast({
        title: 'Cotisation modifiee',
        description: 'La cotisation a ete mise a jour avec succes',
      });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscriptions'] });
      setShowEditSubscriptionModal(false);
      setSelectedSubscription(null);
      resetEditSubscriptionForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/finance/subscriptions/${id}`),
    onSuccess: () => {
      toast({
        title: 'Cotisation supprimee',
        description: 'La cotisation a ete supprimee avec succes',
      });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscriptions'] });
      setShowDeleteSubscriptionConfirmDialog(false);
      setSelectedSubscription(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Subscription Type mutations
  const createTypeMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      amountInCents: number;
      durationType: string;
      isActive: boolean;
    }) => api.post('/api/admin/finance/subscription-types', data),
    onSuccess: () => {
      toast({ title: 'Type créé', description: 'Le type de cotisation a été créé' });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscription-types'] });
      setShowCreateTypeModal(false);
      resetTypeForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: (data: { id: string } & Partial<SubscriptionType>) =>
      api.put(`/api/admin/finance/subscription-types/${data.id}`, data),
    onSuccess: () => {
      toast({ title: 'Type modifié' });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscription-types'] });
      setShowEditTypeModal(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/finance/subscription-types/${id}`),
    onSuccess: () => {
      toast({ title: 'Type supprimé' });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscription-types'] });
      setShowDeleteTypeConfirmDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const assignSubscriptionMutation = useMutation({
    mutationFn: (data: typeof assignForm) => api.post('/api/admin/finance/subscriptions/assign', data),
    onSuccess: () => {
      toast({ title: 'Cotisation attribuée', description: 'La cotisation a été attribuée au membre' });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscriptions'] });
      setShowAssignModal(false);
      resetAssignForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const revokeSubscriptionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/finance/subscriptions/${id}/revoke`),
    onSuccess: () => {
      toast({ title: 'Cotisation révoquée' });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscriptions'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const renewSubscriptionMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/finance/subscriptions/${id}/renew`, {}),
    onSuccess: () => {
      toast({ title: 'Cotisation renouvelée' });
      queryClient.invalidateQueries({ queryKey: ['financial', 'subscriptions'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const resetBudgetForm = () => {
    setBudgetForm({
      name: '',
      category: '',
      amount: '',
      period: 'year',
      year: currentYear,
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      description: '',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const resetEditExpenseForm = () => {
    setEditExpenseForm({
      description: '',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const resetEditBudgetForm = () => {
    setEditBudgetForm({
      name: '',
      category: '',
      amount: '',
      period: 'year',
    });
  };

  const handleCreateBudget = () => {
    if (!budgetForm.name || !budgetForm.amount) {
      toast({
        title: 'Erreur',
        description: 'Le nom et le montant sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    createBudgetMutation.mutate({
      name: budgetForm.name,
      category: budgetForm.category,
      amountInCents: Math.round(parseFloat(budgetForm.amount) * 100),
      period: budgetForm.period,
      year: budgetForm.year,
      createdBy: 'admin@cjd-amiens.fr', // TODO: get from session
    });
  };

  const handleCreateExpense = () => {
    if (!expenseForm.description || !expenseForm.amount) {
      toast({
        title: 'Erreur',
        description: 'La description et le montant sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    createExpenseMutation.mutate({
      description: expenseForm.description,
      amountInCents: Math.round(parseFloat(expenseForm.amount) * 100),
      category: expenseForm.category,
      expenseDate: expenseForm.date,
      createdBy: 'admin@cjd-amiens.fr', // TODO: get from session
    });
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditExpenseForm({
      description: expense.description,
      amount: (expense.amount / 100).toString(),
      category: expense.category || '',
      date: expense.date.split('T')[0],
    });
    setShowEditExpenseModal(true);
  };

  const handleSaveEditExpense = () => {
    if (!editExpenseForm.description || !editExpenseForm.amount || !selectedExpense) {
      toast({
        title: 'Erreur',
        description: 'La description et le montant sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    updateExpenseMutation.mutate({
      id: selectedExpense.id,
      description: editExpenseForm.description,
      amountInCents: Math.round(parseFloat(editExpenseForm.amount) * 100),
      category: editExpenseForm.category,
      expenseDate: editExpenseForm.date,
    });
  };

  const handleDeleteExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = () => {
    if (selectedExpense) {
      deleteExpenseMutation.mutate(selectedExpense.id);
    }
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setEditBudgetForm({
      name: budget.name,
      category: budget.category || '',
      amount: (budget.amount / 100).toString(),
      period: (budget.period as 'month' | 'quarter' | 'year') || 'year',
    });
    setShowEditBudgetModal(true);
  };

  const handleSaveEditBudget = () => {
    if (!editBudgetForm.name || !editBudgetForm.amount || !selectedBudget) {
      toast({
        title: 'Erreur',
        description: 'Le nom et le montant sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    updateBudgetMutation.mutate({
      id: selectedBudget.id,
      name: editBudgetForm.name,
      category: editBudgetForm.category,
      amountInCents: Math.round(parseFloat(editBudgetForm.amount) * 100),
      period: editBudgetForm.period,
    });
  };

  const handleDeleteBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowBudgetDeleteConfirmDialog(true);
  };

  const handleConfirmBudgetDelete = () => {
    if (selectedBudget) {
      deleteBudgetMutation.mutate(selectedBudget.id);
    }
  };

  // Revenue handlers
  const resetRevenueForm = () => {
    setRevenueForm({
      revenueType: 'donation',
      sourceName: '',
      sourceContact: '',
      amount: '',
      categoryId: '',
      receivedDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      receiptUrl: '',
      notes: '',
    });
  };

  const resetEditRevenueForm = () => {
    setEditRevenueForm({
      revenueType: 'donation',
      sourceName: '',
      sourceContact: '',
      amount: '',
      categoryId: '',
      receivedDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      receiptUrl: '',
      notes: '',
    });
  };

  const handleCreateRevenue = () => {
    if (!revenueForm.sourceName || !revenueForm.amount) {
      toast({
        title: 'Erreur',
        description: 'La source et le montant sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    createRevenueMutation.mutate({
      revenueType: revenueForm.revenueType,
      sourceName: revenueForm.sourceName,
      sourceContact: revenueForm.sourceContact,
      amountInCents: Math.round(parseFloat(revenueForm.amount) * 100),
      categoryId: revenueForm.categoryId,
      receivedDate: revenueForm.receivedDate,
      paymentMethod: revenueForm.paymentMethod,
      receiptUrl: revenueForm.receiptUrl,
      notes: revenueForm.notes,
      createdBy: 'admin@cjd-amiens.fr', // TODO: get from session
    });
  };

  const handleEditRevenue = (revenue: FinancialRevenue) => {
    setSelectedRevenue(revenue);
    setEditRevenueForm({
      revenueType: revenue.revenueType,
      sourceName: revenue.sourceName,
      sourceContact: revenue.sourceContact || '',
      amount: (revenue.amountInCents / 100).toString(),
      categoryId: revenue.categoryId || '',
      receivedDate: revenue.receivedDate.split('T')[0],
      paymentMethod: revenue.paymentMethod || '',
      receiptUrl: revenue.receiptUrl || '',
      notes: revenue.notes || '',
    });
    setShowEditRevenueModal(true);
  };

  const handleSaveEditRevenue = () => {
    if (!editRevenueForm.sourceName || !editRevenueForm.amount || !selectedRevenue) {
      toast({
        title: 'Erreur',
        description: 'La source et le montant sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    updateRevenueMutation.mutate({
      id: selectedRevenue.id,
      revenueType: editRevenueForm.revenueType,
      sourceName: editRevenueForm.sourceName,
      sourceContact: editRevenueForm.sourceContact,
      amountInCents: Math.round(parseFloat(editRevenueForm.amount) * 100),
      categoryId: editRevenueForm.categoryId,
      receivedDate: editRevenueForm.receivedDate,
      paymentMethod: editRevenueForm.paymentMethod,
      receiptUrl: editRevenueForm.receiptUrl,
      notes: editRevenueForm.notes,
    });
  };

  const handleDeleteRevenue = (revenue: FinancialRevenue) => {
    setSelectedRevenue(revenue);
    setShowDeleteRevenueConfirmDialog(true);
  };

  const handleConfirmDeleteRevenue = () => {
    if (selectedRevenue) {
      deleteRevenueMutation.mutate(selectedRevenue.id);
    }
  };

  // Subscription handlers
  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      memberName: '',
      memberEmail: '',
      subscriptionType: 'adherent',
      amount: '',
      durationType: 'yearly',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      notes: '',
    });
  };

  const resetEditSubscriptionForm = () => {
    setEditSubscriptionForm({
      memberName: '',
      memberEmail: '',
      subscriptionType: 'adherent',
      amount: '',
      durationType: 'yearly',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      notes: '',
    });
  };

  const calculateSubscriptionDates = (paymentDate: string, durationType: string) => {
    const startDate = new Date(paymentDate);
    const endDate = new Date(paymentDate);

    switch (durationType) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const handleCreateSubscription = () => {
    if (!subscriptionForm.memberName || !subscriptionForm.memberEmail || !subscriptionForm.amount) {
      toast({
        title: 'Erreur',
        description: 'Le nom, l\'email et le montant sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(subscriptionForm.memberEmail)) {
      toast({
        title: 'Erreur',
        description: 'Format d\'email invalide',
        variant: 'destructive',
      });
      return;
    }

    createSubscriptionMutation.mutate({
      memberName: subscriptionForm.memberName,
      memberEmail: subscriptionForm.memberEmail,
      subscriptionType: subscriptionForm.subscriptionType,
      amountInCents: Math.round(parseFloat(subscriptionForm.amount) * 100),
      durationType: subscriptionForm.durationType,
      paymentDate: subscriptionForm.paymentDate,
      paymentMethod: subscriptionForm.paymentMethod,
      notes: subscriptionForm.notes,
      createdBy: 'admin@cjd-amiens.fr', // TODO: get from session
    });
  };

  const handleEditSubscription = (subscription: MemberSubscription) => {
    setSelectedSubscription(subscription);
    setEditSubscriptionForm({
      memberName: subscription.memberName,
      memberEmail: subscription.memberEmail,
      subscriptionType: subscription.subscriptionType,
      amount: (subscription.amountInCents / 100).toString(),
      durationType: subscription.durationType,
      paymentDate: subscription.paymentDate.split('T')[0],
      paymentMethod: subscription.paymentMethod || 'bank_transfer',
      notes: subscription.notes || '',
    });
    setShowEditSubscriptionModal(true);
  };

  const handleSaveEditSubscription = () => {
    if (!editSubscriptionForm.memberName || !editSubscriptionForm.memberEmail || !editSubscriptionForm.amount || !selectedSubscription) {
      toast({
        title: 'Erreur',
        description: 'Le nom, l\'email et le montant sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editSubscriptionForm.memberEmail)) {
      toast({
        title: 'Erreur',
        description: 'Format d\'email invalide',
        variant: 'destructive',
      });
      return;
    }

    updateSubscriptionMutation.mutate({
      id: selectedSubscription.id,
      memberName: editSubscriptionForm.memberName,
      memberEmail: editSubscriptionForm.memberEmail,
      subscriptionType: editSubscriptionForm.subscriptionType,
      amountInCents: Math.round(parseFloat(editSubscriptionForm.amount) * 100),
      durationType: editSubscriptionForm.durationType,
      paymentDate: editSubscriptionForm.paymentDate,
      paymentMethod: editSubscriptionForm.paymentMethod,
      notes: editSubscriptionForm.notes,
    });
  };

  const handleDeleteSubscription = (subscription: MemberSubscription) => {
    setSelectedSubscription(subscription);
    setShowDeleteSubscriptionConfirmDialog(true);
  };

  const handleConfirmDeleteSubscription = () => {
    if (selectedSubscription) {
      deleteSubscriptionMutation.mutate(selectedSubscription.id);
    }
  };

  // Subscription Type handlers
  const resetTypeForm = () => {
    setTypeForm({
      name: '',
      description: '',
      amount: '',
      durationType: 'yearly',
      isActive: true,
    });
  };

  const resetAssignForm = () => {
    setAssignForm({
      subscriptionTypeId: '',
      memberName: '',
      memberEmail: '',
      startDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      notes: '',
    });
  };

  const handleCreateType = () => {
    if (!typeForm.name || !typeForm.amount) {
      toast({ title: 'Erreur', description: 'Nom et montant requis', variant: 'destructive' });
      return;
    }

    createTypeMutation.mutate({
      name: typeForm.name,
      description: typeForm.description || undefined,
      amountInCents: Math.round(parseFloat(typeForm.amount) * 100),
      durationType: typeForm.durationType,
      isActive: typeForm.isActive,
    });
  };

  const handleEditType = (type: SubscriptionType) => {
    setSelectedType(type);
    setTypeForm({
      name: type.name,
      description: type.description || '',
      amount: (type.amountInCents / 100).toString(),
      durationType: type.durationType,
      isActive: type.isActive,
    });
    setShowEditTypeModal(true);
  };

  const handleSaveEditType = () => {
    if (!typeForm.name || !typeForm.amount || !selectedType) {
      toast({ title: 'Erreur', description: 'Nom et montant requis', variant: 'destructive' });
      return;
    }

    updateTypeMutation.mutate({
      id: selectedType.id,
      name: typeForm.name,
      description: typeForm.description || undefined,
      amountInCents: Math.round(parseFloat(typeForm.amount) * 100),
      durationType: typeForm.durationType,
      isActive: typeForm.isActive,
    });
  };

  const handleAssign = () => {
    if (!assignForm.subscriptionTypeId || !assignForm.memberEmail || !assignForm.memberName) {
      toast({ title: 'Erreur', description: 'Champs requis manquants', variant: 'destructive' });
      return;
    }

    assignSubscriptionMutation.mutate(assignForm);
  };

  const getDurationLabel = (endDate: string): string => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expiré';
    if (diffDays === 0) return 'Expire aujourd\'hui';
    if (diffDays === 1) return 'Expire demain';
    if (diffDays < 7) return `Expire dans ${diffDays} jours`;
    if (diffDays < 30) return `Expire dans ${Math.ceil(diffDays / 7)} semaines`;
    return `Expire dans ${Math.ceil(diffDays / 30)} mois`;
  };

  const getSubscriptionTypeLabel = (type: string): string => {
    switch (type) {
      case 'adherent':
        return 'Adhérent';
      case 'parrain':
        return 'Parrain';
      case 'bienfaiteur':
        return 'Bienfaiteur';
      case 'autre':
        return 'Autre';
      default:
        return type;
    }
  };

  const getDurationTypeLabel = (type: string): string => {
    switch (type) {
      case 'monthly':
        return 'Mensuel';
      case 'quarterly':
        return 'Trimestriel';
      case 'yearly':
        return 'Annuel';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expirée';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return '';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const isLoading = loadingBudgetStats || loadingExpenseStats || loadingKpis;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Extract data with proper type narrowing
  const kpiData = (kpis && 'data' in kpis ? kpis.data : {
    totalBudget: 0,
    totalExpenses: 0,
    balance: 0,
    utilizationRate: 0
  }) as KPIs;

  const budgetStatsData = (budgetStats && 'data' in budgetStats ? budgetStats.data : {
    totalAllocated: 0,
    totalSpent: 0,
    count: 0,
    balance: 0
  }) as BudgetStats;

  const expenseStatsData = (expenseStats && 'data' in expenseStats ? expenseStats.data : {
    total: 0,
    average: 0,
    count: 0,
    categoriesCount: 0
  }) as ExpenseStats;

  const budgetsList = (budgets && Array.isArray(budgets) ? budgets : []) as Budget[];
  const expensesList = (expenses && Array.isArray(expenses) ? expenses : []) as Expense[];

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financier</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des finances de l'association
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" title="Exporter">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Budget Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(kpiData.totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Alloue pour {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Depenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-error" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error-dark">
              {formatCurrency(kpiData.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total depense
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Solde</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpiData.balance >= 0 ? 'text-success-dark' : 'text-error-dark'}`}>
              {formatCurrency(kpiData.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Taux d'utilisation</CardTitle>
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiData.utilizationRate ? `${kpiData.utilizationRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budget consomme
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs pour Dashboard, Revenus, Depenses et Cotisations */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="revenues">Revenus</TabsTrigger>
          <TabsTrigger value="expenses">Depenses</TabsTrigger>
          <TabsTrigger value="cotisations">Cotisations</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {loadingDashboard ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : dashboardData ? (
            <>
              {/* Charts Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Revenue Breakdown Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Repartition des revenus</CardTitle>
                    <CardDescription>
                      Ventilation par type de revenus pour {selectedYear}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Cotisations', value: dashboardData.subscriptions.total / 100 },
                            { name: 'Dons', value: dashboardData.revenues.byType.donations / 100 },
                            { name: 'Subventions', value: dashboardData.revenues.byType.grants / 100 },
                            { name: 'Sponsoring', value: dashboardData.revenues.byType.sponsorships / 100 },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Cotisations', value: dashboardData.subscriptions.total / 100 },
                            { name: 'Dons', value: dashboardData.revenues.byType.donations / 100 },
                            { name: 'Subventions', value: dashboardData.revenues.byType.grants / 100 },
                            { name: 'Sponsoring', value: dashboardData.revenues.byType.sponsorships / 100 },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#a855f7', '#f97316'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Expenses by Category Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Depenses par categorie</CardTitle>
                    <CardDescription>
                      Total des depenses pour {selectedYear}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={
                          expensesList && expensesList.length > 0
                            ? Object.entries(
                                expensesList.reduce((acc: Record<string, number>, expense: Expense) => {
                                  const category = expense.category || 'Non categorise';
                                  acc[category] = (acc[category] || 0) + expense.amount;
                                  return acc;
                                }, {})
                              ).map(([category, amount]) => ({
                                category,
                                amount,
                              }))
                            : []
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="amount" fill="#22c55e" name="Montant" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Treasury Overview Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Tresorerie actuelle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${dashboardData.treasury.balance >= 0 ? 'text-success-dark' : 'text-error-dark'}`}>
                      {formatCurrency(dashboardData.treasury.balance / 100)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {dashboardData.treasury.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : dashboardData.treasury.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-error" />
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {dashboardData.treasury.trend === 'up' ? 'En hausse' : dashboardData.treasury.trend === 'down' ? 'En baisse' : 'Stable'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Cotisations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success-dark">
                      {formatCurrency(dashboardData.subscriptions.total / 100)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardData.subscriptions.activeMembers} membres actifs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Autres Revenus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success-dark">
                      {formatCurrency(dashboardData.revenues.total / 100)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dons, subventions, sponsoring
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Depenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-error-dark">
                      {formatCurrency(dashboardData.expenses.total / 100)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardData.expenses.count} depense(s)
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Transactions recentes</CardTitle>
                  <CardDescription>
                    Historique combine des transactions pour {selectedYear}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ...subscriptionsList.map(sub => ({
                          id: sub.id,
                          date: new Date(sub.paymentDate),
                          type: 'cotisation' as const,
                          description: `${sub.memberName} - ${sub.subscriptionType}`,
                          category: 'Cotisation',
                          amount: sub.amountInCents / 100,
                        })),
                        ...revenuesList.map(rev => ({
                          id: rev.id,
                          date: new Date(rev.receivedDate),
                          type: 'revenu' as const,
                          description: `${rev.sourceName} - ${rev.revenueType}`,
                          category: rev.revenueType,
                          amount: rev.amountInCents / 100,
                        })),
                        ...expensesList.map(exp => ({
                          id: exp.id,
                          date: new Date(exp.date),
                          type: 'depense' as const,
                          description: exp.description,
                          category: exp.category || 'Non categorise',
                          amount: -exp.amount,
                        })),
                      ]
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                        .slice(0, 20)
                        .map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">
                              {transaction.date.toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  transaction.type === 'cotisation'
                                    ? 'default'
                                    : transaction.type === 'revenu'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                              >
                                {transaction.type === 'cotisation'
                                  ? 'Cotisation'
                                  : transaction.type === 'revenu'
                                  ? 'Revenu'
                                  : 'Depense'}
                              </Badge>
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.category}</Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-success-dark' : 'text-error-dark'}`}>
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      {subscriptionsList.length === 0 && revenuesList.length === 0 && expensesList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Aucune transaction trouvee
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune donnee disponible pour le dashboard
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="revenues" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Revenus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency((revenueStats?.totalAmount ?? 0) / 100)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pour {selectedYear}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Nombre de revenus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenuesList.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenus enregistres
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Montant moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(revenuesList.length > 0 ? (revenueStats?.totalAmount ?? 0) / revenuesList.length / 100 : 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Par revenu
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Donors Section */}
          {revenueStats?.topDonors && revenueStats.topDonors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Donateurs</CardTitle>
                <CardDescription>
                  Les {Math.min(5, revenueStats.topDonors.length)} principales sources de revenus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueStats.topDonors.slice(0, 5).map((donor, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <span className="font-medium">{donor.name}</span>
                      </div>
                      <span className="font-bold text-green-600">{formatCurrency(donor.total / 100)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenues List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Liste des revenus</CardTitle>
                  <CardDescription>
                    {revenuesList.length} revenu(s) pour {selectedYear}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateRevenueModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau revenu
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRevenues ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenuesList.length > 0 ? (
                      revenuesList.map((revenue: FinancialRevenue) => (
                        <TableRow key={revenue.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {revenue.revenueType === 'donation' ? 'Don' :
                               revenue.revenueType === 'grant' ? 'Subvention' :
                               revenue.revenueType === 'sponsorship' ? 'Sponsoring' : 'Autre'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{revenue.sourceName}</div>
                            {revenue.sourceContact && (
                              <div className="text-sm text-muted-foreground">{revenue.sourceContact}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-green-600">
                            {formatCurrency(revenue.amountInCents / 100)}
                          </TableCell>
                          <TableCell>
                            {new Date(revenue.receivedDate).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Modifier"
                                onClick={() => handleEditRevenue(revenue)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Supprimer"
                                onClick={() => handleDeleteRevenue(revenue)}
                                className="h-8 w-8 text-error hover:text-error-dark hover:bg-error/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Aucun revenu trouve
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Depenses enregistrees</CardTitle>
                  <CardDescription>
                    {expensesList.length} depense(s) pour {selectedYear}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowExpenseModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle depense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesList.length > 0 ? (
                      expensesList.map((expense: Expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>
                            {expense.category ? (
                              <Badge variant="outline">{expense.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(expense.date).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right text-error-dark font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Modifier"
                                onClick={() => handleEditExpense(expense)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Supprimer"
                                onClick={() => handleDeleteExpense(expense)}
                                className="h-8 w-8 text-error hover:text-error-dark hover:bg-error/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Aucune depense trouvee
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cotisations" className="space-y-4">
          {/* Sous-onglets */}
          <Tabs defaultValue="members" value={subscriptionTypesTab} onValueChange={(v) => setSubscriptionTypesTab(v as 'members' | 'types')}>
            <TabsList>
              <TabsTrigger value="members">Membres avec Cotisation</TabsTrigger>
              <TabsTrigger value="types">Types de Cotisations</TabsTrigger>
            </TabsList>

            {/* ONGLET 1: Membres avec Cotisation */}
            <TabsContent value="members" className="space-y-4">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Montant Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency((subscriptionStats?.totalAmount ?? 0) / 100)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cotisations pour {selectedYear}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Adherents Actifs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {subscriptionStats?.activeMembers ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cotisations actives
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {subscriptionStats?.expiringMembersCount ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      A renouveler
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Taux de Renouvellement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {subscriptionStats?.renewalRate ? `${subscriptionStats.renewalRate.toFixed(1)}%` : '0%'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Taux de renouvellement
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex gap-2">
                {(['all', 'active', 'expired', 'pending'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={subscriptionStatusFilter === status ? 'default' : 'outline'}
                    onClick={() => setSubscriptionStatusFilter(status)}
                  >
                    {status === 'all' ? 'Toutes' : getStatusLabel(status)}
                  </Button>
                ))}
              </div>

              {/* Subscriptions Table */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Membres avec Cotisation Active</CardTitle>
                      <CardDescription>
                        {filteredSubscriptions.length} cotisation(s)
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowAssignModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Attribuer une Cotisation
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSubscriptions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Membre</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Expire</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubscriptions.length > 0 ? (
                          filteredSubscriptions.map((subscription: MemberSubscription) => (
                            <TableRow key={subscription.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{subscription.memberName}</div>
                                  <div className="text-sm text-muted-foreground">{subscription.memberEmail}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge>{getSubscriptionTypeLabel(subscription.subscriptionType)}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(subscription.amountInCents / 100)}
                              </TableCell>
                              <TableCell>
                                {new Date(subscription.endDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                                  <Badge variant="destructive" className="mr-2">🔥 Expire bientôt</Badge>
                                )}
                                {getDurationLabel(subscription.endDate)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => renewSubscriptionMutation.mutate(subscription.id)}
                                    title="Renouveler"
                                  >
                                    🔄
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => revokeSubscriptionMutation.mutate(subscription.id)}
                                    title="Révoquer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Aucune cotisation trouvee
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ONGLET 2: Types de Cotisations */}
            <TabsContent value="types" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Types de Cotisations</CardTitle>
                      <CardDescription>{subscriptionTypes.length} type(s) défini(s)</CardDescription>
                    </div>
                    <Button onClick={() => setShowCreateTypeModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un Type
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingTypes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Durée</TableHead>
                          <TableHead>Membres</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptionTypes.length > 0 ? (
                          subscriptionTypes.map((type: SubscriptionType) => (
                            <TableRow key={type.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{type.name}</div>
                                  {type.description && (
                                    <div className="text-sm text-muted-foreground">{type.description}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(type.amountInCents / 100)}
                              </TableCell>
                              <TableCell>{getDurationTypeLabel(type.durationType)}</TableCell>
                              <TableCell>{type._count?.subscriptions || 0} membre(s)</TableCell>
                              <TableCell>
                                <Badge variant={type.isActive ? 'default' : 'secondary'}>
                                  {type.isActive ? 'Actif' : 'Inactif'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditType(type)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedType(type);
                                      setShowDeleteTypeConfirmDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              Aucun type défini
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Modal creation budget */}
      <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Creer un budget</DialogTitle>
            <DialogDescription>
              Definissez un nouveau budget pour l'association
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget-name">Nom du budget *</Label>
              <Input
                id="budget-name"
                value={budgetForm.name}
                onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                placeholder="Ex: Evenements Q1"
              />
            </div>
            <div>
              <Label htmlFor="budget-category">Categorie</Label>
              <Input
                id="budget-category"
                value={budgetForm.category}
                onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                placeholder="Ex: Evenements"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget-amount">Montant *</Label>
                <Input
                  id="budget-amount"
                  type="number"
                  step="0.01"
                  value={budgetForm.amount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="budget-year">Annee</Label>
                <Select
                  value={budgetForm.year.toString()}
                  onValueChange={(val) => setBudgetForm({ ...budgetForm, year: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="budget-period">Periode</Label>
              <Select
                value={budgetForm.period}
                onValueChange={(val) => setBudgetForm({ ...budgetForm, period: val as 'month' | 'quarter' | 'year' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Annuel</SelectItem>
                  <SelectItem value="quarter">Trimestriel</SelectItem>
                  <SelectItem value="month">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudgetModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateBudget} disabled={createBudgetMutation.isPending}>
              {createBudgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal edition budget */}
      <Dialog open={showEditBudgetModal} onOpenChange={setShowEditBudgetModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le budget</DialogTitle>
            <DialogDescription>
              Mettez a jour les details du budget
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-budget-name">Nom du budget *</Label>
              <Input
                id="edit-budget-name"
                value={editBudgetForm.name}
                onChange={(e) => setEditBudgetForm({ ...editBudgetForm, name: e.target.value })}
                placeholder="Ex: Evenements Q1"
              />
            </div>
            <div>
              <Label htmlFor="edit-budget-category">Categorie</Label>
              <Input
                id="edit-budget-category"
                value={editBudgetForm.category}
                onChange={(e) => setEditBudgetForm({ ...editBudgetForm, category: e.target.value })}
                placeholder="Ex: Evenements"
              />
            </div>
            <div>
              <Label htmlFor="edit-budget-amount">Montant *</Label>
              <Input
                id="edit-budget-amount"
                type="number"
                step="0.01"
                value={editBudgetForm.amount}
                onChange={(e) => setEditBudgetForm({ ...editBudgetForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-budget-period">Periode</Label>
              <Select
                value={editBudgetForm.period}
                onValueChange={(val) => setEditBudgetForm({ ...editBudgetForm, period: val as 'month' | 'quarter' | 'year' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Annuel</SelectItem>
                  <SelectItem value="quarter">Trimestriel</SelectItem>
                  <SelectItem value="month">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditBudgetModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEditBudget} disabled={updateBudgetMutation.isPending}>
              {updateBudgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression de budget */}
      <Dialog open={showBudgetDeleteConfirmDialog} onOpenChange={setShowBudgetDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer le budget "{selectedBudget?.name}" ? Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudgetDeleteConfirmDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBudgetDelete}
              disabled={deleteBudgetMutation.isPending}
            >
              {deleteBudgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal creation depense */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une depense</DialogTitle>
            <DialogDescription>
              Ajoutez une nouvelle depense
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="expense-description">Description *</Label>
              <Input
                id="expense-description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Ex: Location salle"
              />
            </div>
            <div>
              <Label htmlFor="expense-category">Categorie</Label>
              <Input
                id="expense-category"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                placeholder="Ex: Evenements"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense-amount">Montant *</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateExpense} disabled={createExpenseMutation.isPending}>
              {createExpenseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal edition depense */}
      <Dialog open={showEditExpenseModal} onOpenChange={setShowEditExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la depense</DialogTitle>
            <DialogDescription>
              Mettez a jour les informations de la depense
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-expense-description">Description *</Label>
              <Input
                id="edit-expense-description"
                value={editExpenseForm.description}
                onChange={(e) => setEditExpenseForm({ ...editExpenseForm, description: e.target.value })}
                placeholder="Ex: Location salle"
              />
            </div>
            <div>
              <Label htmlFor="edit-expense-category">Categorie</Label>
              <Input
                id="edit-expense-category"
                value={editExpenseForm.category}
                onChange={(e) => setEditExpenseForm({ ...editExpenseForm, category: e.target.value })}
                placeholder="Ex: Evenements"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-expense-amount">Montant *</Label>
                <Input
                  id="edit-expense-amount"
                  type="number"
                  step="0.01"
                  value={editExpenseForm.amount}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="edit-expense-date">Date</Label>
                <Input
                  id="edit-expense-date"
                  type="date"
                  value={editExpenseForm.date}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditExpenseModal(false);
              setSelectedExpense(null);
              resetEditExpenseForm();
            }}>
              Annuler
            </Button>
            <Button onClick={handleSaveEditExpense} disabled={updateExpenseMutation.isPending}>
              {updateExpenseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog pour suppression */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la depense</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer cette depense ? Cette action ne peut pas etre annulee.
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="bg-muted p-3 rounded-md space-y-2">
              <p className="text-sm"><span className="font-medium">Description:</span> {selectedExpense.description}</p>
              <p className="text-sm"><span className="font-medium">Montant:</span> {formatCurrency(selectedExpense.amount)}</p>
              <p className="text-sm"><span className="font-medium">Date:</span> {new Date(selectedExpense.date).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteConfirmDialog(false);
              setSelectedExpense(null);
            }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal creation revenu */}
      <Dialog open={showCreateRevenueModal} onOpenChange={setShowCreateRevenueModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enregistrer un revenu</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau revenu (don, subvention, sponsoring)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="revenue-type">Type de revenu *</Label>
              <Select value={revenueForm.revenueType} onValueChange={(value) => setRevenueForm({ ...revenueForm, revenueType: value as 'donation' | 'grant' | 'sponsorship' | 'other' })}>
                <SelectTrigger id="revenue-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="donation">Don</SelectItem>
                  <SelectItem value="grant">Subvention</SelectItem>
                  <SelectItem value="sponsorship">Sponsoring</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="revenue-source">Source *</Label>
              <Input id="revenue-source" value={revenueForm.sourceName} onChange={(e) => setRevenueForm({ ...revenueForm, sourceName: e.target.value })} placeholder="Ex: Fondation XYZ, Entreprise ABC" />
            </div>
            <div>
              <Label htmlFor="revenue-contact">Contact</Label>
              <Input id="revenue-contact" value={revenueForm.sourceContact} onChange={(e) => setRevenueForm({ ...revenueForm, sourceContact: e.target.value })} placeholder="Ex: email@exemple.fr" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="revenue-amount">Montant *</Label>
                <Input id="revenue-amount" type="number" step="0.01" value={revenueForm.amount} onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="revenue-date">Date de reception *</Label>
                <Input id="revenue-date" type="date" value={revenueForm.receivedDate} onChange={(e) => setRevenueForm({ ...revenueForm, receivedDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="revenue-category">Categorie</Label>
              <Select value={revenueForm.categoryId} onValueChange={(value) => setRevenueForm({ ...revenueForm, categoryId: value })}>
                <SelectTrigger id="revenue-category"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                <SelectContent>
                  {/* Categories will be populated from data */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="revenue-payment">Mode de paiement</Label>
              <Select value={revenueForm.paymentMethod} onValueChange={(value) => setRevenueForm({ ...revenueForm, paymentMethod: value })}>
                <SelectTrigger id="revenue-payment"><SelectValue placeholder="Sélectionner un mode de paiement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="virement">Virement bancaire</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="especes">Especes</SelectItem>
                  <SelectItem value="carte">Carte bancaire</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="revenue-notes">Notes</Label>
              <Input id="revenue-notes" value={revenueForm.notes} onChange={(e) => setRevenueForm({ ...revenueForm, notes: e.target.value })} placeholder="Notes supplementaires" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRevenueModal(false)}>Annuler</Button>
            <Button onClick={handleCreateRevenue} disabled={createRevenueMutation.isPending}>{createRevenueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal edition revenu */}
      <Dialog open={showEditRevenueModal} onOpenChange={setShowEditRevenueModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le revenu</DialogTitle>
            <DialogDescription>Mettez a jour les informations du revenu</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-revenue-type">Type de revenu *</Label>
              <Select value={editRevenueForm.revenueType} onValueChange={(value) => setEditRevenueForm({ ...editRevenueForm, revenueType: value as 'donation' | 'grant' | 'sponsorship' | 'other' })}>
                <SelectTrigger id="edit-revenue-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="donation">Don</SelectItem>
                  <SelectItem value="grant">Subvention</SelectItem>
                  <SelectItem value="sponsorship">Sponsoring</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-revenue-source">Source *</Label>
              <Input id="edit-revenue-source" value={editRevenueForm.sourceName} onChange={(e) => setEditRevenueForm({ ...editRevenueForm, sourceName: e.target.value })} placeholder="Ex: Fondation XYZ" />
            </div>
            <div>
              <Label htmlFor="edit-revenue-contact">Contact</Label>
              <Input id="edit-revenue-contact" value={editRevenueForm.sourceContact} onChange={(e) => setEditRevenueForm({ ...editRevenueForm, sourceContact: e.target.value })} placeholder="Ex: email@exemple.fr" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-revenue-amount">Montant *</Label>
                <Input id="edit-revenue-amount" type="number" step="0.01" value={editRevenueForm.amount} onChange={(e) => setEditRevenueForm({ ...editRevenueForm, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="edit-revenue-date">Date de reception *</Label>
                <Input id="edit-revenue-date" type="date" value={editRevenueForm.receivedDate} onChange={(e) => setEditRevenueForm({ ...editRevenueForm, receivedDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-revenue-category">Categorie</Label>
              <Select value={editRevenueForm.categoryId} onValueChange={(value) => setEditRevenueForm({ ...editRevenueForm, categoryId: value })}>
                <SelectTrigger id="edit-revenue-category"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                <SelectContent></SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-revenue-payment">Mode de paiement</Label>
              <Select value={editRevenueForm.paymentMethod} onValueChange={(value) => setEditRevenueForm({ ...editRevenueForm, paymentMethod: value })}>
                <SelectTrigger id="edit-revenue-payment"><SelectValue placeholder="Sélectionner un mode de paiement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="virement">Virement bancaire</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="especes">Especes</SelectItem>
                  <SelectItem value="carte">Carte bancaire</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-revenue-notes">Notes</Label>
              <Input id="edit-revenue-notes" value={editRevenueForm.notes} onChange={(e) => setEditRevenueForm({ ...editRevenueForm, notes: e.target.value })} placeholder="Notes supplementaires" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditRevenueModal(false); setSelectedRevenue(null); resetEditRevenueForm(); }}>Annuler</Button>
            <Button onClick={handleSaveEditRevenue} disabled={updateRevenueMutation.isPending}>{updateRevenueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression de revenu */}
      <Dialog open={showDeleteRevenueConfirmDialog} onOpenChange={setShowDeleteRevenueConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le revenu</DialogTitle>
            <DialogDescription>Etes-vous sur de vouloir supprimer ce revenu ? Cette action ne peut pas etre annulee.</DialogDescription>
          </DialogHeader>
          {selectedRevenue && (
            <div className="bg-muted p-3 rounded-md space-y-2">
              <p className="text-sm"><span className="font-medium">Source:</span> {selectedRevenue.sourceName}</p>
              <p className="text-sm"><span className="font-medium">Montant:</span> {formatCurrency(selectedRevenue.amountInCents / 100)}</p>
              <p className="text-sm"><span className="font-medium">Date:</span> {new Date(selectedRevenue.receivedDate).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteRevenueConfirmDialog(false); setSelectedRevenue(null); }}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteRevenue} disabled={deleteRevenueMutation.isPending}>{deleteRevenueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal creation cotisation */}
      <Dialog open={showCreateSubscriptionModal} onOpenChange={setShowCreateSubscriptionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Creer une cotisation</DialogTitle>
            <DialogDescription>
              Enregistrez une nouvelle cotisation d'adherent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subscription-name">Nom Adherent *</Label>
                <Input
                  id="subscription-name"
                  value={subscriptionForm.memberName}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, memberName: e.target.value })}
                  placeholder="Ex: Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="subscription-email">Email *</Label>
                <Input
                  id="subscription-email"
                  type="email"
                  value={subscriptionForm.memberEmail}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, memberEmail: e.target.value })}
                  placeholder="Ex: jean@exemple.fr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subscription-type">Type de Cotisation *</Label>
                <Select value={subscriptionForm.subscriptionType} onValueChange={(val) => setSubscriptionForm({ ...subscriptionForm, subscriptionType: val as any })}>
                  <SelectTrigger id="subscription-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adherent">Adherent</SelectItem>
                    <SelectItem value="parrain">Parrain</SelectItem>
                    <SelectItem value="bienfaiteur">Bienfaiteur</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subscription-amount">Montant *</Label>
                <Input
                  id="subscription-amount"
                  type="number"
                  step="0.01"
                  value={subscriptionForm.amount}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subscription-duration">Duree *</Label>
                <Select value={subscriptionForm.durationType} onValueChange={(val) => setSubscriptionForm({ ...subscriptionForm, durationType: val as any })}>
                  <SelectTrigger id="subscription-duration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subscription-date">Date de Paiement *</Label>
                <Input
                  id="subscription-date"
                  type="date"
                  value={subscriptionForm.paymentDate}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, paymentDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="subscription-method">Mode de Paiement</Label>
              <Select value={subscriptionForm.paymentMethod} onValueChange={(val) => setSubscriptionForm({ ...subscriptionForm, paymentMethod: val })}>
                <SelectTrigger id="subscription-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Especes</SelectItem>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subscription-notes">Notes</Label>
              <Input
                id="subscription-notes"
                value={subscriptionForm.notes}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, notes: e.target.value })}
                placeholder="Notes supplementaires"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSubscriptionModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateSubscription} disabled={createSubscriptionMutation.isPending}>
              {createSubscriptionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal edition cotisation */}
      <Dialog open={showEditSubscriptionModal} onOpenChange={setShowEditSubscriptionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la cotisation</DialogTitle>
            <DialogDescription>
              Mettez a jour les details de la cotisation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-subscription-name">Nom Adherent *</Label>
                <Input
                  id="edit-subscription-name"
                  value={editSubscriptionForm.memberName}
                  onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, memberName: e.target.value })}
                  placeholder="Ex: Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="edit-subscription-email">Email *</Label>
                <Input
                  id="edit-subscription-email"
                  type="email"
                  value={editSubscriptionForm.memberEmail}
                  onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, memberEmail: e.target.value })}
                  placeholder="Ex: jean@exemple.fr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-subscription-type">Type de Cotisation *</Label>
                <Select value={editSubscriptionForm.subscriptionType} onValueChange={(val) => setEditSubscriptionForm({ ...editSubscriptionForm, subscriptionType: val as any })}>
                  <SelectTrigger id="edit-subscription-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adherent">Adherent</SelectItem>
                    <SelectItem value="parrain">Parrain</SelectItem>
                    <SelectItem value="bienfaiteur">Bienfaiteur</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-subscription-amount">Montant *</Label>
                <Input
                  id="edit-subscription-amount"
                  type="number"
                  step="0.01"
                  value={editSubscriptionForm.amount}
                  onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-subscription-duration">Duree *</Label>
                <Select value={editSubscriptionForm.durationType} onValueChange={(val) => setEditSubscriptionForm({ ...editSubscriptionForm, durationType: val as any })}>
                  <SelectTrigger id="edit-subscription-duration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-subscription-date">Date de Paiement *</Label>
                <Input
                  id="edit-subscription-date"
                  type="date"
                  value={editSubscriptionForm.paymentDate}
                  onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, paymentDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-subscription-method">Mode de Paiement</Label>
              <Select value={editSubscriptionForm.paymentMethod} onValueChange={(val) => setEditSubscriptionForm({ ...editSubscriptionForm, paymentMethod: val })}>
                <SelectTrigger id="edit-subscription-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Especes</SelectItem>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-subscription-notes">Notes</Label>
              <Input
                id="edit-subscription-notes"
                value={editSubscriptionForm.notes}
                onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, notes: e.target.value })}
                placeholder="Notes supplementaires"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditSubscriptionModal(false); setSelectedSubscription(null); resetEditSubscriptionForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleSaveEditSubscription} disabled={updateSubscriptionMutation.isPending}>
              {updateSubscriptionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression de cotisation */}
      <Dialog open={showDeleteSubscriptionConfirmDialog} onOpenChange={setShowDeleteSubscriptionConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la cotisation</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer cette cotisation ? Cette action ne peut pas etre annulee.
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="bg-muted p-3 rounded-md space-y-2">
              <p className="text-sm"><span className="font-medium">Adherent:</span> {selectedSubscription.memberName}</p>
              <p className="text-sm"><span className="font-medium">Type:</span> {getSubscriptionTypeLabel(selectedSubscription.subscriptionType)}</p>
              <p className="text-sm"><span className="font-medium">Montant:</span> {formatCurrency(selectedSubscription.amountInCents / 100)}</p>
              <p className="text-sm"><span className="font-medium">Status:</span> {getStatusLabel(selectedSubscription.status)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteSubscriptionConfirmDialog(false); setSelectedSubscription(null); }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteSubscription} disabled={deleteSubscriptionMutation.isPending}>
              {deleteSubscriptionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal création type de cotisation */}
      <Dialog open={showCreateTypeModal} onOpenChange={setShowCreateTypeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un Type de Cotisation</DialogTitle>
            <DialogDescription>
              Définissez un nouveau modèle de cotisation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type-name">Nom *</Label>
              <Input
                id="type-name"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="Ex: Adhérent Standard"
              />
            </div>
            <div>
              <Label htmlFor="type-description">Description</Label>
              <Input
                id="type-description"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                placeholder="Détails du type"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type-amount">Montant *</Label>
                <Input
                  id="type-amount"
                  type="number"
                  step="0.01"
                  value={typeForm.amount}
                  onChange={(e) => setTypeForm({ ...typeForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="type-duration">Durée *</Label>
                <Select value={typeForm.durationType} onValueChange={(val) => setTypeForm({ ...typeForm, durationType: val as any })}>
                  <SelectTrigger id="type-duration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="type-active"
                checked={typeForm.isActive}
                onChange={(e) => setTypeForm({ ...typeForm, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="type-active" className="cursor-pointer">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateTypeModal(false); resetTypeForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleCreateType} disabled={createTypeMutation.isPending}>
              {createTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal modification type de cotisation */}
      <Dialog open={showEditTypeModal} onOpenChange={setShowEditTypeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le Type de Cotisation</DialogTitle>
            <DialogDescription>
              Mettez à jour les détails du type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-type-name">Nom *</Label>
              <Input
                id="edit-type-name"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="Ex: Adhérent Standard"
              />
            </div>
            <div>
              <Label htmlFor="edit-type-description">Description</Label>
              <Input
                id="edit-type-description"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                placeholder="Détails du type"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type-amount">Montant *</Label>
                <Input
                  id="edit-type-amount"
                  type="number"
                  step="0.01"
                  value={typeForm.amount}
                  onChange={(e) => setTypeForm({ ...typeForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="edit-type-duration">Durée *</Label>
                <Select value={typeForm.durationType} onValueChange={(val) => setTypeForm({ ...typeForm, durationType: val as any })}>
                  <SelectTrigger id="edit-type-duration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-type-active"
                checked={typeForm.isActive}
                onChange={(e) => setTypeForm({ ...typeForm, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-type-active" className="cursor-pointer">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditTypeModal(false); setSelectedType(null); resetTypeForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleSaveEditType} disabled={updateTypeMutation.isPending}>
              {updateTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal suppression type de cotisation */}
      <Dialog open={showDeleteTypeConfirmDialog} onOpenChange={setShowDeleteTypeConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le Type</DialogTitle>
            <DialogDescription>
              Etes-vous sûr de vouloir supprimer ce type ? Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          {selectedType && (
            <div className="bg-muted p-3 rounded-md space-y-2">
              <p className="text-sm"><span className="font-medium">Nom:</span> {selectedType.name}</p>
              <p className="text-sm"><span className="font-medium">Montant:</span> {formatCurrency(selectedType.amountInCents / 100)}</p>
              <p className="text-sm"><span className="font-medium">Membres:</span> {selectedType._count?.subscriptions || 0}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteTypeConfirmDialog(false); setSelectedType(null); }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => selectedType && deleteTypeMutation.mutate(selectedType.id)} disabled={deleteTypeMutation.isPending}>
              {deleteTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal attribution cotisation */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attribuer une Cotisation</DialogTitle>
            <DialogDescription>
              Assignez une cotisation à un membre
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assign-type">Type de Cotisation *</Label>
              <Select value={assignForm.subscriptionTypeId} onValueChange={(val) => setAssignForm({ ...assignForm, subscriptionTypeId: val })}>
                <SelectTrigger id="assign-type"><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
                <SelectContent>
                  {activeTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} - {formatCurrency(type.amountInCents / 100)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assign-name">Nom du Membre *</Label>
              <Input
                id="assign-name"
                value={assignForm.memberName}
                onChange={(e) => setAssignForm({ ...assignForm, memberName: e.target.value })}
                placeholder="Ex: Jean Dupont"
              />
            </div>
            <div>
              <Label htmlFor="assign-email">Email *</Label>
              <Input
                id="assign-email"
                type="email"
                value={assignForm.memberEmail}
                onChange={(e) => setAssignForm({ ...assignForm, memberEmail: e.target.value })}
                placeholder="Ex: jean@exemple.fr"
              />
            </div>
            <div>
              <Label htmlFor="assign-date">Date de Début</Label>
              <Input
                id="assign-date"
                type="date"
                value={assignForm.startDate}
                onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="assign-method">Mode de Paiement</Label>
              <Select value={assignForm.paymentMethod} onValueChange={(val) => setAssignForm({ ...assignForm, paymentMethod: val })}>
                <SelectTrigger id="assign-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                  <SelectItem value="check">Chèque</SelectItem>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assign-notes">Notes</Label>
              <Input
                id="assign-notes"
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                placeholder="Notes supplémentaires"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAssignModal(false); resetAssignForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleAssign} disabled={assignSubscriptionMutation.isPending}>
              {assignSubscriptionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Attribuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

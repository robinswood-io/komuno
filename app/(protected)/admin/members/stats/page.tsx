'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys, type PaginatedResponse } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Loader2, TrendingUp, TrendingDown, Users, UserCheck, Target, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  status: 'active' | 'proposed';
  engagementScore?: number;
  phone?: string;
  role?: string;
  cjdRole?: string;
  notes?: string;
  proposedBy?: string;
  createdAt?: string;
  tags?: Array<{ id: string; name: string }>;
}

interface StatisticsData {
  totalMembers: number;
  totalActive: number;
  totalProspects: number;
  conversionRate: number;
  newMembersThisMonth: number;
  newMembersThisQuarter: number;
  monthlyGrowth: number;
  monthlyData: Array<{
    month: string;
    active: number;
    prospects: number;
  }>;
  tagStats: Array<{
    tagName: string;
    count: number;
  }>;
  topMembers: Array<{
    rank: number;
    firstName: string;
    lastName: string;
    email: string;
    engagementScore: number;
  }>;
}

/**
 * Calcule les statistiques à partir de tous les membres
 */
function calculateStatistics(members: Member[]): StatisticsData {
  const totalActive = members.filter(m => m.status === 'active').length;
  const totalProspects = members.filter(m => m.status === 'proposed').length;
  const totalMembers = totalActive + totalProspects;

  const conversionRate = totalMembers > 0 ? (totalActive / totalMembers) * 100 : 0;

  // Calculer les nouveaux membres ce mois et trimestre
  // TODO: Si l'API ne retourne pas createdAt, utiliser des données mockées
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const newMembersThisMonth = members.filter(m => {
    if (!m.createdAt) return false;
    const createdDate = new Date(m.createdAt);
    return createdDate >= thisMonthStart && createdDate <= now;
  }).length;

  const newMembersThisQuarter = members.filter(m => {
    if (!m.createdAt) return false;
    const createdDate = new Date(m.createdAt);
    return createdDate >= thisQuarterStart && createdDate <= now;
  }).length;

  const newMembersLastMonth = members.filter(m => {
    if (!m.createdAt) return false;
    const createdDate = new Date(m.createdAt);
    return createdDate >= lastMonthStart && createdDate < thisMonthStart;
  }).length;

  const monthlyGrowth = newMembersLastMonth > 0
    ? ((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100
    : (newMembersThisMonth > 0 ? 100 : 0);

  // Générer les données mensuelles (6 derniers mois)
  const monthlyData: Array<{
    month: string;
    active: number;
    prospects: number;
  }> = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const monthActiveCount = members.filter(m => {
      if (m.status !== 'active' || !m.createdAt) return false;
      const createdDate = new Date(m.createdAt);
      return createdDate >= monthStart && createdDate <= monthEnd;
    }).length;

    const monthProspectsCount = members.filter(m => {
      if (m.status !== 'proposed' || !m.createdAt) return false;
      const createdDate = new Date(m.createdAt);
      return createdDate >= monthStart && createdDate <= monthEnd;
    }).length;

    monthlyData.push({
      month: monthDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      active: monthActiveCount,
      prospects: monthProspectsCount,
    });
  }

  // Statistiques par tags
  const tagMap = new Map<string, number>();
  members.forEach(member => {
    if (member.tags && Array.isArray(member.tags)) {
      member.tags.forEach(tag => {
        tagMap.set(tag.name, (tagMap.get(tag.name) || 0) + 1);
      });
    }
  });

  const tagStats = Array.from(tagMap.entries())
    .map(([tagName, count]) => ({ tagName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top 10 membres par score d'engagement
  const topMembers = members
    .filter(m => m.status === 'active' && (m.engagementScore || 0) > 0)
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
    .slice(0, 10)
    .map((m, idx) => ({
      rank: idx + 1,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      engagementScore: m.engagementScore || 0,
    }));

  return {
    totalMembers,
    totalActive,
    totalProspects,
    conversionRate,
    newMembersThisMonth,
    newMembersThisQuarter,
    monthlyGrowth,
    monthlyData,
    tagStats,
    topMembers,
  };
}

/**
 * Dashboard de Statistiques et Analytics des Membres
 */
export default function MembersStatsPage() {
  // Récupérer tous les membres avec pagination maximale
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: queryKeys.members.list({ page: 1, limit: 10000 }),
    queryFn: () => api.get<PaginatedResponse<Member>>('/api/admin/members', {
      page: 1,
      limit: 10000,
    }),
  });

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (!membersData?.data) {
      return {
        totalMembers: 0,
        totalActive: 0,
        totalProspects: 0,
        conversionRate: 0,
        newMembersThisMonth: 0,
        newMembersThisQuarter: 0,
        monthlyGrowth: 0,
        monthlyData: [],
        tagStats: [],
        topMembers: [],
      };
    }
    return calculateStatistics(membersData.data);
  }, [membersData?.data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
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
            <CardDescription>Impossible de charger les statistiques des membres</CardDescription>
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
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistiques Membres</h1>
        <p className="text-muted-foreground">
          Analytics et tendances des membres de l'association
        </p>
      </div>

      {/* 1. KPIs en haut (4 cartes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total membres */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Membres</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalActive} actifs + {stats.totalProspects} prospects
            </p>
          </CardContent>
        </Card>

        {/* Membres actifs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalMembers > 0 ? ((stats.totalActive / stats.totalMembers) * 100).toFixed(1) : 0}% des membres
            </p>
          </CardContent>
        </Card>

        {/* Prospects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalProspects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalMembers > 0 ? ((stats.totalProspects / stats.totalMembers) * 100).toFixed(1) : 0}% des membres
            </p>
          </CardContent>
        </Card>

        {/* Taux de conversion */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Prospects → Actifs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Graphique d'évolution temporelle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LineChart - Évolution par mois */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution temporelle</CardTitle>
            <CardDescription>Membres actifs et prospects par mois (6 derniers mois)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="active"
                    stroke="#22c55e"
                    name="Actifs"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="prospects"
                    stroke="#f97316"
                    name="Prospects"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AreaChart - Cumul */}
        <Card>
          <CardHeader>
            <CardTitle>Cumul mensuel</CardTitle>
            <CardDescription>Visualisation en aire des évolutions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyData}>
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProspects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorActive)"
                    name="Actifs"
                  />
                  <Area
                    type="monotone"
                    dataKey="prospects"
                    stroke="#f97316"
                    fillOpacity={1}
                    fill="url(#colorProspects)"
                    name="Prospects"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Statistiques par tags */}
      <Card>
        <CardHeader>
          <CardTitle>Top Tags</CardTitle>
          <CardDescription>Top 5 tags les plus utilisés par nombre de membres</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.tagStats.length > 0 ? (
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.tagStats}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="tagName" type="category" width={140} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Nombre de membres" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Aucun tag trouvé
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Top membres par engagement */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Membres par Engagement</CardTitle>
          <CardDescription>Membres actifs avec les meilleurs scores d'engagement</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rang</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Score d'Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topMembers.map((member) => (
                  <TableRow key={member.email}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">#{member.rank}</Badge>
                    </TableCell>
                    <TableCell>
                      {member.firstName} {member.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${member.engagementScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium min-w-12 text-right">
                          {member.engagementScore}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Aucun membre avec score d'engagement trouvé
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Tendances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Nouveaux membres ce mois */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ce Mois</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newMembersThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nouveaux membres
            </p>
          </CardContent>
        </Card>

        {/* Nouveaux membres ce trimestre */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ce Trimestre</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newMembersThisQuarter}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nouveaux membres
            </p>
          </CardContent>
        </Card>

        {/* Évolution vs mois précédent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Évolution</CardTitle>
            {stats.monthlyGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.monthlyGrowth >= 0 ? 'text-success' : 'text-red-600'}`}>
              {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs mois précédent
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

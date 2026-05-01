// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboardPage from '@/app/(protected)/admin/page';

interface DashboardStats {
  members?: {
    total?: number;
    active?: number;
    proposed?: number;
    recentActivity?: number;
  };
  ideas?: {
    total?: number;
    pending?: number;
    approved?: number;
  };
  events?: {
    total?: number;
    upcoming?: number;
  };
  patrons?: {
    total?: number;
    active?: number;
    proposed?: number;
  };
}

interface AdminStatsResponse {
  data?: DashboardStats;
}

interface QueryState {
  data?: AdminStatsResponse;
  isLoading: boolean;
  error: Error | null;
}

interface QueryOptions {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
}

const mocks = vi.hoisted(() => ({
  statsQueryKey: ['admin', 'stats'] as const,
  getMock: vi.fn<(path: string) => Promise<unknown>>(),
  useQueryMock: vi.fn<(options: QueryOptions) => QueryState>(),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: mocks.getMock,
  },
  queryKeys: {
    admin: {
      stats: () => mocks.statsQueryKey,
    },
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: QueryOptions) => mocks.useQueryMock(options),
}));

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQueryMock.mockReturnValue({
      data: { data: {} },
      isLoading: false,
      error: null,
    });
  });

  it('affiche un loader pendant le chargement', () => {
    mocks.useQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(<AdminDashboardPage />);

    expect(screen.queryByText('Dashboard Admin')).toBeNull();
    expect(container.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('affiche une carte erreur si la requête échoue', () => {
    mocks.useQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Stats indisponibles'),
    });

    render(<AdminDashboardPage />);

    expect(screen.getByText('Erreur')).toBeTruthy();
    expect(screen.getByText('Impossible de charger les statistiques')).toBeTruthy();
    expect(screen.getByText('Stats indisponibles')).toBeTruthy();
  });

  it('affiche les statistiques et le résumé quand les données sont présentes', () => {
    mocks.useQueryMock.mockReturnValue({
      data: {
        data: {
          members: { total: 12, active: 8, proposed: 3, recentActivity: 5 },
          ideas: { total: 25, pending: 7, approved: 11 },
          events: { total: 9, upcoming: 4 },
          patrons: { total: 6, active: 4, proposed: 2 },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<AdminDashboardPage />);

    expect(screen.getByText('Dashboard Admin')).toBeTruthy();
    expect(screen.getByText((content) => content.includes("Vue d'ensemble de l'application"))).toBeTruthy();

    expect(screen.getByText('Membres Totaux')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('8 actifs')).toBeTruthy();

    expect(screen.getByText('Idées Proposées')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
    expect(screen.getByText('7 en attente')).toBeTruthy();

    expect(screen.getAllByText('Événements').length).toBeGreaterThan(0);
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getAllByText('4 à venir').length).toBeGreaterThan(0);

    expect(screen.getAllByText('Sponsors').length).toBeGreaterThan(0);
    expect(screen.getByText('6')).toBeTruthy();

    expect(screen.getByText('Résumé des statistiques')).toBeTruthy();
    expect(screen.getByText('3 proposés • 5 activités récentes')).toBeTruthy();
    expect(screen.getByText('11 approuvées')).toBeTruthy();
    expect(screen.getByText('2 proposés')).toBeTruthy();
  });

  it('utilise des valeurs par défaut à 0 quand les stats sont absentes', () => {
    mocks.useQueryMock.mockReturnValue({
      data: { data: {} },
      isLoading: false,
      error: null,
    });

    render(<AdminDashboardPage />);

    expect(screen.getByText('Dashboard Admin')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('0 proposés • 0 activités récentes')).toBeTruthy();
    expect(screen.getByText('0 approuvées')).toBeTruthy();
    expect(screen.getAllByText('0 à venir').length).toBeGreaterThan(0);
    expect(screen.getByText('0 proposés')).toBeTruthy();
  });

  it('passe la bonne clé de requête et un queryFn qui appelle la route stats', async () => {
    let capturedOptions: QueryOptions | null = null;
    mocks.getMock.mockResolvedValue({ data: {} });

    mocks.useQueryMock.mockImplementation((options) => {
      capturedOptions = options;
      return {
        data: { data: {} },
        isLoading: false,
        error: null,
      };
    });

    render(<AdminDashboardPage />);

    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions?.queryKey).toEqual(mocks.statsQueryKey);

    await capturedOptions?.queryFn();

    expect(mocks.getMock).toHaveBeenCalledWith('/api/admin/stats');
  });
});

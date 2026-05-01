// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminMembersPage from '@/app/(protected)/admin/members/page';
import type { ReactNode } from 'react';

interface TestMember {
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  proposedBy?: string;
  city?: string;
}

interface QueryResult {
  data?: unknown;
  isLoading?: boolean;
  error?: Error | null;
}

const toastMock = vi.fn();
const routerReplaceMock = vi.fn();

let editQueryParam: string | null = null;
let queryCallIndex = 0;
let queryPlan: QueryResult[] = [];

const resetQueryPlan = (plan: QueryResult[]) => {
  queryPlan = plan;
  queryCallIndex = 0;
};

const defaultPlan = (): QueryResult[] => [
  { data: { data: [] }, isLoading: false, error: null },
  { data: { data: [], total: 0, limit: 20, page: 1 }, isLoading: false, error: null },
  { data: { data: [] }, isLoading: false, error: null },
  { data: { data: [], total: 0, limit: 500, page: 1 }, isLoading: false, error: null },
  { data: [], isLoading: false, error: null },
];

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'edit' ? editQueryParam : null),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/(protected)/admin/members/add-member-dialog', () => ({
  AddMemberDialog: ({ open }: { open: boolean }): ReactNode =>
    open ? 'add-member-dialog-open' : null,
}));

vi.mock('@/app/(protected)/admin/members/member-details-sheet', () => ({
  MemberDetailsSheet: (): ReactNode => null,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
      refetchQueries: vi.fn(),
    }),
    useQuery: vi.fn(() => {
      const index = queryPlan.length > 0 ? queryCallIndex % queryPlan.length : 0;
      queryCallIndex += 1;
      const current = queryPlan[index] ?? { isLoading: false, error: null };
      return {
        data: current.data,
        isLoading: current.isLoading ?? false,
        error: current.error ?? null,
      };
    }),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
    })),
  };
});

describe('AdminMembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockReset();
    routerReplaceMock.mockReset();
    routerReplaceMock.mockImplementation(() => {
      editQueryParam = null;
    });
    editQueryParam = null;
    resetQueryPlan(defaultPlan());
  });

  it('renders loading state while members query is loading', () => {
    const plan = defaultPlan();
    plan[1] = { data: undefined, isLoading: true, error: null };
    resetQueryPlan(plan);

    const { container } = render(<AdminMembersPage />);

    expect(screen.queryByText('Liste des membres')).toBeNull();
    expect(container.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('renders error state when members query fails', () => {
    const plan = defaultPlan();
    plan[1] = { data: undefined, isLoading: false, error: new Error('Erreur de chargement test') };
    resetQueryPlan(plan);

    render(<AdminMembersPage />);

    expect(screen.getByText('Impossible de charger les membres')).toBeTruthy();
    expect(screen.getByText('Erreur de chargement test')).toBeTruthy();
  });

  it('renders members list and allows filtering by proposed status', () => {
    const members: TestMember[] = [
      {
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'active',
        city: 'Amiens',
      },
      {
        email: 'bob@example.com',
        firstName: 'Bob',
        lastName: 'Durand',
        status: 'proposed',
        proposedBy: 'Claire',
        city: 'Lille',
      },
    ];

    const plan = defaultPlan();
    plan[1] = {
      data: { data: members, total: 2, limit: 20, page: 1 },
      isLoading: false,
      error: null,
    };
    resetQueryPlan(plan);

    render(<AdminMembersPage />);

    expect(screen.getByText((content) => content.includes('2 membres'))).toBeTruthy();
    expect(screen.getByText('Alice Martin')).toBeTruthy();
    expect(screen.getByText('Bob Durand')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /proposé/i }));

    expect(screen.queryByText('Alice Martin')).toBeNull();
    expect(screen.getByText('Bob Durand')).toBeTruthy();
  });

  it('shows destructive toast when exporting with no members', () => {
    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: /exporter csv/i }));

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Aucun membre à exporter',
        variant: 'destructive',
      }),
    );
  });

  it('opens edit dialog from URL edit param and clears query param in router', async () => {
    const members: TestMember[] = [
      {
        email: 'charlie@example.com',
        firstName: 'Charlie',
        lastName: 'Bernard',
        status: 'active',
      },
    ];

    const plan = defaultPlan();
    plan[1] = {
      data: { data: members, total: 1, limit: 20, page: 1 },
      isLoading: false,
      error: null,
    };
    resetQueryPlan(plan);

    editQueryParam = 'charlie@example.com';

    render(<AdminMembersPage />);

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/admin/members');
    });

    expect(screen.getByText('Modifier le membre')).toBeTruthy();
    expect(screen.getByDisplayValue('charlie@example.com')).toBeTruthy();
  });
});

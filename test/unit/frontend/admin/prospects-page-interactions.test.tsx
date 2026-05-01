// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProspectsPage from '@/app/(protected)/admin/prospects/page';

type ProspectionStage =
  | 'Qualification'
  | 'R1'
  | 'R2'
  | 'Contractualisation'
  | 'Hors cible'
  | 'En réflexion'
  | 'Refusé'
  | 'Signé';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  role?: string;
  city?: string;
  department?: string;
  notes?: string;
  status: string;
  prospectionStatus?: ProspectionStage | null;
  firstContactDate?: string | null;
  appointmentDate?: string | null;
  soncasProfile?: string | null;
  assignedTo?: string | null;
}

interface AdministratorsResponse {
  success: boolean;
  data: Array<{ email: string; firstName?: string; lastName?: string }>;
}

interface ProspectsResponse {
  success: boolean;
  data: Member[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

type MutationVariables = { email: string; prospectionStatus: string };

type MutationOptions = {
  mutationFn: (variables: MutationVariables) => Promise<unknown>;
  onSuccess?: (data: unknown, variables: MutationVariables) => void;
  onError?: () => void;
};

type QueryOptions = {
  queryKey: unknown[];
};

const mocks = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
  toast: vi.fn<(opts: Record<string, unknown>) => void>(),
  invalidateQueries: vi.fn<(opts: { queryKey: string[] }) => void>(),
  patch: vi.fn<(url: string, body: Record<string, unknown>) => Promise<{ success: boolean }>>(),
  featureEnabled: true,
  prospectsLoading: false,
  mutationMode: 'success' as 'success' | 'error',
  members: [] as Member[],
  administrators: [] as Array<{ email: string; firstName?: string; lastName?: string }>,
  lastQueryMembersParams: undefined as Record<string, unknown> | undefined,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/contexts/FeatureConfigContext', () => ({
  useFeatureConfig: () => ({
    isFeatureEnabled: (_feature: string) => mocks.featureEnabled,
  }),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (url: string, params?: Record<string, unknown>): Promise<unknown> => {
      if (url === '/api/admin/administrators') {
        const response: AdministratorsResponse = {
          success: true,
          data: mocks.administrators,
        };
        return Promise.resolve(response);
      }

      if (url === '/api/admin/members') {
        mocks.lastQueryMembersParams = params;
        const response: ProspectsResponse = {
          success: true,
          data: mocks.members,
          pagination: { total: mocks.members.length, page: 1, limit: 500, totalPages: 1 },
        };
        return Promise.resolve(response);
      }

      return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
    },
    patch: (url: string, body: Record<string, unknown>) => mocks.patch(url, body),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries,
    }),
    useQuery: (options: QueryOptions) => {
      const firstKey = options.queryKey[0];
      if (firstKey === 'administrators') {
        return {
          data: { data: mocks.administrators },
          isLoading: false,
        };
      }

      return {
        data: { data: mocks.members },
        isLoading: mocks.prospectsLoading,
      };
    },
    useMutation: (options: MutationOptions) => ({
      mutate: (variables: MutationVariables) => {
        if (mocks.mutationMode === 'error') {
          options.onError?.();
          return;
        }

        void options
          .mutationFn(variables)
          .then((result) => {
            options.onSuccess?.(result, variables);
          })
          .catch(() => {
            options.onError?.();
          });
      },
    }),
  };
});

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    title,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type ?? 'button'} title={title} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    className,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} className={className} />, 
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

vi.mock('@/components/ui/select', async () => {
  const reactModule = await vi.importActual<typeof import('react')>('react');
  const SelectContext = reactModule.createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
  }>({});

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({
      children,
      onClick,
      className,
    }: {
      children: React.ReactNode;
      onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
      className?: string;
    }) => (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    ),
    SelectValue: () => {
      const ctx = reactModule.useContext(SelectContext);
      return <span>{ctx.value}</span>;
    },
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({
      value,
      children,
      className,
    }: {
      value: string;
      children: React.ReactNode;
      className?: string;
    }) => {
      const ctx = reactModule.useContext(SelectContext);
      return (
        <button type="button" className={className} onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
  };
});

vi.mock('@/app/(protected)/admin/members/add-member-dialog', () => ({
  AddMemberDialog: ({
    open,
    onOpenChange,
    defaultStatus,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultStatus: string;
  }) => (
    <div>
      <span data-testid="add-member-dialog-state">{open ? 'open' : 'closed'}</span>
      <span data-testid="add-member-default-status">{defaultStatus}</span>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-add-member-dialog
      </button>
    </div>
  ),
}));

function baseMembers(): Member[] {
  return [
    {
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
      company: 'Acme',
      phone: '0601020304',
      status: 'inactive',
      prospectionStatus: 'Qualification',
      firstContactDate: '2026-03-20T00:00:00.000Z',
      appointmentDate: '2026-03-25T00:00:00.000Z',
      notes: 'Premier contact positif',
      assignedTo: 'lead@example.com',
    },
    {
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Durand',
      status: 'inactive',
      prospectionStatus: 'Refusé',
    },
  ];
}

describe('ProspectsPage interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.featureEnabled = true;
    mocks.prospectsLoading = false;
    mocks.mutationMode = 'success';
    mocks.members = baseMembers();
    mocks.administrators = [
      { email: 'lead@example.com', firstName: 'Lead', lastName: 'Owner' },
    ];
    mocks.patch.mockResolvedValue({ success: true });
    mocks.lastQueryMembersParams = undefined;
  });

  it('renders kanban by default and allows navigation to members page', () => {
    render(<ProspectsPage />);

    expect(screen.getByText('Pipeline CRM')).toBeTruthy();
    expect(screen.getByText('Archivés')).toBeTruthy();
    expect(screen.getByText('Alice Martin')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /gérer les membres/i }));

    expect(mocks.push).toHaveBeenCalledWith('/admin/members');
  });

  it('opens then closes AddMemberDialog and invalidates prospects query on close', async () => {
    render(<ProspectsPage />);

    expect(screen.getByTestId('add-member-dialog-state').textContent).toBe('closed');
    expect(screen.getByTestId('add-member-default-status').textContent).toBe('Qualification');

    fireEvent.click(screen.getByRole('button', { name: /ajouter un prospect/i }));
    expect(screen.getByTestId('add-member-dialog-state').textContent).toBe('open');

    fireEvent.click(screen.getByRole('button', { name: /close-add-member-dialog/i }));

    await waitFor(() => {
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['prospects'] });
    });
  });

  it('switches to table view and shows filtered badge branch', () => {
    render(<ProspectsPage />);

    const tableToggleButton = screen.getByTitle('Vue tableau');
    fireEvent.click(tableToggleButton);

    expect(screen.getByText('Nom')).toBeTruthy();
    expect(screen.getByText('2 prospects')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Qualification' })[0]);
    expect(screen.getByText('Filtré: Qualification')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }));
    expect(screen.queryByText('Filtré: Qualification')).toBeNull();
  });

  it('calls mutation success branch and shows converted toast for Signé', async () => {
    render(<ProspectsPage />);

    const tableToggleButton = screen.getByTitle('Vue tableau');
    fireEvent.click(tableToggleButton);

    const firstProspectRow = screen.getAllByRole('row')[1];
    fireEvent.click(within(firstProspectRow).getAllByRole('button', { name: 'Signé' })[0]);

    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith(
        '/api/admin/members/alice%40example.com',
        { prospectionStatus: 'Signé' }
      );
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['prospects'] });
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['members'] });
      expect(mocks.toast).toHaveBeenCalledWith({
        title: '🎉 Prospect converti en membre !',
        description: 'Il apparaît désormais dans la liste des membres.',
      });
    });
  });

  it('calls mutation error branch and shows destructive toast', async () => {
    mocks.mutationMode = 'error';

    render(<ProspectsPage />);

    const tableToggleButton = screen.getByTitle('Vue tableau');
    fireEvent.click(tableToggleButton);

    const firstProspectRow = screen.getAllByRole('row')[1];
    fireEvent.click(within(firstProspectRow).getAllByRole('button', { name: 'R2' })[0]);

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la phase',
        variant: 'destructive',
      });
    });
  });
});

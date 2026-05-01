// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  prospectsLoading: false,
  mutationMode: 'success' as 'success' | 'error',
  members: [] as Member[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/contexts/FeatureConfigContext', () => ({
  useFeatureConfig: () => ({
    isFeatureEnabled: (_feature: string) => true,
  }),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (url: string): Promise<unknown> => {
      if (url === '/api/admin/administrators') {
        return Promise.resolve({ success: true, data: [] });
      }

      if (url === '/api/admin/members') {
        return Promise.resolve({
          success: true,
          data: mocks.members,
          pagination: { total: mocks.members.length, page: 1, limit: 500, totalPages: 1 },
        });
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
        return { data: { data: [] }, isLoading: false };
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
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <span data-testid="add-member-dialog-state">{open ? 'open' : 'closed'}</span>
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

function getKanbanColumns(container: HTMLElement): HTMLDivElement[] {
  return Array.from(container.querySelectorAll('div.flex-shrink-0.w-72'))
    .filter((node): node is HTMLDivElement => node instanceof HTMLDivElement);
}

describe('ProspectsPage iteration 5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prospectsLoading = false;
    mocks.mutationMode = 'success';
    mocks.members = baseMembers();
    mocks.patch.mockResolvedValue({ success: true });
  });

  it('shows kanban loading state branch when prospects are loading', () => {
    mocks.prospectsLoading = true;

    const { container } = render(<ProspectsPage />);

    expect(screen.queryByText('Archivés')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows table empty message for global and filtered empty branches', () => {
    mocks.members = [];

    render(<ProspectsPage />);
    fireEvent.click(screen.getByTitle('Vue tableau'));

    expect(screen.getByText('Aucun prospect trouvé')).toBeTruthy();
    expect(screen.getByText('Ajoutez des prospects depuis la page Membres')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Qualification' }));

    expect(screen.getByText('Aucun prospect avec ce statut')).toBeTruthy();
  });

  it('shows empty archived column message when no archived prospects', () => {
    mocks.members = [
      {
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'inactive',
        prospectionStatus: 'Qualification',
      },
    ];

    render(<ProspectsPage />);

    expect(screen.getByText('Aucun prospect archivé')).toBeTruthy();
  });

  it('prevents navigation while dragging and does not patch when dropped on same column', () => {
    const { container } = render(<ProspectsPage />);

    const card = screen.getByText('Alice Martin').closest('div[draggable="true"]');
    expect(card).toBeTruthy();
    if (!card) {
      throw new Error('Draggable card not found');
    }

    const dragData = {
      dropEffect: 'move',
      effectAllowed: 'move',
      files: [] as File[],
      items: [] as DataTransferItem[],
      types: [] as string[],
      clearData: vi.fn(),
      getData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(card, { dataTransfer: dragData });
    fireEvent.click(card);

    const columns = getKanbanColumns(container);
    expect(columns.length).toBeGreaterThan(0);
    fireEvent.drop(columns[0], { dataTransfer: dragData });

    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it('updates status through drag and drop to next column and triggers default success toast', async () => {
    const { container } = render(<ProspectsPage />);

    const card = screen.getByText('Alice Martin').closest('div[draggable="true"]');
    expect(card).toBeTruthy();
    if (!card) {
      throw new Error('Draggable card not found');
    }

    const dragData = {
      dropEffect: 'move',
      effectAllowed: 'move',
      files: [] as File[],
      items: [] as DataTransferItem[],
      types: [] as string[],
      clearData: vi.fn(),
      getData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(card, { dataTransfer: dragData });

    const columns = getKanbanColumns(container);
    expect(columns.length).toBeGreaterThan(1);
    fireEvent.drop(columns[1], { dataTransfer: dragData });

    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith(
        '/api/admin/members/alice%40example.com',
        { prospectionStatus: 'R1' }
      );
      expect(mocks.toast).toHaveBeenCalledWith({ title: 'Phase mise à jour' });
    });
  });

  it('toggles active stage filter back to all when clicking the same stage twice', () => {
    render(<ProspectsPage />);

    fireEvent.click(screen.getByTitle('Vue tableau'));

    const qualificationLabel = screen.getAllByText('Qualification')[0];
    const firstQualificationTile = qualificationLabel.closest('button');
    expect(firstQualificationTile).toBeTruthy();
    if (!firstQualificationTile) {
      throw new Error('Qualification summary tile not found');
    }

    fireEvent.click(firstQualificationTile);
    expect(screen.getByText('Filtré: Qualification')).toBeTruthy();

    const qualificationLabelActive = screen.getAllByText('Qualification')[0];
    const activeQualificationTile = qualificationLabelActive.closest('button');
    expect(activeQualificationTile).toBeTruthy();
    if (!activeQualificationTile) {
      throw new Error('Active qualification summary tile not found');
    }
    fireEvent.click(activeQualificationTile);
    expect(screen.queryByText('Filtré: Qualification')).toBeNull();
  });

  it('handles dragOver/dragLeave/drop with no dragging email and keeps state stable', () => {
    const { container } = render(<ProspectsPage />);

    const columns = getKanbanColumns(container);
    expect(columns.length).toBeGreaterThan(0);

    const firstColumn = columns[0];
    const innerTarget = document.createElement('div');
    firstColumn.appendChild(innerTarget);

    fireEvent.dragOver(firstColumn, {
      dataTransfer: {
        dropEffect: 'none',
      },
    });
    expect(firstColumn.className).toContain('ring-2');

    const leaveInsideEvent = createEvent.dragLeave(firstColumn);
    Object.defineProperty(leaveInsideEvent, 'relatedTarget', { value: innerTarget });
    fireEvent(firstColumn, leaveInsideEvent);
    expect(firstColumn.className).toContain('ring-2');

    fireEvent.dragLeave(firstColumn, { relatedTarget: document.body });
    expect(firstColumn.className).not.toContain('ring-2');

    fireEvent.drop(firstColumn);
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it('navigates from cards and table name buttons but not from status trigger clicks', async () => {
    render(<ProspectsPage />);

    const activeCard = screen.getByText('Alice Martin').closest('div[draggable="true"]');
    expect(activeCard).toBeTruthy();
    if (!activeCard) {
      throw new Error('Active prospect card not found');
    }

    fireEvent.click(activeCard);
    expect(mocks.push).toHaveBeenCalledWith('/admin/members/alice%40example.com');

    fireEvent.click(within(activeCard).getAllByRole('button', { name: 'Qualification' })[0]);
    expect(mocks.push).toHaveBeenCalledTimes(1);

    const archivedCard = screen.getByText('Bob Durand').closest('div.cursor-pointer');
    expect(archivedCard).toBeTruthy();
    if (!archivedCard) {
      throw new Error('Archived prospect card not found');
    }

    fireEvent.click(archivedCard);
    expect(mocks.push).toHaveBeenCalledWith('/admin/members/bob%40example.com');
    const pushCallsAfterArchivedClick = mocks.push.mock.calls.length;

    fireEvent.click(within(archivedCard).getAllByRole('button', { name: 'Refusé' })[0]);
    expect(mocks.push).toHaveBeenCalledTimes(pushCallsAfterArchivedClick);
    fireEvent.click(within(archivedCard).getAllByRole('button', { name: 'R1' })[0]);

    fireEvent.click(screen.getByTitle('Vue tableau'));
    fireEvent.click(screen.getByRole('button', { name: 'Alice Martin' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/members/alice%40example.com');

    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith(
        '/api/admin/members/bob%40example.com',
        { prospectionStatus: 'R1' },
      );
    });
  });

  it('renders table fallback cells for null status and missing dates with singular counter', () => {
    mocks.members = [
      {
        email: 'solo@example.com',
        firstName: 'Solo',
        lastName: 'User',
        status: 'inactive',
        prospectionStatus: null,
        role: 'Consultant',
        city: 'Amiens',
      },
    ];

    render(<ProspectsPage />);
    fireEvent.click(screen.getByTitle('Vue tableau'));

    expect(screen.getByText('1 prospect')).toBeTruthy();
    expect(screen.getByText('Amiens')).toBeTruthy();
    expect(screen.getByText('Consultant')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });
});

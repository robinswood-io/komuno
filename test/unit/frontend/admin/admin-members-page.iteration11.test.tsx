// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import AdminMembersPage from '@/app/(protected)/admin/members/page';
import { api } from '@/lib/api/client';

interface TestMember {
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  prospectionStatus?: string | null;
}

interface MemberTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  _count?: { assignments: number };
}

interface TestSubscriptionType {
  id: string;
  name: string;
  amountInCents: number;
  durationType: string;
}

interface MutationOptions {
  mutationFn: (variables: unknown) => Promise<unknown>;
  onSuccess?: (data: unknown, variables: unknown) => void | Promise<void>;
  onError?: (error: Error) => void;
}

interface QueryOptionsLike {
  queryKey: readonly unknown[];
  enabled?: boolean;
}

const toastMock = vi.hoisted(() => vi.fn());
const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const refetchQueriesMock = vi.hoisted(() => vi.fn());

const queryState = vi.hoisted(() => ({
  members: [] as TestMember[],
  membersTotal: 0,
  membersLoading: false,
  membersError: null as Error | null,
  tags: [] as MemberTag[],
  tagsLoading: false,
  subscriptionTypes: [] as TestSubscriptionType[],
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
  }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => <tr onClick={onClick}>{children}</tr>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableCell: ({
    children,
    onClick,
    colSpan,
  }: {
    children: ReactNode;
    onClick?: (event: React.MouseEvent<HTMLTableCellElement>) => void;
    colSpan?: number;
  }) => (
    <td onClick={onClick} colSpan={colSpan}>
      {children}
    </td>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span data-testid="member-status-badge">{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    id,
    type,
    disabled,
    maxLength,
    pattern,
    name,
    className,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
    type?: string;
    disabled?: boolean;
    maxLength?: number;
    pattern?: string;
    name?: string;
    className?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      type={type}
      disabled={disabled}
      maxLength={maxLength}
      pattern={pattern}
      name={name}
      className={className}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (value: boolean | 'indeterminate') => void;
    'aria-label'?: string;
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open?: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: { open?: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
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
      children: ReactNode;
    }) => <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>,
    SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => {
      const ctx = reactModule.useContext(SelectContext);
      return <span>{ctx.value ?? placeholder ?? ''}</span>;
    },
    SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => {
      const ctx = reactModule.useContext(SelectContext);
      return (
        <button type="button" onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
  };
});

vi.mock('@/app/(protected)/admin/members/add-member-dialog', () => ({
  AddMemberDialog: ({ open }: { open: boolean }): ReactNode => (open ? <div>add-member-dialog-open</div> : null),
}));

vi.mock('@/app/(protected)/admin/members/member-details-sheet', () => ({
  MemberDetailsSheet: () => null,
}));

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <svg data-testid="icon" className={className} />;
  return {
    Loader2: Icon,
    Plus: Icon,
    Pencil: Icon,
    Trash2: Icon,
    Search: Icon,
    UserCheck: Icon,
    UserPlus: Icon,
    Eye: Icon,
    Download: Icon,
    BarChart3: Icon,
    Tag: Icon,
    List: Icon,
    LayoutGrid: Icon,
    UserSearch: Icon,
  };
});

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn(actual.api.get),
      post: vi.fn(actual.api.post),
      patch: vi.fn(actual.api.patch),
      delete: vi.fn(actual.api.delete),
    },
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
      refetchQueries: refetchQueriesMock,
    }),
    useQuery: vi.fn((options: QueryOptionsLike) => {
      const key = options.queryKey;

      if (key[0] === 'members' && key[1] === 'list') {
        return {
          data: {
            data: queryState.members,
            total: queryState.membersTotal,
            limit: 20,
            page: 1,
          },
          isLoading: queryState.membersLoading,
          error: queryState.membersError,
        };
      }

      if (key[0] === 'administrators') {
        return { data: { data: [] }, isLoading: false, error: null };
      }

      if (key[0] === 'subscription-types') {
        return { data: { data: queryState.subscriptionTypes }, isLoading: false, error: null };
      }

      if (key[0] === 'members' && key[1] === 'tags') {
        if (options.enabled === false) {
          return { data: [], isLoading: false, error: null };
        }
        return { data: queryState.tags, isLoading: queryState.tagsLoading, error: null };
      }

      return { data: undefined, isLoading: false, error: null };
    }),
    useMutation: vi.fn((options: MutationOptions) => ({
      mutate: (variables: unknown) => {
        void options
          .mutationFn(variables)
          .then((data) => options.onSuccess?.(data, variables))
          .catch((error: unknown) => {
            const normalized = error instanceof Error ? error : new Error('mutation failed');
            options.onError?.(normalized);
          });
      },
      isPending: false,
    })),
  };
});

describe('AdminMembersPage iteration11 coverage - remaining branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    queryState.members = [];
    queryState.membersTotal = 0;
    queryState.membersLoading = false;
    queryState.membersError = null;
    queryState.tags = [];
    queryState.tagsLoading = false;
    queryState.subscriptionTypes = [];

    vi.mocked(api.patch).mockResolvedValue({ success: true } as never);
    vi.mocked(api.post).mockResolvedValue({ success: true } as never);
    vi.mocked(api.get).mockResolvedValue({ success: true } as never);
    vi.mocked(api.delete).mockResolvedValue({ success: true } as never);
  });

  it('couvre la suppression de tag confirmée (handleDeleteTag mutate)', async () => {
    queryState.tags = [
      {
        id: 'tag-delete-11',
        name: 'Prioritaire',
        color: '#ef4444',
        createdAt: '2026-01-01T00:00:00.000Z',
        _count: { assignments: 1 },
      },
    ];

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Gérer les tags' }));

    const tagRow = screen.getByText('Prioritaire').closest('tr');
    expect(tagRow).toBeTruthy();
    const rowButtons = within(tagRow as HTMLElement).getAllByRole('button');
    fireEvent.click(rowButtons[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/admin/tags/tag-delete-11');
    });
  });

  it('couvre getUnifiedStatus fallback vide quand statut inconnu sans prospectionStatus', () => {
    queryState.members = [
      {
        email: 'unknown-status@example.com',
        firstName: 'Myst',
        lastName: 'Ery',
        status: 'other',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    const row = screen.getByText('unknown-status@example.com').closest('tr');
    expect(row).toBeTruthy();
    const badges = within(row as HTMLElement).getAllByTestId('member-status-badge');
    expect(badges[0].textContent ?? '').toBe('');
  });

  it('couvre le retour anticipé bulk subscription si type absent', async () => {
    queryState.members = [
      { email: 'no-type@example.com', firstName: 'No', lastName: 'Type', status: 'active' },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner No Type'));
    fireEvent.click(screen.getByRole('button', { name: 'Cotisation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assigner la cotisation' }));

    expect(api.post).not.toHaveBeenCalledWith(
      '/api/admin/members/bulk-subscription',
      expect.anything(),
    );
  });

  it('améliore les branches adjacentes via succès bulk subscription', async () => {
    queryState.members = [
      { email: 'bulk-success@example.com', firstName: 'Bulk', lastName: 'Success', status: 'active' },
    ];
    queryState.membersTotal = 1;
    queryState.subscriptionTypes = [
      { id: 'sub-month-11', name: 'Mensuel', amountInCents: 1000, durationType: 'monthly' },
    ];

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Bulk Success'));
    fireEvent.click(screen.getByRole('button', { name: 'Cotisation' }));
    fireEvent.click(screen.getByText('Mensuel — 10 €/mois'));
    fireEvent.click(screen.getByRole('button', { name: 'Assigner la cotisation' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/members/bulk-subscription', {
        emails: ['bulk-success@example.com'],
        subscriptionTypeId: 'sub-month-11',
        startDate: expect.any(String),
        paymentMethod: undefined,
      });
    });

    expect(invalidateQueriesMock).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cotisations assignées',
      }),
    );
  });
});


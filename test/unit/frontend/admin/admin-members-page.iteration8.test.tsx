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
  prospectionStatus?:
    | 'Qualification'
    | 'R1'
    | 'R2'
    | 'Contractualisation'
    | 'Hors cible'
    | 'En réflexion'
    | 'Refusé'
    | 'Signé'
    | null
    | string;
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

const mutationState = vi.hoisted(() => ({
  updatePending: false,
  deletePending: false,
  convertPending: false,
  createTagPending: false,
  updateTagPending: false,
  deleteTagPending: false,
  index: 0,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
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
  TableRow: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <tr onClick={onClick} className={className}>
      {children}
    </tr>
  ),
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableCell: ({
    children,
    onClick,
    colSpan,
    className,
    title,
  }: {
    children: ReactNode;
    onClick?: (event: React.MouseEvent<HTMLTableCellElement>) => void;
    colSpan?: number;
    className?: string;
    title?: string;
  }) => (
    <td onClick={onClick} colSpan={colSpan} className={className} title={title}>
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
    className,
    disabled,
    maxLength,
    pattern,
    name,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
    type?: string;
    className?: string;
    disabled?: boolean;
    maxLength?: number;
    pattern?: string;
    name?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      type={type}
      className={className}
      disabled={disabled}
      maxLength={maxLength}
      pattern={pattern}
      name={name}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
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
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: { open?: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
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
    SelectTrigger: ({ children, className }: { children: ReactNode; className?: string }) => (
      <button type="button" className={className}>
        {children}
      </button>
    ),
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

      if (key[0] === 'subscription-types') {
        return { data: { data: queryState.subscriptionTypes }, isLoading: false, error: null };
      }

      if (key[0] === 'members' && key[1] === 'tags') {
        if (options.enabled === false) {
          return { data: [], isLoading: false, error: null };
        }
        return { data: queryState.tags, isLoading: queryState.tagsLoading, error: null };
      }

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

      return { data: undefined, isLoading: false, error: null };
    }),
    useMutation: vi.fn((options: MutationOptions) => {
      const idx = mutationState.index % 6;
      mutationState.index += 1;
      const pendingMap = [
        mutationState.updatePending,
        mutationState.deletePending,
        mutationState.convertPending,
        mutationState.createTagPending,
        mutationState.updateTagPending,
        mutationState.deleteTagPending,
      ];
      const isPending = pendingMap[idx] ?? false;

      return {
        mutate: (variables: unknown) => {
          void options
            .mutationFn(variables)
            .then((data) => options.onSuccess?.(data, variables))
            .catch((error: unknown) => {
              const normalized = error instanceof Error ? error : new Error('mutation failed');
              options.onError?.(normalized);
            });
        },
        isPending,
      };
    }),
  };
});

describe('AdminMembersPage iteration8 coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    queryState.members = [];
    queryState.membersTotal = 0;
    queryState.membersLoading = false;
    queryState.membersError = null;
    queryState.tags = [];
    queryState.tagsLoading = false;
    queryState.subscriptionTypes = [];

    mutationState.updatePending = false;
    mutationState.deletePending = false;
    mutationState.convertPending = false;
    mutationState.createTagPending = false;
    mutationState.updateTagPending = false;
    mutationState.deleteTagPending = false;
    mutationState.index = 0;

    vi.mocked(api.patch).mockResolvedValue({ success: true } as never);
    vi.mocked(api.post).mockResolvedValue({ success: true } as never);
    vi.mocked(api.get).mockResolvedValue({ success: true } as never);
    vi.mocked(api.delete).mockResolvedValue({ success: true } as never);
  });

  it('couvre plusieurs labels de badge de statut (inactive, R2, default)', () => {
    queryState.members = [
      { email: 'inactive@example.com', firstName: 'Ina', lastName: 'Ctive', status: 'inactive' },
      { email: 'r2@example.com', firstName: 'Pipe', lastName: 'R2', status: 'other', prospectionStatus: 'R2' },
      { email: 'custom@example.com', firstName: 'Cus', lastName: 'Tom', status: 'other', prospectionStatus: 'CUSTOM' },
    ];
    queryState.membersTotal = 3;

    render(<AdminMembersPage />);

    const badges = screen.getAllByTestId('member-status-badge');
    const labels = badges.map((badge) => badge.textContent?.trim() ?? '');

    expect(labels).toContain('Inactif');
    expect(labels).toContain('R2');
    expect(labels).toContain('CUSTOM');
  });

  it('couvre les statuts prospection restants du switch (Qualification -> Signé)', () => {
    queryState.members = [
      { email: 'qualif@example.com', firstName: 'Q', lastName: 'One', status: 'other', prospectionStatus: 'Qualification' },
      { email: 'r1@example.com', firstName: 'R', lastName: 'One', status: 'other', prospectionStatus: 'R1' },
      { email: 'contract@example.com', firstName: 'C', lastName: 'One', status: 'other', prospectionStatus: 'Contractualisation' },
      { email: 'hors-cible@example.com', firstName: 'H', lastName: 'One', status: 'other', prospectionStatus: 'Hors cible' },
      { email: 'reflexion@example.com', firstName: 'E', lastName: 'One', status: 'other', prospectionStatus: 'En réflexion' },
      { email: 'refuse@example.com', firstName: 'R', lastName: 'Two', status: 'other', prospectionStatus: 'Refusé' },
      { email: 'signe@example.com', firstName: 'S', lastName: 'One', status: 'other', prospectionStatus: 'Signé' },
    ];
    queryState.membersTotal = queryState.members.length;

    render(<AdminMembersPage />);

    const labels = screen
      .getAllByTestId('member-status-badge')
      .map((badge) => badge.textContent?.trim() ?? '');

    expect(labels).toContain('Qualification');
    expect(labels).toContain('R1');
    expect(labels).toContain('Contractualisation');
    expect(labels).toContain('Hors cible');
    expect(labels).toContain('En réflexion');
    expect(labels).toContain('Refusé');
    expect(labels).toContain('Signé');
  });

  it('affiche un toast d’erreur quand l’assignation de cotisation en masse échoue', async () => {
    queryState.members = [
      { email: 'bulk.sub.error@example.com', firstName: 'Bulk', lastName: 'SubError', status: 'active' },
    ];
    queryState.membersTotal = 1;
    queryState.subscriptionTypes = [
      { id: 'sub-month', name: 'Mensuel', amountInCents: 1000, durationType: 'monthly' },
    ];
    vi.mocked(api.post).mockRejectedValueOnce(new Error('assign failed') as never);

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Bulk SubError'));
    fireEvent.click(screen.getByRole('button', { name: 'Cotisation' }));
    fireEvent.click(screen.getByText('Mensuel — 10 €/mois'));
    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assigner la cotisation' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erreur',
          description: 'assign failed',
          variant: 'destructive',
        }),
      );
    });
  });

  it('affiche l’état pending de création tag dans le bouton du formulaire', async () => {
    mutationState.createTagPending = true;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Gérer les tags' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer un tag' }));

    expect(screen.getByText('Traitement en cours...')).toBeTruthy();
  });

  it('affiche l’alerte suppression tag avec pluriel et état pending', async () => {
    queryState.tags = [
      {
        id: 'tag-pending-delete',
        name: 'Partenaires',
        color: '#ef4444',
        createdAt: '2026-01-01T00:00:00.000Z',
        _count: { assignments: 2 },
      },
    ];
    mutationState.deleteTagPending = true;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Gérer les tags' }));
    const tagRow = screen.getByText('Partenaires').closest('tr');
    expect(tagRow).toBeTruthy();
    const buttons = within(tagRow as HTMLElement).getAllByRole('button');
    fireEvent.click(buttons[1]);

    const deleteTitle = screen.getByText('Supprimer le tag ?');
    expect(deleteTitle).toBeTruthy();
    const warning = document.querySelector('.text-amber-600');
    expect(warning?.textContent?.includes('membres.')).toBe(true);
    expect(screen.getByText('Suppression...')).toBeTruthy();
  });
});

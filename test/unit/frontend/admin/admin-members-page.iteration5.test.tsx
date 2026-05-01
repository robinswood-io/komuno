// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import AdminMembersPage from '@/app/(protected)/admin/members/page';
import { api } from '@/lib/api/client';

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

interface TestAdmin {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface TestSubscriptionType {
  id: string;
  name: string;
  amountInCents: number;
  durationType: string;
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

const makePlan = (params?: {
  members?: TestMember[];
  total?: number;
  admins?: TestAdmin[];
  subscriptionTypes?: TestSubscriptionType[];
}): QueryResult[] => {
  const members = params?.members ?? [];
  const total = params?.total ?? members.length;
  const admins = params?.admins ?? [];
  const subscriptionTypes = params?.subscriptionTypes ?? [];

  return [
    { data: { data: admins }, isLoading: false, error: null },
    { data: { data: members, total, limit: 20, page: 1 }, isLoading: false, error: null },
    { data: { data: subscriptionTypes }, isLoading: false, error: null },
    { data: { data: members, total, limit: 500, page: 1 }, isLoading: false, error: null },
    { data: [], isLoading: false, error: null },
  ];
};

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

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
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    id,
    type,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
    type?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} id={id} type={type} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
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
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
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
  AddMemberDialog: (): ReactNode => null,
}));

vi.mock('@/app/(protected)/admin/members/member-details-sheet', () => ({
  MemberDetailsSheet: (): ReactNode => null,
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

describe('AdminMembersPage iteration5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockReset();
    routerReplaceMock.mockReset();
    editQueryParam = null;
    queryCallIndex = 0;

    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('open', vi.fn());
    vi.stubGlobal('fetch', vi.fn());

    const createObjectUrlMock = vi.fn(() => 'blob:mocked-url');
    vi.stubGlobal('URL', { ...URL, createObjectURL: createObjectUrlMock });

    resetQueryPlan(makePlan());

    vi.mocked(api.patch).mockResolvedValue({ success: true } as never);
    vi.mocked(api.post).mockResolvedValue({ success: true } as never);
    vi.mocked(api.get).mockResolvedValue({ success: true } as never);
    vi.mocked(api.delete).mockResolvedValue({ success: true } as never);
  });

  it('couvre la pagination suivante/précédente et le reset de page sur filtre département', () => {
    const members: TestMember[] = [
      { email: 'a@example.com', firstName: 'Alice', lastName: 'Martin', status: 'active' },
      { email: 'b@example.com', firstName: 'Bob', lastName: 'Durand', status: 'inactive' },
    ];

    resetQueryPlan(
      makePlan({
        members,
        total: 60,
      }),
    );

    render(<AdminMembersPage />);

    expect(screen.getByText('Page 1 sur 3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Page 2 sur 3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Page 3 sur 3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(screen.getByText('Page 2 sur 3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Somme (80)' }));
    expect(screen.getByText('Page 1 sur 3')).toBeTruthy();
  });

  it('couvre le toggle de filtre statut actif avec retour automatique sur all', () => {
    const members: TestMember[] = [
      { email: 'active@example.com', firstName: 'Alice', lastName: 'Active', status: 'active' },
      { email: 'inactive@example.com', firstName: 'Bob', lastName: 'Inactive', status: 'inactive' },
    ];

    resetQueryPlan(makePlan({ members, total: 2 }));

    render(<AdminMembersPage />);

    expect(screen.getByText('Alice Active')).toBeTruthy();
    expect(screen.getByText('Bob Inactive')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Actif$/i }));

    expect(screen.getByText('Alice Active')).toBeTruthy();
    expect(screen.queryByText('Bob Inactive')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Actif$/i }));

    expect(screen.getByText('Alice Active')).toBeTruthy();
    expect(screen.getByText('Bob Inactive')).toBeTruthy();
  });

  it('couvre le reset de page sur filtre responsable', () => {
    const members: TestMember[] = [
      { email: 'x@example.com', firstName: 'Xavier', lastName: 'Test', status: 'active' },
    ];
    const admins: TestAdmin[] = [
      { email: 'admin@example.com', firstName: 'Admin', lastName: 'One' },
    ];

    resetQueryPlan(
      makePlan({
        members,
        total: 40,
        admins,
      }),
    );

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Page 2 sur 2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Admin One' }));
    expect(screen.getByText('Page 1 sur 2')).toBeTruthy();
  });

  it('couvre les actions bulk export et suppression confirmée', async () => {
    const members: TestMember[] = [
      { email: 'bulk@example.com', firstName: 'Bulk', lastName: 'User', status: 'active' },
    ];

    resetQueryPlan(makePlan({ members, total: 1 }));

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Bulk User'));

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Export CSV réussi',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer 1 membre(s)' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/members/bulk-delete', {
        emails: ['bulk@example.com'],
      });
    });
  });

  it('couvre l’action bulk subscription avec type requis', async () => {
    const members: TestMember[] = [
      { email: 'sub@example.com', firstName: 'Sub', lastName: 'Member', status: 'active' },
    ];
    const subscriptionTypes: TestSubscriptionType[] = [
      { id: 'st-1', name: 'Standard', amountInCents: 10000, durationType: 'monthly' },
    ];

    resetQueryPlan(
      makePlan({
        members,
        total: 1,
        subscriptionTypes,
      }),
    );

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Sub Member'));
    fireEvent.click(screen.getByRole('button', { name: 'Cotisation' }));

    fireEvent.click(screen.getByRole('button', { name: /Standard/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Assigner la cotisation' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/members/bulk-subscription', {
        emails: ['sub@example.com'],
        subscriptionTypeId: 'st-1',
        startDate: expect.any(String),
        paymentMethod: undefined,
      });
    });
  });
});

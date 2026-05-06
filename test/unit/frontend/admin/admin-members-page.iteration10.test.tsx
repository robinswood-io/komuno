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
  Button: ({ children, onClick, disabled, type }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' | 'reset' }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled}>
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
  TableCell: ({ children, onClick, colSpan }: { children: ReactNode; onClick?: (event: React.MouseEvent<HTMLTableCellElement>) => void; colSpan?: number }) => (
    <td onClick={onClick} colSpan={colSpan}>{children}</td>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id, type, disabled, maxLength, pattern, name }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
    type?: string;
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
      disabled={disabled}
      maxLength={maxLength}
      pattern={pattern}
      name={name}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, 'aria-label': ariaLabel }: { checked?: boolean | 'indeterminate'; onCheckedChange?: (value: boolean | 'indeterminate') => void; 'aria-label'?: string }) => (
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
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => <button type="button" onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock('@/components/ui/select', async () => {
  const reactModule = await vi.importActual<typeof import('react')>('react');
  const SelectContext = reactModule.createContext<{ value?: string; onValueChange?: (value: string) => void; }>({});

  return {
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: ReactNode }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => {
      const ctx = reactModule.useContext(SelectContext);
      return <span>{ctx.value ?? placeholder ?? ''}</span>;
    },
    SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => {
      const ctx = reactModule.useContext(SelectContext);
      return <button type="button" onClick={() => ctx.onValueChange?.(value)}>{children}</button>;
    },
  };
});

vi.mock('@/app/(protected)/admin/members/add-member-dialog', () => ({
  AddMemberDialog: ({ open }: { open: boolean }): ReactNode => (open ? <div>add-member-dialog-open</div> : null),
}));

vi.mock('@/app/(protected)/admin/members/member-details-sheet', () => ({
  MemberDetailsSheet: ({ open, email, onConvertToActive }: {
    open: boolean;
    email: string | null;
    onConvertToActive: (value: string) => void;
  }): ReactNode => {
    if (!open || !email) return null;
    return (
      <button type="button" onClick={() => onConvertToActive(email)}>
        sheet-convert
      </button>
    );
  },
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
        return { data: { data: [] }, isLoading: false, error: null };
      }

      if (key[0] === 'members' && key[1] === 'tags') {
        return { data: [], isLoading: false, error: null };
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

describe('AdminMembersPage iteration10 - select all + status error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    queryState.members = [];
    queryState.membersTotal = 0;
    queryState.membersLoading = false;
    queryState.membersError = null;

    vi.mocked(api.patch).mockResolvedValue({ success: true } as never);
    vi.mocked(api.post).mockResolvedValue({ success: true } as never);
    vi.mocked(api.get).mockResolvedValue({ success: true } as never);
    vi.mocked(api.delete).mockResolvedValue({ success: true } as never);
  });

  it('covers toggleSelectAll true then false to merge and clear filtered selections', async () => {
    queryState.members = [
      { email: 'alpha@example.com', firstName: 'Alpha', lastName: 'One', status: 'active' },
      { email: 'beta@example.com', firstName: 'Beta', lastName: 'Two', status: 'active' },
    ];
    queryState.membersTotal = 2;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Alpha One'));
    expect(screen.getByText('1 sélectionné(s)')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Sélectionner tout'));
    await waitFor(() => {
      expect(screen.getByText('2 sélectionné(s)')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('Sélectionner tout'));
    await waitFor(() => {
      expect(screen.queryByText('2 sélectionné(s)')).toBeNull();
    });
  });

  it('shows destructive toast when converting a proposed member fails', async () => {
    queryState.members = [
      { email: 'convert.error@example.com', firstName: 'Convert', lastName: 'Error', status: 'proposed' },
    ];
    queryState.membersTotal = 1;

    vi.mocked(api.patch).mockRejectedValueOnce(new Error('kanban status failed') as never);

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Convertir' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erreur',
          description: 'kanban status failed',
          variant: 'destructive',
        }),
      );
    });
  });
});

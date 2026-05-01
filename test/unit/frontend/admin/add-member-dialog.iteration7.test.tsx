// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddMemberDialog } from '@/app/(protected)/admin/members/add-member-dialog';

type MutationMode = 'success' | 'error';

type QueryInvalidateArgs = {
  queryKey: readonly string[] | string[];
};

type ToastPayload = {
  title: string;
  description?: string;
  variant?: 'destructive';
};

type MutationOptions = {
  mutationFn: (variables: Record<string, unknown>) => Promise<unknown>;
  onSuccess?: (data: unknown, variables: Record<string, unknown>) => void | Promise<void>;
  onError?: (error: Error) => void;
};

type UseQueryOptions<TData> = {
  queryFn: () => Promise<TData>;
};

const mocks = vi.hoisted(() => ({
  mutationMode: 'success' as MutationMode,
  toast: vi.fn<(payload: ToastPayload) => void>(),
  invalidateQueries: vi.fn<(args: QueryInvalidateArgs) => void>(),
  apiGet: vi.fn<(url: string) => Promise<unknown>>(),
  apiPost: vi.fn<(url: string, payload: Record<string, unknown>) => Promise<unknown>>(),
  administrators: [
    {
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
    {
      email: 'fallback@example.com',
      role: 'admin',
    },
  ] as Array<{ email: string; firstName?: string; lastName?: string; role: string }>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { email: 'owner@example.com' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/lib/api/client', () => ({
  queryKeys: {
    admin: {
      administrators: {
        list: () => ['administrators'],
      },
    },
    members: {
      all: ['members'],
    },
  },
  api: {
    get: (url: string) => {
      void mocks.apiGet(url);
      return Promise.resolve({
        success: true,
        data: mocks.administrators,
      });
    },
    post: (url: string, payload: Record<string, unknown>) => {
      void mocks.apiPost(url, payload);
      if (url === '/api/admin/members' && mocks.mutationMode === 'error') {
        return Promise.reject(new Error('API failure'));
      }
      return Promise.resolve({ success: true });
    },
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries,
    }),
    useQuery: (options: UseQueryOptions<unknown>) => {
      void options.queryFn();
      return {
        data: { data: mocks.administrators },
        isLoading: false,
        error: null,
      };
    },
    useMutation: (options: MutationOptions) => ({
      isPending: false,
      mutate: (variables: Record<string, unknown>) => {
        void options
          .mutationFn(variables)
          .then((data) => options.onSuccess?.(data, variables))
          .catch((error: unknown) => {
            const normalizedError = error instanceof Error ? error : new Error('Mutation failed');
            options.onError?.(normalizedError);
          });
      },
    }),
  };
});

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    className,
  }: {
    children: React.ReactNode;
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

vi.mock('@/components/ui/input', () => ({
  Input: ({
    id,
    value,
    type,
    disabled,
    onChange,
  }: {
    id?: string;
    value?: string;
    type?: string;
    disabled?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => <input id={id} value={value} type={type} disabled={disabled} onChange={onChange} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    id,
    value,
    disabled,
    rows,
    onChange,
  }: {
    id?: string;
    value?: string;
    disabled?: boolean;
    rows?: number;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  }) => <textarea id={id} value={value} disabled={disabled} rows={rows} onChange={onChange} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
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
      children: React.ReactNode;
    }) => <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>,
    SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => <button id={id}>{children}</button>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => {
      const ctx = reactModule.useContext(SelectContext);
      return <span>{ctx.value ?? placeholder ?? ''}</span>;
    },
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => {
      const ctx = reactModule.useContext(SelectContext);
      return (
        <button type="button" onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
  };
});

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect?: (date: Date | undefined) => void }) => (
    <button type="button" data-testid="calendar" onClick={() => onSelect?.(new Date('2026-05-20T00:00:00.000Z'))}>
      calendar-select
    </button>
  ),
}));

vi.mock('@/components/network/NetworkSection', () => ({
  NetworkSection: () => <div data-testid="network-section" />,
}));

vi.mock('@/components/ui/siret-search', () => ({
  SiretSearch: () => <button type="button">siret-search</button>,
}));

describe('AddMemberDialog iteration7', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationMode = 'success';
  });

  it('executes administrators query function and exposes fallback admin email label', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<AddMemberDialog open onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/admin/administrators');
    });

    expect(screen.getByText('fallback@example.com')).toBeTruthy();
  });

  it('submits optional fields (contact, company, location) and first contact date', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<AddMemberDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'Marie' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Lefevre' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'marie.lefevre@example.com' } });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: ' 0612345678 ' } });
    fireEvent.change(screen.getByLabelText('Fonction'), { target: { value: ' Directrice ' } });
    fireEvent.change(screen.getByLabelText('Entreprise'), { target: { value: ' ACME Consulting ' } });
    fireEvent.change(screen.getByLabelText("Secteur d'activité"), { target: { value: ' Conseil ' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: ' Paris ' } });
    fireEvent.change(screen.getByLabelText('Code postal'), { target: { value: ' 75001 ' } });
    fireEvent.change(screen.getByLabelText('Département'), { target: { value: ' Île-de-France ' } });

    const calendarButtons = screen.getAllByTestId('calendar');
    fireEvent.click(calendarButtons[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le membre' }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/admin/members',
        expect.objectContaining({
          firstName: 'Marie',
          lastName: 'Lefevre',
          email: 'marie.lefevre@example.com',
          phone: '0612345678',
          role: 'Directrice',
          company: 'ACME Consulting',
          sector: 'Conseil',
          city: 'Paris',
          postalCode: '75001',
          department: 'Île-de-France',
          firstContactDate: '2026-05-20T00:00:00.000Z',
        }),
      );
    });
  });
});

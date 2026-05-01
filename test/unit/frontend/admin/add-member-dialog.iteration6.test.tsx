// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddMemberDialog } from '@/app/(protected)/admin/members/add-member-dialog';
import type { PendingConnection } from '@/components/network/NetworkSection';
import type { SiretCompanyData } from '@/components/ui/siret-search';

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

const mocks = vi.hoisted(() => ({
  mutationMode: 'success' as MutationMode,
  toast: vi.fn<(payload: ToastPayload) => void>(),
  invalidateQueries: vi.fn<(args: QueryInvalidateArgs) => void>(),
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
    get: () =>
      Promise.resolve({
        success: true,
        data: mocks.administrators,
      }),
    post: (url: string, payload: Record<string, unknown>) => {
      mocks.apiPost(url, payload);
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
    useQuery: () => ({
      data: { data: mocks.administrators },
      isLoading: false,
      error: null,
    }),
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
    <button type="button" data-testid="calendar" onClick={() => onSelect?.(new Date('2026-06-15T00:00:00.000Z'))}>
      calendar-select
    </button>
  ),
}));

vi.mock('@/components/network/NetworkSection', () => ({
  NetworkSection: ({
    value,
    onChange,
  }: {
    value: PendingConnection[];
    onChange: (connections: PendingConnection[]) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onChange([
          ...value,
          {
            email: 'mentor@example.com',
            type: 'patron',
            firstName: 'Mentor',
            lastName: 'One',
            company: 'Mentor Corp',
          },
        ])
      }
    >
      add-network-connection
    </button>
  ),
}));

vi.mock('@/components/ui/siret-search', () => ({
  SiretSearch: ({
    onSelect,
  }: {
    onSelect: (data: SiretCompanyData) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          company: 'ACME SAS',
          city: 'Lille',
          postalCode: '59000',
          department: 'Nord',
          sector: 'Conseil',
        })
      }
    >
      siret-fill
    </button>
  ),
}));

describe('AddMemberDialog iteration6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationMode = 'success';
  });

  it('maps pipeline defaultStatus to prospect mode and proposed payload', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<AddMemberDialog open onOpenChange={onOpenChange} defaultStatus="R1" />);

    expect(screen.getByText('Ajouter un prospect')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajouter le prospect' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'Jean' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Prospect' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'jean.prospect@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le prospect' }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/admin/members',
        expect.objectContaining({
          firstName: 'Jean',
          lastName: 'Prospect',
          email: 'jean.prospect@example.com',
          status: 'proposed',
          prospectionStatus: 'R1',
        }),
      );
    });
  });

  it('allows clearing pipeline step to none and keeps explicit non-pipeline status', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<AddMemberDialog open onOpenChange={onOpenChange} defaultStatus="inactive" />);

    fireEvent.click(screen.getByRole('button', { name: 'Aucune (membre actif)' }));

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Inactive' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'alice.inactive@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le membre' }));

    await waitFor(() => {
      const memberCalls = mocks.apiPost.mock.calls.filter((call) => call[0] === '/api/admin/members');
      expect(memberCalls.length).toBeGreaterThan(0);
      const lastCall = memberCalls[memberCalls.length - 1];
      expect(lastCall[1]).toMatchObject({
        firstName: 'Alice',
        lastName: 'Inactive',
        email: 'alice.inactive@example.com',
        status: 'inactive',
      });
      expect(lastCall[1].prospectionStatus).toBeUndefined();
    });
  });

  it('applies SIRET data and creates pending network connections after member creation', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<AddMemberDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'siret-fill' }));

    expect((screen.getByLabelText('Entreprise') as HTMLInputElement).value).toBe('ACME SAS');
    expect((screen.getByLabelText('Ville') as HTMLInputElement).value).toBe('Lille');
    expect((screen.getByLabelText('Code postal') as HTMLInputElement).value).toBe('59000');
    expect((screen.getByLabelText('Département') as HTMLInputElement).value).toBe('Nord');
    expect((screen.getByLabelText("Secteur d'activité") as HTMLInputElement).value).toBe('Conseil');

    fireEvent.click(screen.getByRole('button', { name: 'add-network-connection' }));

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'Marc' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Durand' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'marc.durand@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le membre' }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/network',
        {
          ownerEmail: 'marc.durand@example.com',
          ownerType: 'member',
          connectedEmail: 'mentor@example.com',
          connectedType: 'patron',
        },
      );
    });
  });

  it('couvre les sélections SONCAS/responsable/statut/pipeline et la date de RDV', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<AddMemberDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'Sonia' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Profile' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'sonia.profile@example.com' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Notes enrichies' } });

    fireEvent.click(screen.getByText('Sympathie'));
    fireEvent.click(screen.getByText('Admin User'));
    fireEvent.click(screen.getByText('Inactif'));
    fireEvent.click(screen.getByText('Qualification'));

    const calendarButtons = screen.getAllByTestId('calendar');
    fireEvent.click(calendarButtons[calendarButtons.length - 1]);

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le membre' }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/admin/members',
        expect.objectContaining({
          firstName: 'Sonia',
          lastName: 'Profile',
          email: 'sonia.profile@example.com',
          notes: 'Notes enrichies',
          soncasProfile: 'Sympathie',
          assignedTo: 'admin@example.com',
          status: 'inactive',
          prospectionStatus: 'Qualification',
          meetingDate: '2026-06-15T00:00:00.000Z',
        }),
      );
    });
  });
});

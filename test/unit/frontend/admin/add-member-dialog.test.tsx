// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  Calendar: () => <div data-testid="calendar" />,
}));

vi.mock('@/components/network/NetworkSection', () => ({
  NetworkSection: () => <div data-testid="network-section" />,
}));

vi.mock('@/components/ui/siret-search', () => ({
  SiretSearch: () => <button type="button">siret-search</button>,
}));

describe('AddMemberDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationMode = 'success';
  });

  it('renders when open and closes on Annuler', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const { rerender } = render(<AddMemberDialog open onOpenChange={onOpenChange} />);

    expect(screen.getByText('Ajouter un membre')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(<AddMemberDialog open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText('Ajouter un membre')).toBeNull();
  });

  it('validates required fields and invalid email before submit', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<AddMemberDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le membre' }));

    expect(screen.getByText('Le prénom est requis')).toBeTruthy();
    expect(screen.getByText('Le nom est requis')).toBeTruthy();
    expect(screen.getByText("L'email est requis")).toBeTruthy();
    expect(mocks.apiPost).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'Jean' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Dupont' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'invalid-email' } });

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le membre' }));

    expect(screen.getByText("L'email n'est pas valide")).toBeTruthy();
    expect(mocks.apiPost).not.toHaveBeenCalled();
  });

  it('submits successfully, resets form, invalidates members and closes dialog', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<AddMemberDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: '  Jean  ' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: '  Dupont ' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: ' jean.dupont@example.com ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le membre' }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/admin/members',
        expect.objectContaining({
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          status: 'active',
        }),
      );
    });

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Membre ajouté',
          description: 'Le membre a été créé avec succès',
        }),
      );
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['members'] });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    await waitFor(() => {
      const firstNameInput = screen.getByLabelText('Prénom *') as HTMLInputElement;
      const lastNameInput = screen.getByLabelText('Nom *') as HTMLInputElement;
      const emailInput = screen.getByLabelText('Email *') as HTMLInputElement;
      expect(firstNameInput.value).toBe('');
      expect(lastNameInput.value).toBe('');
      expect(emailInput.value).toBe('');
    });
  });

  it('shows destructive toast and keeps dialog open on submit error', async () => {
    mocks.mutationMode = 'error';
    const onOpenChange = vi.fn<(open: boolean) => void>();

    render(<AddMemberDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Martin' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'alice@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le membre' }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'API failure',
        variant: 'destructive',
      });
    });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });
});

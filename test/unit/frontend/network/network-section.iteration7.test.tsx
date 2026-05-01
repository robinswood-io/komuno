// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NetworkSection, type PendingConnection } from '@/components/network/NetworkSection';

type EntityType = 'member' | 'patron';

interface SearchEntity {
  email: string;
  firstName: string;
  lastName: string;
  company?: string | null;
}

interface SearchEntityWithType extends SearchEntity {
  type: EntityType;
}

interface LiveConnection {
  id: string;
  connectedEmail: string;
  connectedType: EntityType;
  firstName: string;
  lastName: string;
  company?: string | null;
  createdAt: string;
}

interface QueryState {
  data: unknown;
  isLoading: boolean;
}

interface MutationOptions {
  mutationFn: (variables: unknown) => Promise<unknown>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const state = vi.hoisted(() => ({
  membersQuery: { data: [], isLoading: false } as QueryState,
  patronsQuery: { data: [], isLoading: false } as QueryState,
  connectionsQuery: { data: [], isLoading: false } as QueryState,
  addIsPending: false,
  removeIsPending: false,
  addMutateSpy: vi.fn<(payload: SearchEntityWithType) => void>(),
  removeMutateSpy: vi.fn<(id: string) => void>(),
  invalidateQueriesSpy: vi.fn<(args: { queryKey: readonly unknown[] }) => void>(),
  toastSpy: vi.fn<(args: { title: string; description: string; variant: 'destructive' }) => void>(),
}));

function resetState(): void {
  state.membersQuery = { data: [], isLoading: false };
  state.patronsQuery = { data: [], isLoading: false };
  state.connectionsQuery = { data: [], isLoading: false };
  state.addIsPending = false;
  state.removeIsPending = false;
  state.addMutateSpy.mockReset();
  state.removeMutateSpy.mockReset();
  state.invalidateQueriesSpy.mockReset();
  state.toastSpy.mockReset();
}

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: state.toastSpy }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(' '),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  let mutationCallIndex = 0;

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: state.invalidateQueriesSpy,
    }),
    useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => {
      if (queryKey[0] === 'network-search-members') {
        return {
          data: state.membersQuery.data,
          isLoading: state.membersQuery.isLoading,
        };
      }

      if (queryKey[0] === 'network-search-patrons') {
        return {
          data: state.patronsQuery.data,
          isLoading: state.patronsQuery.isLoading,
        };
      }

      return {
        data: state.connectionsQuery.data,
        isLoading: state.connectionsQuery.isLoading,
      };
    },
    useMutation: (options: MutationOptions) => {
      const currentIndex = mutationCallIndex;
      mutationCallIndex += 1;

      if (currentIndex % 2 === 0) {
        return {
          mutate: (payload: SearchEntityWithType) => {
            state.addMutateSpy(payload);
            options.onSuccess?.();
          },
          isPending: state.addIsPending,
        };
      }

      return {
        mutate: (id: string) => {
          state.removeMutateSpy(id);
          options.onSuccess?.();
        },
        isPending: state.removeIsPending,
      };
    },
  };
});

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
    className,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
  }) => (
    <button type={type ?? 'button'} disabled={disabled} onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading?: string }) => (
    <div>
      {heading ? <p>{heading}</p> : null}
      {children}
    </div>
  ),
  CommandInput: ({ placeholder }: { placeholder?: string }) => <input placeholder={placeholder} />,
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <svg data-testid="icon" className={className} />;
  return {
    Network: Icon,
    Plus: Icon,
    X: Icon,
    Loader2: Icon,
  };
});

describe('NetworkSection iteration7', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  it('affiche l’état vide en mode controlled', () => {
    const onChange = vi.fn<(connections: PendingConnection[]) => void>();

    render(
      <NetworkSection
        mode="controlled"
        ownerType="member"
        value={[]}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Aucune connexion')).toBeTruthy();
    expect(screen.getByText('Membre')).toBeTruthy();
    expect(screen.getByText('Mécène')).toBeTruthy();
  });

  it('ajoute une connaissance en mode controlled', () => {
    const onChange = vi.fn<(connections: PendingConnection[]) => void>();

    state.membersQuery = {
      isLoading: false,
      data: {
        items: [
          {
            email: 'alice.member@example.com',
            firstName: 'Alice',
            lastName: 'Member',
            company: 'Acme',
          },
        ],
      },
    };

    state.patronsQuery = {
      isLoading: false,
      data: {
        data: [
          {
            email: 'paul.patron@example.com',
            firstName: 'Paul',
            lastName: 'Patron',
            company: 'Patron SA',
          },
        ],
      },
    };

    render(
      <NetworkSection
        mode="controlled"
        ownerType="member"
        value={[]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('Alice Member'));

    expect(onChange).toHaveBeenCalledWith([
      {
        email: 'alice.member@example.com',
        type: 'member',
        firstName: 'Alice',
        lastName: 'Member',
        company: 'Acme',
      },
    ]);
  });

  it('supprime une connexion en mode controlled', () => {
    const onChange = vi.fn<(connections: PendingConnection[]) => void>();
    const value: PendingConnection[] = [
      {
        email: 'alice.member@example.com',
        type: 'member',
        firstName: 'Alice',
        lastName: 'Member',
        company: 'Acme',
      },
      {
        email: 'paul.patron@example.com',
        type: 'patron',
        firstName: 'Paul',
        lastName: 'Patron',
      },
    ];

    render(
      <NetworkSection
        mode="controlled"
        ownerType="member"
        value={value}
        onChange={onChange}
      />,
    );

    const deleteButtons = screen.getAllByRole('button', { name: 'Supprimer' });
    fireEvent.click(deleteButtons[0]);

    expect(onChange).toHaveBeenCalledWith([
      {
        email: 'paul.patron@example.com',
        type: 'patron',
        firstName: 'Paul',
        lastName: 'Patron',
      },
    ]);
  });

  it('supprime une connexion en mode live et invalide le cache', () => {
    state.connectionsQuery = {
      isLoading: false,
      data: [
        {
          id: 'conn-1',
          connectedEmail: 'alice.member@example.com',
          connectedType: 'member',
          firstName: 'Alice',
          lastName: 'Member',
          company: 'Acme',
          createdAt: '2026-04-29T10:00:00.000Z',
        },
      ] satisfies LiveConnection[],
    };

    render(
      <NetworkSection
        mode="live"
        ownerEmail="owner@example.com"
        ownerType="member"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(state.removeMutateSpy).toHaveBeenCalledWith('conn-1');
    expect(state.invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['network-connections', 'owner@example.com'],
    });
  });

  it('affiche le spinner de chargement des entités et disable le bouton quand ajout pending', () => {
    state.membersQuery = { isLoading: true, data: [] };
    state.patronsQuery = { isLoading: true, data: [] };
    state.addIsPending = true;

    render(
      <NetworkSection
        mode="live"
        ownerEmail="owner@example.com"
        ownerType="member"
      />,
    );

    expect(screen.getByRole('button', { name: /ajouter une connaissance/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByPlaceholderText('Rechercher...')).toBeTruthy();

    const spinners = document.querySelectorAll('svg.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });
});

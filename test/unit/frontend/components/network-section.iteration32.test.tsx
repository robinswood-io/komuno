// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NetworkSection } from '@/components/network/NetworkSection';

type EntityType = 'member' | 'patron';

type SearchEntity = {
  email: string;
  firstName: string;
  lastName: string;
  company?: string | null;
};

type SearchEntityWithType = SearchEntity & {
  type: EntityType;
};

type QueryState = {
  data: unknown;
  isLoading: boolean;
};

type QueryOptions = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
  initialData?: unknown;
};

type MutationOptions = {
  mutationFn: (variables: unknown) => Promise<unknown>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

type NetworkApiGetResponse = {
  data: unknown;
};

const state = vi.hoisted(() => ({
  membersQuery: { data: [], isLoading: false } as QueryState,
  patronsQuery: { data: [], isLoading: false } as QueryState,
  connectionsQuery: { data: [], isLoading: false } as QueryState,
  addIsPending: false,
  removeIsPending: false,
  addShouldError: false,
  removeShouldError: false,
  apiGetMock: vi.fn<(url: string) => Promise<NetworkApiGetResponse>>(),
  addMutateSpy: vi.fn<(payload: SearchEntityWithType) => void>(),
  removeMutateSpy: vi.fn<(id: string) => void>(),
  invalidateQueriesSpy: vi.fn<(args: { queryKey: readonly unknown[] }) => void>(),
  toastSpy: vi.fn<(
    args: { title: string; description: string; variant: 'destructive' },
  ) => void>(),
  addMutationFn: null as ((entity: SearchEntityWithType) => Promise<unknown>) | null,
  connectionsQueryFn: null as (() => Promise<unknown>) | null,
  connectionsQueryEnabled: null as boolean | null,
}));

function resetState(): void {
  state.membersQuery = { data: [], isLoading: false };
  state.patronsQuery = { data: [], isLoading: false };
  state.connectionsQuery = { data: [], isLoading: false };
  state.addIsPending = false;
  state.removeIsPending = false;
  state.addShouldError = false;
  state.removeShouldError = false;
  state.apiGetMock.mockReset();
  state.addMutateSpy.mockReset();
  state.removeMutateSpy.mockReset();
  state.invalidateQueriesSpy.mockReset();
  state.toastSpy.mockReset();
  state.addMutationFn = null;
  state.connectionsQueryFn = null;
  state.connectionsQueryEnabled = null;
}

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (url: string) => state.apiGetMock(url),
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
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );

  let mutationCallIndex = 0;

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: state.invalidateQueriesSpy,
    }),
    useQuery: (options: QueryOptions) => {
      const key = options.queryKey[0];
      if (key === 'network-search-members') {
        return {
          data: state.membersQuery.data,
          isLoading: state.membersQuery.isLoading,
        };
      }

      if (key === 'network-search-patrons') {
        return {
          data: state.patronsQuery.data,
          isLoading: state.patronsQuery.isLoading,
        };
      }

      state.connectionsQueryFn = options.queryFn;
      state.connectionsQueryEnabled = options.enabled ?? null;

      return {
        data: state.connectionsQuery.data,
        isLoading: state.connectionsQuery.isLoading,
      };
    },
    useMutation: (options: MutationOptions) => {
      mutationCallIndex += 1;

      if (mutationCallIndex % 2 === 1) {
        state.addMutationFn = async (entity: SearchEntityWithType) =>
          options.mutationFn(entity);

        return {
          mutate: (entity: SearchEntityWithType) => {
            state.addMutateSpy(entity);
            if (state.addShouldError) {
              options.onError?.(new Error('add-failed'));
              return;
            }
            options.onSuccess?.();
          },
          isPending: state.addIsPending,
        };
      }

      return {
        mutate: (id: string) => {
          state.removeMutateSpy(id);
          if (state.removeShouldError) {
            options.onError?.(new Error('remove-failed'));
            return;
          }
          options.onSuccess?.();
        },
        isPending: state.removeIsPending,
      };
    },
  };
});

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props}>{children}</span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type ?? 'button'} disabled={disabled} onClick={onClick}>
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

describe('network-section iteration32', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  it('adds a patron in live mode and invalidates live connections query', () => {
    state.membersQuery = {
      isLoading: false,
      data: {
        items: [],
      },
    };

    state.patronsQuery = {
      isLoading: false,
      data: {
        data: [
          {
            email: 'patron.one@example.com',
            firstName: 'Patron',
            lastName: 'One',
            company: 'Patron Corp',
          },
        ],
      },
    };

    render(
      <NetworkSection mode="live" ownerEmail="owner@example.com" ownerType="member" />,
    );

    fireEvent.click(screen.getByText('Patron One'));

    expect(state.addMutateSpy).toHaveBeenCalledWith({
      email: 'patron.one@example.com',
      firstName: 'Patron',
      lastName: 'One',
      company: 'Patron Corp',
      type: 'patron',
    });

    expect(state.invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['network-connections', 'owner@example.com'],
    });
  });

  it('shows toast on add mutation error', () => {
    state.addShouldError = true;
    state.membersQuery = {
      isLoading: false,
      data: [
        {
          email: 'member.one@example.com',
          firstName: 'Member',
          lastName: 'One',
          company: null,
        },
      ],
    };

    render(
      <NetworkSection mode="live" ownerEmail="owner@example.com" ownerType="member" />,
    );

    fireEvent.click(screen.getByText('Member One'));

    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Erreur',
      description: 'add-failed',
      variant: 'destructive',
    });
  });

  it('shows toast on remove mutation error', () => {
    state.removeShouldError = true;
    state.connectionsQuery = {
      isLoading: false,
      data: [
        {
          id: 'conn-1',
          connectedEmail: 'member.one@example.com',
          connectedType: 'member',
          firstName: 'Member',
          lastName: 'One',
          company: null,
          createdAt: '2026-04-30T10:00:00.000Z',
        },
      ],
    };

    render(
      <NetworkSection mode="live" ownerEmail="owner@example.com" ownerType="member" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(state.removeMutateSpy).toHaveBeenCalledWith('conn-1');
    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Erreur',
      description: 'remove-failed',
      variant: 'destructive',
    });
  });

  it('returns empty array from connections queryFn when API data is not an array', async () => {
    state.apiGetMock.mockResolvedValue({
      data: { unexpected: true },
    });

    render(
      <NetworkSection mode="live" ownerEmail="owner@example.com" ownerType="member" />,
    );

    expect(state.connectionsQueryEnabled).toBe(true);
    expect(state.connectionsQueryFn).not.toBeNull();

    const queryResult = await state.connectionsQueryFn?.();
    expect(queryResult).toEqual([]);
    expect(state.apiGetMock).toHaveBeenCalledWith('/api/network?email=owner%40example.com');
  });

  it('throws in add mutation function when called in controlled mode', async () => {
    render(
      <NetworkSection
        mode="controlled"
        ownerType="member"
        value={[]}
        onChange={() => undefined}
      />,
    );

    expect(state.addMutationFn).not.toBeNull();

    await expect(
      state.addMutationFn?.({
        email: 'member.one@example.com',
        firstName: 'Member',
        lastName: 'One',
        company: null,
        type: 'member',
      }) ?? Promise.resolve(undefined),
    ).rejects.toThrowError('Not in live mode');
  });
});

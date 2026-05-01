/** @vitest-environment jsdom */
import React, { type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockSetQueryData = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockApiRequest = vi.fn();
const mockToast = vi.fn();

type MutationConfig<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
    useMutation: (...args: unknown[]) => mockUseMutation(...args),
  };
});

vi.mock('@/lib/queryClient', () => ({
  getQueryFn: vi.fn(() => vi.fn()),
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  queryClient: {
    setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

function TestConsumer(): ReactElement {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(auth.isLoading)}</div>
      <div data-testid="user">{auth.user?.email ?? 'none'}</div>
      <button
        data-testid="trigger-login"
        onClick={() => {
          void auth.loginMutation
            .mutateAsync({ email: 'admin@test.dev', password: 'pw' })
            .catch(() => undefined);
        }}
      >
        trigger
      </button>
      <button
        data-testid="trigger-logout"
        onClick={() => {
          void auth.logoutMutation.mutateAsync().catch(() => undefined);
        }}
      >
        trigger logout
      </button>
    </div>
  );
}

function mountProvider(): void {
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'false');
    window.localStorage.clear();

    mockUseQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    });

    mockUseMutation.mockImplementation(<TData, TVariables>(config: MutationConfig<TData, TVariables>) => ({
      mutateAsync: async (variables: TVariables) => {
        try {
          const result = await config.mutationFn(variables);
          config.onSuccess?.(result);
          return result;
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          config.onError?.(error);
          throw error;
        }
      },
    }));

    mockApiRequest.mockResolvedValue({
      json: async () => ({
        email: 'admin@test.dev',
        role: 'super_admin',
      }),
    });
  });

  it('uses authenticated user query and exposes user state', () => {
    mockUseQuery.mockReturnValueOnce({
      data: { email: 'member@test.dev', role: 'member' },
      error: null,
      isLoading: true,
    });

    mountProvider();

    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('member@test.dev');

    const queryArgs = mockUseQuery.mock.calls[0]?.[0] as { enabled: boolean; queryKey: string[] };
    expect(queryArgs.queryKey).toEqual(['/api/auth/user']);
    expect(queryArgs.enabled).toBe(true);
  });

  it('disables auth user query when dev login is enabled and admin-user exists', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    window.localStorage.setItem('admin-user', '{"email":"admin@test.dev"}');

    mountProvider();

    const queryArgs = mockUseQuery.mock.calls[0]?.[0] as { enabled: boolean };
    expect(queryArgs.enabled).toBe(false);
  });

  it('handles login success branch with cache updates and redirect', async () => {
    mountProvider();

    screen.getByTestId('trigger-login').click();

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/auth/login', {
        email: 'admin@test.dev',
        password: 'pw',
      });
      expect(mockSetQueryData).toHaveBeenCalledWith(['/api/auth/user'], {
        email: 'admin@test.dev',
        role: 'super_admin',
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['/api/auth/user'] });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connexion réussie',
        description: 'Bienvenue !',
      });
    });
  });

  it('handles login error branch and displays destructive toast', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('Bad credentials'));

    mountProvider();

    screen.getByTestId('trigger-login').click();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur de connexion',
        description: 'Bad credentials',
        variant: 'destructive',
      });
    });
  });

  it('handles logout success branch', async () => {
    mockApiRequest.mockResolvedValueOnce({ json: async () => ({}) });

    mountProvider();

    screen.getByTestId('trigger-logout').click();

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/auth/logout');
      expect(mockSetQueryData).toHaveBeenCalledWith(['/api/auth/user'], null);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Déconnexion',
        description: 'Vous avez été déconnecté avec succès',
      });
    });
  });
});

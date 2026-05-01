// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import type { User as SelectUser } from '@/shared/schema';

type QueryState = {
  data: SelectUser | undefined;
  error: Error | null;
  isLoading: boolean;
  enabledHistory: boolean[];
};

type MutationName = 'login' | 'logout' | 'forgot' | 'reset';

type MutationOptions = {
  mutationFn: (variables: unknown) => Promise<unknown>;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
};

type ApiResponseShape = {
  json: () => Promise<unknown>;
};

type ApiRequestFn = (
  method: string,
  url: string,
  data?: unknown,
) => Promise<ApiResponseShape>;

const state = vi.hoisted(() => ({
  query: {
    data: undefined,
    error: null,
    isLoading: false,
    enabledHistory: [] as boolean[],
  } as QueryState,
  mutationCallIndex: 0,
  apiRequestMock: vi.fn<ApiRequestFn>(),
  setQueryDataSpy: vi.fn<(key: readonly unknown[], value: unknown) => void>(),
  invalidateQueriesSpy: vi.fn<(args: { queryKey: readonly unknown[] }) => void>(),
  toastSpy: vi.fn<(
    args: { title: string; description: string; variant?: 'destructive' },
  ) => void>(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: state.toastSpy,
  }),
}));

vi.mock('@/lib/queryClient', () => ({
  getQueryFn: () => async () => null,
  apiRequest: (method: string, url: string, data?: unknown) =>
    state.apiRequestMock(method, url, data),
  queryClient: {
    setQueryData: (key: readonly unknown[], value: unknown) =>
      state.setQueryDataSpy(key, value),
    invalidateQueries: (args: { queryKey: readonly unknown[] }) =>
      state.invalidateQueriesSpy(args),
  },
}));

vi.mock('@tanstack/react-query', () => {
  return {
    useQuery: (options: { enabled?: boolean }) => {
      state.query.enabledHistory.push(options.enabled ?? true);
      return {
        data: state.query.data,
        error: state.query.error,
        isLoading: state.query.isLoading,
      };
    },
    useMutation: (options: MutationOptions) => {
      state.mutationCallIndex += 1;

      const runMutation = async (variables: unknown): Promise<void> => {
        try {
          const data = await options.mutationFn(variables);
          options.onSuccess?.(data);
        } catch (error: unknown) {
          const safeError = error instanceof Error ? error : new Error('Unknown error');
          options.onError?.(safeError);
        }
      };

      return {
        mutate: (variables?: unknown) => {
          void runMutation(variables);
        },
        isPending: false,
      };
    },
  };
});

import { AuthProvider, useAuth } from '@/hooks/use-auth';

function resetState(): void {
  state.query.data = undefined;
  state.query.error = null;
  state.query.isLoading = false;
  state.query.enabledHistory = [];
  state.mutationCallIndex = 0;
  state.apiRequestMock.mockReset();
  state.setQueryDataSpy.mockReset();
  state.invalidateQueriesSpy.mockReset();
  state.toastSpy.mockReset();
  window.localStorage.clear();
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN = 'false';
}

function AuthHarness(): React.JSX.Element {
  const auth = useAuth();

  return (
    <div>
      <button
        type="button"
        onClick={() => auth.loginMutation.mutate({ email: 'admin@example.com', password: 'secret' })}
      >
        login
      </button>
      <button type="button" onClick={() => auth.logoutMutation.mutate()}>
        logout
      </button>
      <button
        type="button"
        onClick={() => auth.forgotPasswordMutation.mutate({ email: 'admin@example.com' })}
      >
        forgot
      </button>
      <button
        type="button"
        onClick={() => auth.resetPasswordMutation.mutate({ token: 'token-1', password: 'new-pass' })}
      >
        reset
      </button>
      <div data-testid="auth-mode">{auth.authMode}</div>
      <div data-testid="loading">{auth.isLoading ? 'true' : 'false'}</div>
      <div data-testid="has-user">{auth.user ? 'true' : 'false'}</div>
      <div data-testid="error">{auth.error ? auth.error.message : 'none'}</div>
    </div>
  );
}

describe('use-auth iteration32', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<AuthHarness />)).toThrowError(
      'useAuth must be used within an AuthProvider',
    );

    consoleErrorSpy.mockRestore();
  });

  it('disables auth user query when dev login is enabled and admin-user is in localStorage', () => {
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN = 'true';
    window.localStorage.setItem('admin-user', '1');

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    expect(state.query.enabledHistory.length).toBeGreaterThan(0);
    expect(state.query.enabledHistory[0]).toBe(false);
  });

  it('runs auth user query when dev login is disabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN = 'false';

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    expect(state.query.enabledHistory.length).toBeGreaterThan(0);
    expect(state.query.enabledHistory[0]).toBe(true);
    expect(screen.getByTestId('auth-mode').textContent).toBe('local');
  });

  it('handles login success and invalidates auth user query', async () => {
    const adminUser = {
      id: 'u-admin',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      status: 'active',
      isActive: true,
      password: null,
      resetToken: null,
      resetTokenExpires: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies SelectUser;

    state.apiRequestMock.mockResolvedValue({
      json: async () => adminUser,
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'login' }));
      await Promise.resolve();
    });

    expect(state.apiRequestMock).toHaveBeenCalledWith(
      'POST',
      '/api/auth/login',
      { email: 'admin@example.com', password: 'secret' },
    );
    expect(state.setQueryDataSpy).toHaveBeenCalledWith(['/api/auth/user'], adminUser);
    expect(state.invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/auth/user'] });
    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Connexion réussie',
      description: 'Bienvenue !',
    });
  });

  it('handles login error with fallback message', async () => {
    state.apiRequestMock.mockRejectedValue(new Error(''));

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'login' }));
      await Promise.resolve();
    });

    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Erreur de connexion',
      description: 'Identifiants invalides',
      variant: 'destructive',
    });
  });

  it('handles logout, forgot password and reset password flows', async () => {
    state.apiRequestMock
      .mockResolvedValueOnce({ json: async () => ({}) })
      .mockResolvedValueOnce({ json: async () => ({ message: 'ok-forgot' }) })
      .mockResolvedValueOnce({ json: async () => ({ message: 'ok-reset' }) });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'logout' }));
      await Promise.resolve();
    });

    expect(state.apiRequestMock).toHaveBeenCalledWith('POST', '/api/auth/logout', undefined);
    expect(state.setQueryDataSpy).toHaveBeenCalledWith(['/api/auth/user'], null);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'forgot' }));
      await Promise.resolve();
    });

    expect(state.apiRequestMock).toHaveBeenCalledWith(
      'POST',
      '/api/auth/forgot-password',
      { email: 'admin@example.com' },
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'reset' }));
      await Promise.resolve();
    });

    expect(state.apiRequestMock).toHaveBeenCalledWith(
      'POST',
      '/api/auth/reset-password',
      { token: 'token-1', password: 'new-pass' },
    );

    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Déconnexion',
      description: 'Vous avez été déconnecté avec succès',
    });
    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Email envoyé',
      description:
        'Si votre email est enregistré, vous recevrez un lien de réinitialisation.',
    });
    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Mot de passe réinitialisé',
      description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
    });
  });

  it('handles forgot/reset errors with destructive toast', async () => {
    state.apiRequestMock
      .mockRejectedValueOnce(new Error('forgot-error'))
      .mockRejectedValueOnce(new Error('reset-error'));

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'forgot' }));
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'reset' }));
      await Promise.resolve();
    });

    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Erreur',
      description: 'forgot-error',
      variant: 'destructive',
    });
    expect(state.toastSpy).toHaveBeenCalledWith({
      title: 'Erreur',
      description: 'reset-error',
      variant: 'destructive',
    });
  });
});

/**
 * REST API Client - Typed fetch utilities
 * Replaces tRPC with standard REST calls
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query params
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    credentials: 'include', // Include cookies for session auth
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(
      (errorData as { message?: string })?.message || response.statusText,
      response.status,
      errorData
    );
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    fetchApi<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE' }),
};

// Query key factory for React Query cache management
export const queryKeys = {
  // Ideas
  ideas: {
    all: ['ideas'] as const,
    list: (params?: { page?: number; limit?: number }) => ['ideas', 'list', params] as const,
    detail: (id: string) => ['ideas', 'detail', id] as const,
    votes: (ideaId: string) => ['ideas', 'votes', ideaId] as const,
    stats: () => ['ideas', 'stats'] as const,
  },

  // Events
  events: {
    all: ['events'] as const,
    list: (params?: { page?: number; limit?: number }) => ['events', 'list', params] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
    inscriptions: (eventId: string) => ['events', 'inscriptions', eventId] as const,
    stats: () => ['events', 'stats'] as const,
  },

  // Loans
  loans: {
    all: ['loans'] as const,
    list: (params?: { page?: number; limit?: number; search?: string }) => ['loans', 'list', params] as const,
    listAll: (params?: { page?: number; limit?: number; search?: string }) => ['loans', 'listAll', params] as const,
    detail: (id: string) => ['loans', 'detail', id] as const,
  },

  // Members
  members: {
    all: ['members'] as const,
    list: (params?: Record<string, unknown>) => ['members', 'list', params] as const,
    detail: (email: string) => ['members', 'detail', email] as const,
    tags: {
      all: ['members', 'tags'] as const,
      list: (params?: Record<string, unknown>) => ['members', 'tags', 'list', params] as const,
      detail: (id: string) => ['members', 'tags', 'detail', id] as const,
    },
    tasks: {
      all: ['members', 'tasks'] as const,
      list: (params?: Record<string, unknown>) => ['members', 'tasks', 'list', params] as const,
      byMember: (email: string) => ['members', 'tasks', 'byMember', email] as const,
      detail: (id: string) => ['members', 'tasks', 'detail', id] as const,
    },
    relations: {
      all: ['members', 'relations'] as const,
      list: (params?: Record<string, unknown>) => ['members', 'relations', 'list', params] as const,
      detail: (id: string) => ['members', 'relations', 'detail', id] as const,
    },
  },

  // Patrons
  patrons: {
    all: ['patrons'] as const,
    list: (params?: Record<string, unknown>) => ['patrons', 'list', params] as const,
    detail: (id: string) => ['patrons', 'detail', id] as const,
  },

  // Financial
  financial: {
    all: ['financial'] as const,
    budgets: (params?: Record<string, unknown>) => ['financial', 'budgets', params] as const,
    expenses: (params?: Record<string, unknown>) => ['financial', 'expenses', params] as const,
    categories: (params?: Record<string, unknown>) => ['financial', 'categories', params] as const,
    forecasts: (params?: Record<string, unknown>) => ['financial', 'forecasts', params] as const,
    kpis: (params?: Record<string, unknown>) => ['financial', 'kpis', params] as const,
    budgetStats: (params?: Record<string, unknown>) => ['financial', 'budgetStats', params] as const,
    expenseStats: (params?: Record<string, unknown>) => ['financial', 'expenseStats', params] as const,
  },

  // Admin
  admin: {
    all: ['admin'] as const,
    stats: () => ['admin', 'stats'] as const,
    users: () => ['admin', 'users'] as const,
    administrators: {
      all: ['admin', 'administrators'] as const,
      list: () => ['admin', 'administrators', 'list'] as const,
    },
  },

  // Auth
  auth: {
    user: () => ['auth', 'user'] as const,
  },

  // Tracking
  tracking: {
    all: ['tracking'] as const,
    dashboard: () => ['tracking', 'dashboard'] as const,
    metrics: (params?: Record<string, unknown>) => ['tracking', 'metrics', params] as const,
    alerts: (params?: Record<string, unknown>) => ['tracking', 'alerts', params] as const,
  },
};

// Type definitions for API responses
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Administrator types
export interface Administrator {
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'ideas_reader' | 'ideas_manager' | 'events_reader' | 'events_manager';
  status: 'pending' | 'active' | 'inactive';
  isActive: boolean;
  addedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface EditAdminFormData {
  firstName: string;
  lastName: string;
}

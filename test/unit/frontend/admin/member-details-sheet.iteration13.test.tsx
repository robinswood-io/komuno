// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemberDetailsSheet } from '@/app/(protected)/admin/members/member-details-sheet';
import { api } from '@/lib/api/client';

type ContactType = 'meeting' | 'email' | 'call' | 'lunch' | 'event';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  status: string;
  engagementScore?: number;
  phone?: string;
  role?: string;
  cjdRole?: string;
  notes?: string;
  proposedBy?: string;
  createdAt?: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  date: string;
}

interface Subscription {
  id: number;
  amountInCents: number;
  startDate: string;
  endDate: string;
  subscriptionType?: string;
  status?: string;
  paymentMethod?: string;
}

interface MemberContact {
  id: string;
  memberEmail: string;
  type: ContactType;
  subject: string;
  date: string;
  startTime?: string;
  duration?: number;
  description: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

interface MemberDetailsData {
  member: Member;
  tags: Array<{ id: string; name: string; color?: string }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string;
    dueDate?: string;
  }>;
  relations: Array<{
    id: string;
    relationType: string;
    relatedMemberEmail: string;
    relatedMemberName?: string;
  }>;
  subscriptions: Array<Subscription>;
}

interface QueryResult<TData> {
  data?: { success: boolean; data: TData };
  isLoading: boolean;
}

interface CreateContactPayload {
  type: ContactType;
  subject: string;
  date: string;
  description: string;
  duration?: number;
  notes?: string;
}

interface GenericMutationOptions {
  mutationFn: (variables: unknown) => Promise<unknown>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

const state = vi.hoisted(() => ({
  detailsQuery: { data: undefined, isLoading: false } as QueryResult<MemberDetailsData>,
  activitiesQuery: { data: undefined, isLoading: false } as QueryResult<Activity[]>,
  contactsQuery: { data: undefined, isLoading: false } as QueryResult<MemberContact[]>,
  isCreatingContact: false,
  isDeletingContact: false,
  createContactMutate: vi.fn<(payload: CreateContactPayload) => void>(),
  deleteContactMutate: vi.fn<(contactId: string) => void>(),
  invalidateQueries: vi.fn<(args: { queryKey: readonly unknown[] }) => void>(),
}));

const defaultMember = (): Member => ({
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme',
  status: 'active',
});

const defaultDetails = (): MemberDetailsData => ({
  member: defaultMember(),
  tags: [],
  tasks: [],
  relations: [],
  subscriptions: [],
});

function hasSegment(queryKey: readonly unknown[], segment: string): boolean {
  return queryKey.some((part) => part === segment);
}

function resetState(): void {
  state.detailsQuery = { data: { success: true, data: defaultDetails() }, isLoading: false };
  state.activitiesQuery = { data: { success: true, data: [] }, isLoading: false };
  state.contactsQuery = { data: { success: true, data: [] }, isLoading: false };
  state.isCreatingContact = false;
  state.isDeletingContact = false;
  state.createContactMutate.mockReset();
  state.deleteContactMutate.mockReset();
  state.invalidateQueries.mockReset();
}

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  queryKeys: {
    members: {
      detail: (email: string) => ['members', 'detail', email] as const,
    },
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: state.invalidateQueries,
    }),
    useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => {
      if (hasSegment(queryKey, 'activities')) {
        return {
          data: state.activitiesQuery.data,
          isLoading: state.activitiesQuery.isLoading,
        };
      }

      if (hasSegment(queryKey, 'contacts')) {
        return {
          data: state.contactsQuery.data,
          isLoading: state.contactsQuery.isLoading,
        };
      }

      return {
        data: state.detailsQuery.data,
        isLoading: state.detailsQuery.isLoading,
      };
    },
    useMutation: (options: GenericMutationOptions) => {
      const isDeleteMutation = options.mutationFn.toString().includes('member-contacts');

      if (!isDeleteMutation) {
        return {
          mutate: (payload: CreateContactPayload) => {
            state.createContactMutate(payload);
            void options
              .mutationFn(payload)
              .then(() => options.onSuccess?.())
              .catch((error: unknown) => options.onError?.(error));
          },
          isPending: state.isCreatingContact,
        };
      }

      return {
        mutate: (contactId: string) => {
          state.deleteContactMutate(contactId);
          void options
            .mutationFn(contactId)
            .then(() => options.onSuccess?.())
            .catch((error: unknown) => options.onError?.(error));
        },
        isPending: state.isDeletingContact,
      };
    },
  };
});

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    size,
    variant,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    variant?: 'default' | 'outline' | 'ghost';
    className?: string;
  }) => (
    <button
      type={type ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      data-size={size}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    id,
    type,
    min,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
    type?: string;
    min?: string;
  }) => (
    <input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      min={min}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    id,
    rows,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    id?: string;
    rows?: number;
  }) => (
    <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} rows={rows} />
  ),
}));

vi.mock('@/components/ui/select', async () => {
  const reactModule = await vi.importActual<typeof import('react')>('react');

  const SelectContext = reactModule.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: '' });

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
      <button type="button" id={id}>
        {children}
      </button>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => {
      const ctx = reactModule.useContext(SelectContext);
      return <span>{ctx.value || placeholder}</span>;
    },
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: ContactType; children: React.ReactNode }) => {
      const ctx = reactModule.useContext(SelectContext);
      return (
        <button type="button" onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
  };
});

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <svg className={className} data-testid="icon" />;

  return {
    Loader2: Icon,
    Mail: Icon,
    Phone: Icon,
    Building2: Icon,
    Briefcase: Icon,
    UserCircle: Icon,
    Calendar: Icon,
    TrendingUp: Icon,
    Pencil: Icon,
    Trash2: Icon,
    UserCheck: Icon,
    Plus: Icon,
    MessageSquare: Icon,
  };
});

describe('MemberDetailsSheet - iteration13', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.mocked(api.post).mockResolvedValue({ success: true } as never);
    vi.mocked(api.delete).mockResolvedValue({ success: true } as never);
  });

  it('n’autorise pas l’enregistrement d’une interaction incomplète', () => {
    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    const saveButton = screen.getByRole('button', { name: /enregistrer/i });
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(saveButton);
    expect(state.createContactMutate).not.toHaveBeenCalled();
  });

  it('enregistre une interaction valide sans durée ni notes', () => {
    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    fireEvent.change(screen.getByLabelText('Sujet *'), { target: { value: 'Suivi cotisation' } });
    fireEvent.change(screen.getByLabelText('Date *'), { target: { value: '2026-04-29' } });
    fireEvent.change(screen.getByLabelText('Description *'), {
      target: { value: 'Envoi d’un rappel de paiement.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(state.createContactMutate).toHaveBeenCalledWith({
      type: 'email',
      subject: 'Suivi cotisation',
      date: '2026-04-29',
      description: 'Envoi d’un rappel de paiement.',
      notes: undefined,
      duration: undefined,
    });
  });

  it('ne supprime pas une interaction quand la confirmation est refusée', () => {
    vi.stubGlobal('confirm', vi.fn(() => false));

    const contacts: MemberContact[] = [
      {
        id: 'contact-1',
        memberEmail: 'john@example.com',
        type: 'call',
        subject: 'Appel de suivi',
        date: '2026-04-18T10:00:00.000Z',
        description: 'Point d’avancement rapide',
        createdBy: 'admin@example.com',
        createdAt: '2026-04-18T10:00:00.000Z',
      },
    ];

    state.contactsQuery = { data: { success: true, data: contacts }, isLoading: false };

    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    const iconButtons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('data-size') === 'icon');

    fireEvent.click(iconButtons[0]);

    expect(confirm).toHaveBeenCalledWith('Supprimer cette interaction ?');
    expect(state.deleteContactMutate).not.toHaveBeenCalled();
  });

  it('affiche le badge de statut par défaut pour un statut inconnu', () => {
    state.detailsQuery = {
      data: {
        success: true,
        data: {
          ...defaultDetails(),
          member: {
            ...defaultMember(),
            status: 'custom-status',
          },
        },
      },
      isLoading: false,
    };

    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    expect(screen.getByTestId('member-status-badge').textContent).toContain('custom-status');
  });

  it('affiche le mode conversion en cours pour un prospect', () => {
    state.detailsQuery = {
      data: {
        success: true,
        data: {
          ...defaultDetails(),
          member: {
            ...defaultMember(),
            status: 'proposed',
          },
        },
      },
      isLoading: false,
    };

    const onConvertToActive = vi.fn<(email: string) => void>();

    render(
      <MemberDetailsSheet
        email="john@example.com"
        open
        onClose={vi.fn()}
        onConvertToActive={onConvertToActive}
        isConvertingToActive
      />,
    );

    const convertButton = screen
      .getAllByRole('button')
      .find((button) => button.querySelector('svg.animate-spin') !== null);

    expect(convertButton).toBeTruthy();
    expect(convertButton?.hasAttribute('disabled')).toBe(true);
    expect(convertButton?.querySelector('svg.animate-spin')).toBeTruthy();

    if (convertButton) {
      fireEvent.click(convertButton);
    }

    expect(onConvertToActive).not.toHaveBeenCalled();
  });

  it('affiche le loader quand les détails sont en cours de chargement', () => {
    state.detailsQuery = { data: undefined, isLoading: true };

    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    const icons = screen.getAllByTestId('icon');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('affiche "Membre non trouvé" quand aucune donnée membre n’est disponible', () => {
    state.detailsQuery = { data: undefined, isLoading: false };

    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    expect(screen.getByText('Membre non trouvé')).toBeTruthy();
  });

  it('déclenche les actions édition, suppression et conversion', () => {
    state.detailsQuery = {
      data: {
        success: true,
        data: {
          ...defaultDetails(),
          member: {
            ...defaultMember(),
            status: 'proposed',
            engagementScore: 88,
            phone: '0600000000',
            role: 'Dirigeant',
            cjdRole: 'Président',
            proposedBy: 'Alice',
            createdAt: '2026-04-01T00:00:00.000Z',
            notes: 'Note membre',
          },
          subscriptions: [
            {
              id: 1,
              amountInCents: 12345,
              startDate: '2026-01-01T00:00:00.000Z',
              endDate: '2026-12-31T00:00:00.000Z',
              subscriptionType: 'annuelle',
              status: 'active',
              paymentMethod: 'virement',
            },
          ],
          tags: [{ id: 't1', name: 'VIP', color: '#ff0000' }],
          tasks: [{ id: 'task-1', title: 'Relancer', status: 'completed', dueDate: '2026-05-10T00:00:00.000Z' }],
        },
      },
      isLoading: false,
    };

    state.activitiesQuery = {
      data: {
        success: true,
        data: [{ id: 'a1', type: 'info', description: 'Création fiche', date: '2026-04-02T10:00:00.000Z' }],
      },
      isLoading: false,
    };

    const onEdit = vi.fn<(member: Member) => void>();
    const onDelete = vi.fn<(email: string) => void>();
    const onConvertToActive = vi.fn<(email: string) => void>();

    render(
      <MemberDetailsSheet
        email="john@example.com"
        open
        onClose={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
        onConvertToActive={onConvertToActive}
      />,
    );

    expect(screen.getByText('Entreprise:')).toBeTruthy();
    expect(screen.getByText('Téléphone:')).toBeTruthy();
    expect(screen.getByText('Fonction:')).toBeTruthy();
    expect(screen.getByText('Rôle CJD:')).toBeTruthy();
    expect(screen.getByText('Proposé par:')).toBeTruthy();
    expect(screen.getByText('Membre depuis:')).toBeTruthy();
    expect(screen.getByText('Note membre')).toBeTruthy();
    expect(screen.getByTestId('member-engagement-score-badge').textContent).toContain('88');
    expect(screen.getByText('annuelle')).toBeTruthy();
    expect(screen.getByText('Paiement: virement')).toBeTruthy();
    expect(screen.getByText('VIP')).toBeTruthy();
    expect(screen.getByText('Relancer')).toBeTruthy();
    expect(screen.getByText('Création fiche')).toBeTruthy();

    const editButton = screen.getAllByRole('button').find((button) => button.getAttribute('data-size') === 'icon');
    expect(editButton).toBeTruthy();
    if (editButton) {
      fireEvent.click(editButton);
    }
    expect(onEdit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /convertir/i }));
    expect(onConvertToActive).toHaveBeenCalledWith('john@example.com');

    const deleteButton = screen
      .getAllByRole('button')
      .find((button) => button.querySelector('.text-destructive') !== null);
    expect(deleteButton).toBeTruthy();
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }
    expect(onDelete).toHaveBeenCalledWith('john@example.com');
  });

  it('supprime une interaction quand la confirmation est acceptée', async () => {
    const contacts: MemberContact[] = [
      {
        id: 'contact-2',
        memberEmail: 'john@example.com',
        type: 'meeting',
        subject: 'Rendez-vous',
        date: '2026-04-20T10:00:00.000Z',
        duration: 45,
        description: 'Point complet',
        notes: 'Préparer les chiffres',
        createdBy: 'admin@example.com',
        createdAt: '2026-04-20T10:00:00.000Z',
      },
    ];
    state.contactsQuery = { data: { success: true, data: contacts }, isLoading: false };

    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    const iconButtons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('data-size') === 'icon');
    fireEvent.click(iconButtons[0]);

    expect(state.deleteContactMutate).toHaveBeenCalledWith('contact-2');
    await waitFor(() => {
      expect(state.invalidateQueries).toHaveBeenCalled();
    });
  });

  it('enregistre une interaction avec durée et notes', async () => {
    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Appel' }));
    fireEvent.change(screen.getByLabelText('Sujet *'), { target: { value: 'Call mensuel' } });
    fireEvent.change(screen.getByLabelText('Date *'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Suivi membre' } });
    fireEvent.change(screen.getByLabelText('Notes (optionnel)'), { target: { value: 'RAS' } });

    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(state.createContactMutate).toHaveBeenCalledWith({
      type: 'call',
      subject: 'Call mensuel',
      date: '2026-05-01',
      description: 'Suivi membre',
      notes: 'RAS',
      duration: 30,
    });
    await waitFor(() => {
      expect(state.invalidateQueries).toHaveBeenCalled();
    });
  });

  it('appelle l’endpoint de création de contact (mutationFn createContact)', () => {
    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    fireEvent.change(screen.getByLabelText('Sujet *'), { target: { value: 'Contact API' } });
    fireEvent.change(screen.getByLabelText('Date *'), { target: { value: '2026-05-02' } });
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Description API' } });

    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(api.post).toHaveBeenCalledWith(
      '/api/admin/members/john%40example.com/contacts',
      expect.objectContaining({
        type: 'email',
        subject: 'Contact API',
        date: '2026-05-02',
        description: 'Description API',
      }),
    );
  });

  it('appelle l’endpoint de suppression de contact (mutationFn deleteContact)', () => {
    state.contactsQuery = {
      data: {
        success: true,
        data: [
          {
            id: 'contact-api-delete',
            memberEmail: 'john@example.com',
            type: 'email',
            subject: 'Suppression',
            date: '2026-05-02T10:00:00.000Z',
            description: 'A supprimer',
            createdBy: 'admin@example.com',
            createdAt: '2026-05-02T10:00:00.000Z',
          },
        ],
      },
      isLoading: false,
    };

    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    const iconButtons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('data-size') === 'icon');
    fireEvent.click(iconButtons[0]);

    expect(api.delete).toHaveBeenCalledWith('/api/admin/member-contacts/contact-api-delete');
  });
});

// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemberDetailsSheet } from '@/app/(protected)/admin/members/member-details-sheet';

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
  onError?: () => void;
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
  engagementScore: 72,
  phone: '0102030405',
  role: 'CEO',
  notes: 'Membre historique',
  createdAt: '2026-01-12T10:00:00.000Z',
});

const defaultDetails = (): MemberDetailsData => ({
  member: defaultMember(),
  tags: [],
  tasks: [],
  relations: [],
  subscriptions: [],
});

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

function hasSegment(queryKey: readonly unknown[], segment: string): boolean {
  return queryKey.some((part) => part === segment);
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
            options.onSuccess?.();
          },
          isPending: state.isCreatingContact,
        };
      }

      return {
        mutate: (contactId: string) => {
          state.deleteContactMutate(contactId);
          options.onSuccess?.();
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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    variant?: 'default' | 'outline' | 'ghost';
  }) => (
    <button
      type={type ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      data-size={size}
      data-variant={variant}
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

describe('MemberDetailsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();

    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('affiche un loader pendant le chargement des détails', () => {
    state.detailsQuery = { data: undefined, isLoading: true };

    const { container } = render(
      <MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />,
    );

    expect(container.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('affiche le fallback membre non trouvé quand aucun membre n’est retourné', () => {
    state.detailsQuery = { data: undefined, isLoading: false };

    render(<MemberDetailsSheet email="john@example.com" open onClose={vi.fn()} />);

    expect(screen.getByText('Membre non trouvé')).toBeTruthy();
  });

  it('exécute les callbacks convertir, éditer et supprimer (confirmé)', () => {
    const member = { ...defaultMember(), status: 'proposed', engagementScore: 88 };
    state.detailsQuery = {
      data: { success: true, data: { ...defaultDetails(), member } },
      isLoading: false,
    };

    const onConvertToActive = vi.fn<(email: string) => void>();
    const onEdit = vi.fn<(value: Member) => void>();
    const onDelete = vi.fn<(email: string) => void>();

    render(
      <MemberDetailsSheet
        email={member.email}
        open
        onClose={vi.fn()}
        onConvertToActive={onConvertToActive}
        onEdit={onEdit}
        onDelete={onDelete}
      />, 
    );

    fireEvent.click(screen.getByRole('button', { name: /convertir/i }));
    expect(onConvertToActive).toHaveBeenCalledWith(member.email);

    const iconButtons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('data-size') === 'icon');

    fireEvent.click(iconButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ email: member.email }));

    fireEvent.click(iconButtons[1]);
    expect(onDelete).toHaveBeenCalledWith(member.email);
    expect(confirm).toHaveBeenCalled();
  });

  it('n’exécute pas la suppression si la confirmation est refusée', () => {
    vi.stubGlobal('confirm', vi.fn(() => false));

    const member = { ...defaultMember(), status: 'proposed' };
    state.detailsQuery = {
      data: { success: true, data: { ...defaultDetails(), member } },
      isLoading: false,
    };

    const onDelete = vi.fn<(email: string) => void>();

    render(
      <MemberDetailsSheet
        email={member.email}
        open
        onClose={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const iconButtons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('data-size') === 'icon');

    fireEvent.click(iconButtons[0]);

    expect(onDelete).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalled();
  });

  it('ouvre le dialogue d’ajout d’interaction et enregistre une interaction valide', () => {
    const member = defaultMember();
    state.detailsQuery = {
      data: { success: true, data: { ...defaultDetails(), member } },
      isLoading: false,
    };

    render(
      <MemberDetailsSheet
        email={member.email}
        open
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(screen.getByText('Nouvelle interaction')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Appel' }));
    fireEvent.change(screen.getByLabelText('Sujet *'), { target: { value: 'Suivi trimestriel' } });
    fireEvent.change(screen.getByLabelText('Date *'), { target: { value: '2026-04-29' } });
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText('Description *'), {
      target: { value: 'Point d’avancement sur les objectifs.' },
    });
    fireEvent.change(screen.getByLabelText('Notes (optionnel)'), {
      target: { value: 'Très réactif.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(state.createContactMutate).toHaveBeenCalledWith({
      type: 'call',
      subject: 'Suivi trimestriel',
      date: '2026-04-29',
      duration: 45,
      description: 'Point d’avancement sur les objectifs.',
      notes: 'Très réactif.',
    });
    expect(state.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['members', 'detail', member.email, 'contacts'],
    });
  });

  it('supprime une interaction quand la confirmation est acceptée', () => {
    const member = defaultMember();
    const contacts: MemberContact[] = [
      {
        id: 'contact-1',
        memberEmail: member.email,
        type: 'email',
        subject: 'Relance cotisation',
        date: '2026-03-01T09:30:00.000Z',
        description: 'Email de suivi envoyé.',
        createdBy: 'admin@example.com',
        createdAt: '2026-03-01T09:30:00.000Z',
      },
    ];

    state.detailsQuery = {
      data: { success: true, data: { ...defaultDetails(), member } },
      isLoading: false,
    };
    state.contactsQuery = {
      data: { success: true, data: contacts },
      isLoading: false,
    };

    render(<MemberDetailsSheet email={member.email} open onClose={vi.fn()} />);

    const iconButtons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('data-size') === 'icon');

    fireEvent.click(iconButtons[0]);

    expect(state.deleteContactMutate).toHaveBeenCalledWith('contact-1');
    expect(state.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['members', 'detail', member.email, 'contacts'],
    });
  });
});

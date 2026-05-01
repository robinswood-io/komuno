// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import AdminMembersPage from '@/app/(protected)/admin/members/page';
import { api } from '@/lib/api/client';

interface TestMember {
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  proposedBy?: string;
  city?: string;
}

interface MemberTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  _count?: { assignments: number };
}

interface TestAdmin {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface TestSubscriptionType {
  id: string;
  name: string;
  amountInCents: number;
  durationType: string;
}

interface MutationOptions {
  mutationFn: (variables: unknown) => Promise<unknown>;
  onSuccess?: (data: unknown, variables: unknown) => void | Promise<void>;
  onError?: (error: Error) => void;
}

interface QueryOptionsLike {
  queryKey: readonly unknown[];
  enabled?: boolean;
}

const toastMock = vi.hoisted(() => vi.fn());
const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const refetchQueriesMock = vi.hoisted(() => vi.fn());

const queryState = vi.hoisted(() => ({
  members: [] as TestMember[],
  membersTotal: 0,
  membersLoading: false,
  membersError: null as Error | null,
  tags: [] as MemberTag[],
  tagsLoading: false,
  admins: [] as TestAdmin[],
  subscriptionTypes: [] as TestSubscriptionType[],
  kanbanMembers: [] as TestMember[],
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    className,
  }: {
    children: ReactNode;
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

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <tr onClick={onClick} className={className}>
      {children}
    </tr>
  ),
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableCell: ({
    children,
    onClick,
    colSpan,
    className,
    title,
  }: {
    children: ReactNode;
    onClick?: (event: React.MouseEvent<HTMLTableCellElement>) => void;
    colSpan?: number;
    className?: string;
    title?: string;
  }) => (
    <td onClick={onClick} colSpan={colSpan} className={className} title={title}>
      {children}
    </td>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    id,
    type,
    className,
    disabled,
    maxLength,
    pattern,
    name,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
    type?: string;
    className?: string;
    disabled?: boolean;
    maxLength?: number;
    pattern?: string;
    name?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      type={type}
      className={className}
      disabled={disabled}
      maxLength={maxLength}
      pattern={pattern}
      name={name}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (value: boolean | 'indeterminate') => void;
    'aria-label'?: string;
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open?: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: { open?: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
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
      children: ReactNode;
    }) => <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>,
    SelectTrigger: ({ children, className }: { children: ReactNode; className?: string }) => <button type="button" className={className}>{children}</button>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => {
      const ctx = reactModule.useContext(SelectContext);
      return <span>{ctx.value ?? placeholder ?? ''}</span>;
    },
    SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => {
      const ctx = reactModule.useContext(SelectContext);
      return <button type="button" onClick={() => ctx.onValueChange?.(value)}>{children}</button>;
    },
  };
});

vi.mock('@/app/(protected)/admin/members/add-member-dialog', () => ({
  AddMemberDialog: (): ReactNode => null,
}));

vi.mock('@/app/(protected)/admin/members/member-details-sheet', () => ({
  MemberDetailsSheet: ({
    open,
    email,
    onClose,
    onEdit,
    onDelete,
    onConvertToActive,
  }: {
    open: boolean;
    email: string | null;
    onDelete: (value: string) => void;
    onEdit: (member: unknown) => void;
    onClose: () => void;
    onConvertToActive: (value: string) => void;
    isConvertingToActive: boolean;
    isDeletingMember: boolean;
  }) => {
    if (!open || !email) return null;
    return (
      <div>
        <button type="button" onClick={onClose}>
          sheet-close
        </button>
        <button
          type="button"
          onClick={() => onEdit({ email, firstName: 'Sheet', lastName: 'Member', status: 'active' })}
        >
          sheet-edit
        </button>
        <button type="button" onClick={() => onConvertToActive(email)}>sheet-convert</button>
        <button type="button" onClick={() => onDelete(email)}>sheet-delete</button>
      </div>
    );
  },
}));

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <svg data-testid="icon" className={className} />;
  return {
    Loader2: Icon,
    Plus: Icon,
    Pencil: Icon,
    Trash2: Icon,
    Search: Icon,
    UserCheck: Icon,
    UserPlus: Icon,
    Eye: Icon,
    Download: Icon,
    BarChart3: Icon,
    Tag: Icon,
    List: Icon,
    LayoutGrid: Icon,
    UserSearch: Icon,
  };
});

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn(actual.api.get),
      post: vi.fn(actual.api.post),
      patch: vi.fn(actual.api.patch),
      delete: vi.fn(actual.api.delete),
    },
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
      refetchQueries: refetchQueriesMock,
    }),
    useQuery: vi.fn((options: QueryOptionsLike) => {
      const key = options.queryKey;

      if (key[0] === 'admin' && key[1] === 'administrators') {
        return { data: { data: queryState.admins }, isLoading: false, error: null };
      }

      if (key[0] === 'subscription-types') {
        return { data: { data: queryState.subscriptionTypes }, isLoading: false, error: null };
      }

      if (key[0] === 'members' && key[1] === 'tags') {
        if (options.enabled === false) {
          return { data: [], isLoading: false, error: null };
        }
        return { data: queryState.tags, isLoading: queryState.tagsLoading, error: null };
      }

      if (key[0] === 'members' && key[1] === 'list') {
        const params = key[2] as { kanban?: boolean } | undefined;
        if (params?.kanban === true) {
          return {
            data: {
              data: queryState.kanbanMembers,
              total: queryState.kanbanMembers.length,
              limit: 500,
              page: 1,
            },
            isLoading: false,
            error: null,
          };
        }

        return {
          data: {
            data: queryState.members,
            total: queryState.membersTotal,
            limit: 20,
            page: 1,
          },
          isLoading: queryState.membersLoading,
          error: queryState.membersError,
        };
      }

      return { data: undefined, isLoading: false, error: null };
    }),
    useMutation: vi.fn((options: MutationOptions) => ({
      mutate: (variables: unknown) => {
        void options
          .mutationFn(variables)
          .then((data) => options.onSuccess?.(data, variables))
          .catch((error: unknown) => {
            const normalized = error instanceof Error ? error : new Error('mutation failed');
            options.onError?.(normalized);
          });
      },
      isPending: false,
    })),
  };
});

describe('AdminMembersPage iteration7', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    queryState.members = [];
    queryState.membersTotal = 0;
    queryState.membersLoading = false;
    queryState.membersError = null;
    queryState.tags = [];
    queryState.tagsLoading = false;
    queryState.admins = [];
    queryState.subscriptionTypes = [];
    queryState.kanbanMembers = [];

    vi.stubGlobal('confirm', vi.fn(() => true));

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn<(_: string) => Promise<void>>(() => Promise.resolve()),
      },
    });

    vi.mocked(api.patch).mockResolvedValue({ success: true } as never);
    vi.mocked(api.post).mockResolvedValue({ success: true } as never);
    vi.mocked(api.get).mockResolvedValue({ success: true } as never);
    vi.mocked(api.delete).mockResolvedValue({ success: true } as never);
  });

  it('copie un email dans le presse-papier et affiche un toast succès', async () => {
    queryState.members = [
      {
        email: 'copy.success@example.com',
        firstName: 'Copy',
        lastName: 'Success',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByText('copy.success@example.com'));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Email copié',
          description: 'copy.success@example.com a été copié dans le presse-papier',
        }),
      );
    });
  });

  it('affiche un toast destructif si la copie email échoue', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn<(_: string) => Promise<void>>(() => Promise.reject(new Error('clipboard blocked'))),
      },
    });

    queryState.members = [
      {
        email: 'copy.fail@example.com',
        firstName: 'Copy',
        lastName: 'Fail',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByText('copy.fail@example.com'));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erreur',
          description: "Impossible de copier l'email",
          variant: 'destructive',
        }),
      );
    });
  });

  it('bloque la création d’un tag si un nom identique existe déjà', async () => {
    queryState.tags = [
      {
        id: 'tag-1',
        name: 'VIP',
        color: '#3b82f6',
        createdAt: '2026-01-01T00:00:00.000Z',
        _count: { assignments: 2 },
      },
    ];

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Gérer les tags' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer un tag' }));

    fireEvent.change(screen.getByLabelText(/Nom du tag/i), {
      target: { value: 'vip' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Créer le tag' }));

    expect(screen.getByText('Un tag avec ce nom existe déjà')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalledWith('/api/admin/tags', expect.anything());
  });

  it('n’exécute pas la suppression membre quand la confirmation est refusée', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));

    queryState.members = [
      {
        email: 'delete.cancel@example.com',
        firstName: 'Delete',
        lastName: 'Cancel',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByText('Delete Cancel'));
    fireEvent.click(await screen.findByRole('button', { name: 'sheet-delete' }));

    await waitFor(() => {
      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  it('met à jour la couleur depuis la palette puis ferme le formulaire tag avec Annuler', async () => {
    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Gérer les tags' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer un tag' }));

    const customColorInput = screen.getByLabelText('Hex personnalisé:') as HTMLInputElement;
    expect(customColorInput.value).toBe('#3b82f6');

    fireEvent.click(screen.getByTitle('#ef4444'));
    expect(customColorInput.value).toBe('#ef4444');
    fireEvent.change(customColorInput, { target: { value: '#06b6d4' } });
    expect(customColorInput.value).toBe('#06b6d4');

    fireEvent.change(screen.getByLabelText(/Description \(optionnel\)/i), {
      target: { value: 'Tag de test' },
    });
    expect(screen.getByDisplayValue('Tag de test')).toBeTruthy();

    const cancelButtons = screen.getAllByRole('button', { name: 'Annuler' });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByLabelText('Hex personnalisé:')).toBeNull();
    });
  });

  it('couvre les actions de la liste de tags: modifier, supprimer et fermer', async () => {
    queryState.tags = [
      {
        id: 'tag-list-1',
        name: 'Ambassadeur',
        color: '#8b5cf6',
        createdAt: '2026-01-01T00:00:00.000Z',
        _count: { assignments: 3 },
      },
    ];

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Gérer les tags' }));

    const tagRow = screen.getByText('Ambassadeur').closest('tr');
    expect(tagRow).toBeTruthy();
    const tagActionButtons = within(tagRow as HTMLElement).getAllByRole('button');
    fireEvent.click(tagActionButtons[0]);
    expect(screen.getAllByText('Modifier le tag').length).toBeGreaterThan(0);

    const cancelButtons = screen.getAllByRole('button', { name: 'Annuler' });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByLabelText('Hex personnalisé:')).toBeNull();
    });

    fireEvent.click(tagActionButtons[1]);
    expect(screen.getByText('Supprimer le tag ?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await waitFor(() => {
      expect(screen.queryByText('Liste des tags créés')).toBeNull();
    });
  });

  it('ouvre le dialog de cotisation en masse et assigne une cotisation', async () => {
    queryState.members = [
      {
        email: 'bulk.sub@example.com',
        firstName: 'Bulk',
        lastName: 'Sub',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;
    queryState.subscriptionTypes = [
      { id: 'sub-1', name: 'Annuel', amountInCents: 12000, durationType: 'annual' },
    ];

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Bulk Sub'));
    fireEvent.click(screen.getByRole('button', { name: 'Cotisation' }));

    expect(screen.getByText('Assigner une cotisation')).toBeTruthy();
    fireEvent.click(screen.getByText('Annuel — 120 €/an'));
    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2026-05-01' } });
    fireEvent.click(screen.getByText('Carte'));
    fireEvent.click(screen.getByRole('button', { name: 'Assigner la cotisation' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/members/bulk-subscription', {
        emails: ['bulk.sub@example.com'],
        subscriptionTypeId: 'sub-1',
        startDate: '2026-05-01',
        paymentMethod: 'card',
      });
    });
  });

  it('convertit un prospect en actif depuis le bouton de la ligne tableau', async () => {
    queryState.members = [
      {
        email: 'table.convert@example.com',
        firstName: 'Table',
        lastName: 'Convert',
        status: 'proposed',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Convertir' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/members/table.convert%40example.com',
        { status: 'active' },
      );
    });
  });

  it('applique un changement de statut en masse depuis la barre flottante', async () => {
    queryState.members = [
      {
        email: 'bulk.status@example.com',
        firstName: 'Bulk',
        lastName: 'Status',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Bulk Status'));
    const proposedButtons = screen.getAllByRole('button', { name: 'Proposé' });
    fireEvent.click(proposedButtons[proposedButtons.length - 1]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/admin/members/bulk-status', {
        emails: ['bulk.status@example.com'],
        status: 'proposed',
      });
    });
  });

  it('ouvre puis ferme le dialog de cotisation via le bouton Annuler', async () => {
    queryState.members = [
      {
        email: 'bulk.cancel@example.com',
        firstName: 'Bulk',
        lastName: 'Cancel',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Bulk Cancel'));
    fireEvent.click(screen.getByRole('button', { name: 'Cotisation' }));
    expect(screen.getByText('Assigner une cotisation')).toBeTruthy();

    const cancelButtons = screen.getAllByRole('button', { name: 'Annuler' });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText('Assigner une cotisation')).toBeNull();
    });
  });

  it('désélectionne toute la sélection via le bouton Annuler de la barre flottante', async () => {
    queryState.members = [
      {
        email: 'bulk.unselect@example.com',
        firstName: 'Bulk',
        lastName: 'Unselect',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByLabelText('Sélectionner Bulk Unselect'));
    expect(screen.getByText('1 sélectionné(s)')).toBeTruthy();

    const cancelButtons = screen.getAllByRole('button', { name: 'Annuler' });
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('1 sélectionné(s)')).toBeNull();
    });
  });

  it('couvre les branches des filtres de statut et les changements de filtres annexes', async () => {
    queryState.members = [
      {
        email: 'filters.coverage@example.com',
        firstName: 'Filters',
        lastName: 'Coverage',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;
    queryState.admins = [
      { email: 'admin.named@example.com', firstName: 'Ada', lastName: 'Lovelace' },
      { email: 'admin.raw@example.com' },
    ];

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Proposé' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proposé' }));

    fireEvent.click(screen.getByRole('button', { name: 'Inactif' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inactif' }));

    fireEvent.change(screen.getByPlaceholderText('Rechercher par nom, email...'), {
      target: { value: 'fil' },
    });
    expect(screen.getByDisplayValue('fil')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Somme (80)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tous les responsables' }));
  });

  it('couvre les callbacks du sheet: édition et conversion prospect actif', async () => {
    queryState.members = [
      {
        email: 'sheet.member@example.com',
        firstName: 'Sheet',
        lastName: 'Member',
        status: 'proposed',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByText('Sheet Member'));
    fireEvent.click(screen.getByRole('button', { name: 'sheet-edit' }));
    expect(screen.getByText('Modifier le membre')).toBeTruthy();

    fireEvent.click(screen.getByText('Sheet Member'));
    fireEvent.click(screen.getByRole('button', { name: 'sheet-convert' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/members/sheet.member%40example.com',
        { status: 'active' },
      );
    });
  });

  it('couvre la validation et la sauvegarde du dialog d’édition membre', async () => {
    queryState.members = [
      {
        email: 'edit.member@example.com',
        firstName: 'Edit',
        lastName: 'Member',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByText('Edit Member'));
    fireEvent.click(screen.getByRole('button', { name: 'sheet-edit' }));

    const firstNameInput = screen.getByLabelText('Prénom *') as HTMLInputElement;
    const lastNameInput = screen.getByLabelText('Nom *') as HTMLInputElement;
    fireEvent.change(firstNameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erreur',
          description: 'Le prénom et le nom sont obligatoires',
          variant: 'destructive',
        }),
      );
    });

    fireEvent.change(firstNameInput, { target: { value: 'Edited' } });
    fireEvent.change(lastNameInput, { target: { value: 'MemberUpdated' } });
    fireEvent.change(screen.getByLabelText('Entreprise'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '0102030405' } });
    fireEvent.change(screen.getByLabelText('Poste'), { target: { value: 'CEO' } });
    fireEvent.change(screen.getByLabelText('Rôle CJD'), { target: { value: 'Président' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Notes test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/members/edit.member%40example.com',
        expect.objectContaining({
          firstName: 'Edited',
          lastName: 'MemberUpdated',
          company: 'Acme',
          phone: '0102030405',
          role: 'CEO',
          cjdRole: 'Président',
          notes: 'Notes test',
        }),
      );
    });
  });

  it('couvre la fermeture du sheet membre via onClose', async () => {
    queryState.members = [
      {
        email: 'sheet.close@example.com',
        firstName: 'Sheet',
        lastName: 'Close',
        status: 'active',
      },
    ];
    queryState.membersTotal = 1;

    render(<AdminMembersPage />);

    fireEvent.click(screen.getByText('Sheet Close'));
    expect(screen.getByRole('button', { name: 'sheet-close' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'sheet-close' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'sheet-close' })).toBeNull();
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IdeasService } from './ideas.service';
import type { StorageService } from '../common/storage/storage.service';

const {
  notifyNewIdeaMock,
  notifyIdeaStatusChangeMock,
  emailNotifyNewIdeaMock,
  loggerWarnMock,
  loggerErrorMock,
  dbSelectMock,
} = vi.hoisted(() => ({
  notifyNewIdeaMock: vi.fn(),
  notifyIdeaStatusChangeMock: vi.fn(),
  emailNotifyNewIdeaMock: vi.fn(),
  loggerWarnMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  dbSelectMock: vi.fn(),
}));

vi.mock('../../notification-service', () => ({
  notificationService: {
    notifyNewIdea: notifyNewIdeaMock,
    notifyIdeaStatusChange: notifyIdeaStatusChangeMock,
  },
}));

vi.mock('../../email-notification-service', () => ({
  emailNotificationService: {
    notifyNewIdea: emailNotifyNewIdeaMock,
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: loggerWarnMock,
    error: loggerErrorMock,
  },
}));

vi.mock('../../db', () => ({
  db: {
    select: dbSelectMock,
  },
}));

type ResultSuccess<T> = { success: true; data: T };
type ResultFailure = { success: false; error: Error };

type IdeaData = {
  id: string;
  title: string;
  description?: string | null;
  proposedBy: string;
  proposedByEmail: string;
  status: string;
  featured: boolean;
  deadline?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string | null;
};

type VoteData = {
  id: string;
  ideaId: string;
  voterName: string;
  voterEmail: string;
  createdAt: Date;
};

type MemberCreatePayload = {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
};

type MemberActivityPayload = {
  memberEmail: string;
  activityType: 'idea_proposed' | 'vote_cast' | 'event_registered' | 'event_unregistered' | 'patron_suggested';
  entityType: 'idea' | 'vote' | 'event' | 'patron';
  entityId: string;
  entityTitle: string;
  scoreImpact: number;
};

type IdeasStorageInstance = {
  getIdeas: Mock<(params: { page: number; limit: number }) => Promise<unknown>>;
  createIdea: Mock<(data: unknown) => Promise<ResultSuccess<IdeaData> | ResultFailure>>;
  deleteIdea: Mock<(id: string) => Promise<{ success: boolean; error?: Error }>>;
  updateIdeaStatus: Mock<(id: string, status: string) => Promise<{ success: boolean; error?: Error }>>;
  getVotesByIdea: Mock<(ideaId: string) => Promise<ResultSuccess<VoteData[]> | ResultFailure>>;
  hasUserVoted: Mock<(ideaId: string, email: string) => Promise<boolean>>;
  createVote: Mock<(data: unknown) => Promise<ResultSuccess<VoteData> | ResultFailure>>;
  getIdea: Mock<(id: string) => Promise<ResultSuccess<IdeaData> | ResultFailure>>;
  createOrUpdateMember: Mock<(payload: MemberCreatePayload) => Promise<unknown>>;
  trackMemberActivity: Mock<(payload: MemberActivityPayload) => Promise<unknown>>;
};

type MockStorageService = {
  instance: IdeasStorageInstance;
};

function makeIdea(partial: Partial<IdeaData> = {}): IdeaData {
  return {
    id: partial.id ?? 'idea-1',
    title: partial.title ?? 'Nouvelle idée',
    description: partial.description ?? 'Description',
    proposedBy: partial.proposedBy ?? 'Jean Dupont',
    proposedByEmail: partial.proposedByEmail ?? 'jean@example.com',
    status: partial.status ?? 'pending',
    featured: partial.featured ?? false,
    deadline: partial.deadline ?? null,
    createdAt: partial.createdAt ?? new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: partial.updatedAt ?? new Date('2026-01-01T10:00:00.000Z'),
    updatedBy: partial.updatedBy ?? null,
  };
}

function makeVote(partial: Partial<VoteData> = {}): VoteData {
  return {
    id: partial.id ?? 'vote-1',
    ideaId: partial.ideaId ?? '123e4567-e89b-12d3-a456-426614174000',
    voterName: partial.voterName ?? 'Marie Martin',
    voterEmail: partial.voterEmail ?? 'marie@example.com',
    createdAt: partial.createdAt ?? new Date('2026-01-02T10:00:00.000Z'),
  };
}

describe('IdeasService', () => {
  let service: IdeasService;
  let storage: MockStorageService;

  beforeEach(() => {
    storage = {
      instance: {
        getIdeas: vi.fn(),
        createIdea: vi.fn(),
        deleteIdea: vi.fn(),
        updateIdeaStatus: vi.fn(),
        getVotesByIdea: vi.fn(),
        hasUserVoted: vi.fn(),
        createVote: vi.fn(),
        getIdea: vi.fn(),
        createOrUpdateMember: vi.fn(),
        trackMemberActivity: vi.fn(),
      },
    };

    service = new IdeasService(storage as unknown as StorageService);

    notifyNewIdeaMock.mockResolvedValue(undefined);
    notifyIdeaStatusChangeMock.mockResolvedValue(undefined);
    emailNotifyNewIdeaMock.mockResolvedValue(undefined);
    loggerWarnMock.mockReset();
    loggerErrorMock.mockReset();
    dbSelectMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('getIdeas passe page/limit au storage', async () => {
    const payload = { data: [], total: 0, page: 2, limit: 5, pageCount: 0 };
    storage.instance.getIdeas.mockResolvedValue(payload);

    const result = await service.getIdeas(2, 5);

    expect(result).toEqual(payload);
    expect(storage.instance.getIdeas).toHaveBeenCalledWith({ page: 2, limit: 5 });
  });

  it('createIdea crée, tracke et notifie en succès', async () => {
    const input = {
      title: 'Nouvelle initiative',
      description: 'Idée d\'atelier',
      proposedBy: 'Jean Dupont',
      proposedByEmail: 'jean@example.com',
      company: 'Acme',
      phone: '+33123456789',
    };
    const created = makeIdea({
      title: input.title,
      description: input.description,
      proposedBy: input.proposedBy,
      proposedByEmail: input.proposedByEmail,
    });

    storage.instance.createIdea.mockResolvedValue({ success: true, data: created });

    const result = await service.createIdea(input);

    expect(result).toEqual(created);
    expect(storage.instance.createIdea).toHaveBeenCalled();
    expect(storage.instance.createOrUpdateMember).toHaveBeenCalledWith({
      email: 'jean@example.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      company: 'Acme',
      phone: '+33123456789',
    });
    expect(storage.instance.trackMemberActivity).toHaveBeenCalledWith({
      memberEmail: 'jean@example.com',
      activityType: 'idea_proposed',
      entityType: 'idea',
      entityId: 'idea-1',
      entityTitle: 'Nouvelle initiative',
      scoreImpact: 10,
    });
    expect(notifyNewIdeaMock).toHaveBeenCalledWith({
      title: 'Nouvelle initiative',
      proposedBy: 'Jean Dupont',
    });
    expect(emailNotifyNewIdeaMock).toHaveBeenCalledWith(created);
  });

  it('createIdea retourne BadRequestException quand la validation échoue', async () => {
    await expect(service.createIdea({ title: 'x' })).rejects.toThrow(BadRequestException);
  });

  it('createIdea retourne BadRequestException quand storage renvoie success=false', async () => {
    storage.instance.createIdea.mockResolvedValue({ success: false, error: new Error('create failed') });

    await expect(
      service.createIdea({
        title: 'Titre valide',
        proposedBy: 'Jean Dupont',
        proposedByEmail: 'jean@example.com',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('createIdea ne bloque pas si la notification échoue', async () => {
    const created = makeIdea();
    storage.instance.createIdea.mockResolvedValue({ success: true, data: created });
    notifyNewIdeaMock.mockRejectedValue(new Error('notif down'));

    const result = await service.createIdea({
      title: 'Titre valide',
      proposedBy: 'Jean Dupont',
      proposedByEmail: 'jean@example.com',
    });

    expect(result).toEqual(created);
    expect(loggerWarnMock).toHaveBeenCalledWith('Idea notification failed', expect.objectContaining({ ideaId: created.id }));
  });

  it('deleteIdea lève NotFoundException sur erreur NotFoundError', async () => {
    const err = new Error('idea not found');
    err.name = 'NotFoundError';
    storage.instance.deleteIdea.mockResolvedValue({ success: false, error: err });

    await expect(service.deleteIdea('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('deleteIdea lève BadRequestException sur erreur générique', async () => {
    storage.instance.deleteIdea.mockResolvedValue({ success: false, error: new Error('delete failed') });

    await expect(service.deleteIdea('idea-1')).rejects.toThrow(BadRequestException);
  });

  it('updateIdeaStatus met à jour et notifie en succès', async () => {
    storage.instance.updateIdeaStatus.mockResolvedValue({ success: true });

    await service.updateIdeaStatus('idea-1', 'approved');

    expect(storage.instance.updateIdeaStatus).toHaveBeenCalledWith('idea-1', 'approved');
    expect(notifyIdeaStatusChangeMock).toHaveBeenCalledWith({
      title: 'Idée idea-1',
      status: 'approved',
      proposedBy: 'Utilisateur',
    });
  });

  it('updateIdeaStatus lève NotFoundException quand idée absente', async () => {
    const err = new Error('not found');
    err.name = 'NotFoundError';
    storage.instance.updateIdeaStatus.mockResolvedValue({ success: false, error: err });

    await expect(service.updateIdeaStatus('missing', 'approved')).rejects.toThrow(NotFoundException);
  });

  it('updateIdeaStatus lève BadRequestException sur statut invalide', async () => {
    await expect(service.updateIdeaStatus('idea-1', 'wrong_status')).rejects.toThrow(BadRequestException);
  });

  it('updateIdeaStatus log un warning si la notification échoue', async () => {
    storage.instance.updateIdeaStatus.mockResolvedValue({ success: true });
    notifyIdeaStatusChangeMock.mockRejectedValue(new Error('push failed'));

    await service.updateIdeaStatus('idea-1', 'approved');

    expect(loggerWarnMock).toHaveBeenCalledWith(
      'Idea status change notification failed',
      expect.objectContaining({ ideaId: 'idea-1' }),
    );
  });

  it('getVotesByIdea retourne les votes en succès', async () => {
    const votes = [makeVote(), makeVote({ id: 'vote-2' })];
    storage.instance.getVotesByIdea.mockResolvedValue({ success: true, data: votes });

    const result = await service.getVotesByIdea('idea-1');

    expect(result).toEqual(votes);
  });

  it('getVotesByIdea lève BadRequestException en erreur storage', async () => {
    storage.instance.getVotesByIdea.mockResolvedValue({ success: false, error: new Error('votes failed') });

    await expect(service.getVotesByIdea('idea-1')).rejects.toThrow(BadRequestException);
  });

  it('createVote lève BadRequestException si utilisateur a déjà voté', async () => {
    storage.instance.hasUserVoted.mockResolvedValue(true);

    await expect(
      service.createVote({
        ideaId: '123e4567-e89b-12d3-a456-426614174000',
        voterName: 'Marie Martin',
        voterEmail: 'marie@example.com',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(storage.instance.createVote).not.toHaveBeenCalled();
  });

  it('createVote crée le vote et tracke avec titre de l\'idée', async () => {
    const vote = makeVote();
    storage.instance.hasUserVoted.mockResolvedValue(false);
    storage.instance.createVote.mockResolvedValue({ success: true, data: vote });
    storage.instance.getIdea.mockResolvedValue({ success: true, data: makeIdea({ id: vote.ideaId, title: 'Titre idée vote' }) });

    const result = await service.createVote({
      ideaId: vote.ideaId,
      voterName: vote.voterName,
      voterEmail: vote.voterEmail,
    });

    expect(result).toEqual(vote);
    expect(storage.instance.trackMemberActivity).toHaveBeenCalledWith({
      memberEmail: vote.voterEmail,
      activityType: 'vote_cast',
      entityType: 'vote',
      entityId: vote.id,
      entityTitle: 'Titre idée vote',
      scoreImpact: 2,
    });
  });

  it('createVote fallback sur "Idée" si getIdea échoue', async () => {
    const vote = makeVote({ id: 'vote-fallback' });
    storage.instance.hasUserVoted.mockResolvedValue(false);
    storage.instance.createVote.mockResolvedValue({ success: true, data: vote });
    storage.instance.getIdea.mockResolvedValue({ success: false, error: new Error('missing idea') });

    await service.createVote({
      ideaId: vote.ideaId,
      voterName: vote.voterName,
      voterEmail: vote.voterEmail,
    });

    expect(storage.instance.trackMemberActivity).toHaveBeenCalledWith(
      expect.objectContaining({ entityTitle: 'Idée' }),
    );
  });

  it('createVote lève BadRequestException sur payload invalide', async () => {
    await expect(
      service.createVote({ ideaId: 'invalid-id', voterName: 'A', voterEmail: 'not-an-email' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('getIdeasStats retourne les stats agrégées', async () => {
    dbSelectMock
      .mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([{ total: 8, pending: 3, approved: 4, rejected: 1 }]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([{ count: 12 }]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    ...makeIdea({ id: 'idea-top', title: 'Top idée' }),
                    voteCount: 5,
                  },
                ]),
              }),
            }),
          }),
        }),
      }));

    const result = await service.getIdeasStats();

    expect(result).toEqual({
      total: 8,
      pending: 3,
      approved: 4,
      rejected: 1,
      totalVotes: 12,
      topIdeas: [
        expect.objectContaining({
          id: 'idea-top',
          title: 'Top idée',
          voteCount: 5,
        }),
      ],
    });
  });

  it('getIdeasStats lève BadRequestException si la requête échoue', async () => {
    dbSelectMock.mockImplementation(() => {
      throw new Error('db unavailable');
    });

    await expect(service.getIdeasStats()).rejects.toThrow(BadRequestException);
    expect(loggerErrorMock).toHaveBeenCalledWith('Failed to get ideas stats', expect.any(Object));
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { DrizzleDb } from '../database/types';
import { TaskReminderService } from './task-reminder.service';
import { EmailService } from '../email/email.service';

type ReminderTaskRow = {
  id: string;
  memberEmail: string;
  memberFirstName: string | null;
  memberLastName: string | null;
  title: string;
  taskType: string;
  dueDate: Date | null;
  assignedTo: string | null;
};

type AdminRow = {
  email: string;
  notificationEmail: string | null;
};

type TriggerDbContext = {
  db: DrizzleDb;
  selectMock: ReturnType<typeof vi.fn>;
};

function createTriggerDbMock(params: {
  dueTasksResult: ReminderTaskRow[] | Error;
  adminRowsResult?: AdminRow[] | Error;
}): TriggerDbContext {
  const dueWhereMock = vi.fn();
  if (params.dueTasksResult instanceof Error) {
    dueWhereMock.mockRejectedValue(params.dueTasksResult);
  } else {
    dueWhereMock.mockResolvedValue(params.dueTasksResult);
  }

  const dueLeftJoinMock = vi.fn().mockReturnValue({ where: dueWhereMock });
  const dueFromMock = vi.fn().mockReturnValue({ leftJoin: dueLeftJoinMock });
  const dueSelectChain = { from: dueFromMock };

  const adminWhereMock = vi.fn();
  if (params.adminRowsResult instanceof Error) {
    adminWhereMock.mockRejectedValue(params.adminRowsResult);
  } else {
    adminWhereMock.mockResolvedValue(params.adminRowsResult ?? []);
  }

  const adminFromMock = vi.fn().mockReturnValue({ where: adminWhereMock });
  const adminSelectChain = { from: adminFromMock };

  const selectMock = vi.fn();
  selectMock.mockReturnValueOnce(dueSelectChain);
  selectMock.mockReturnValue(adminSelectChain);

  const db = {
    select: selectMock,
  } as unknown as DrizzleDb;

  return { db, selectMock };
}

describe('TaskReminderService', () => {
  let emailServiceMock: Pick<EmailService, 'sendMail'>;
  let configServiceMock: Pick<ConfigService, 'get'>;

  beforeEach(() => {
    emailServiceMock = {
      sendMail: vi.fn().mockResolvedValue(undefined),
    };

    configServiceMock = {
      get: vi.fn().mockReturnValue('https://komuno.example'),
    };
  });

  it('sendDailyReminders délègue à triggerManually', async () => {
    const dbContext = createTriggerDbMock({ dueTasksResult: [] });
    const service = new TaskReminderService(
      dbContext.db,
      emailServiceMock as EmailService,
      configServiceMock as ConfigService,
    );

    const triggerSpy = vi
      .spyOn(service, 'triggerManually')
      .mockResolvedValue({ tasksFound: 0 });

    await service.sendDailyReminders();

    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  it('retourne 0 si la requête des tâches dues échoue (erreur DB)', async () => {
    const dbContext = createTriggerDbMock({
      dueTasksResult: new Error('db unavailable'),
    });

    const service = new TaskReminderService(
      dbContext.db,
      emailServiceMock as EmailService,
      configServiceMock as ConfigService,
    );

    const result = await service.triggerManually();

    expect(result).toEqual({ tasksFound: 0 });
    expect(emailServiceMock.sendMail).not.toHaveBeenCalled();
  });

  it('retourne 0 et n’envoie aucun email quand aucune tâche n’est due', async () => {
    const dbContext = createTriggerDbMock({ dueTasksResult: [] });

    const service = new TaskReminderService(
      dbContext.db,
      emailServiceMock as EmailService,
      configServiceMock as ConfigService,
    );

    const result = await service.triggerManually();

    expect(result).toEqual({ tasksFound: 0 });
    expect(emailServiceMock.sendMail).not.toHaveBeenCalled();
    expect(dbContext.selectMock).toHaveBeenCalledTimes(1);
  });

  it('groupe les tâches par email de notification admin et ignore les tâches sans assigné', async () => {
    const today = new Date();
    const dueTasks: ReminderTaskRow[] = [
      {
        id: 't1',
        memberEmail: 'member-one@example.com',
        memberFirstName: 'Alice',
        memberLastName: 'Martin',
        title: 'Appeler le membre',
        taskType: 'call',
        dueDate: today,
        assignedTo: 'admin-one@example.com',
      },
      {
        id: 't2',
        memberEmail: 'member-two@example.com',
        memberFirstName: null,
        memberLastName: null,
        title: 'Relance personnalisée',
        taskType: 'custom',
        dueDate: today,
        assignedTo: 'admin-one@example.com',
      },
      {
        id: 't3',
        memberEmail: 'member-three@example.com',
        memberFirstName: 'Bruno',
        memberLastName: 'Durand',
        title: 'Type non mappé',
        taskType: 'other_type',
        dueDate: today,
        assignedTo: 'admin-two@example.com',
      },
      {
        id: 't4',
        memberEmail: 'member-four@example.com',
        memberFirstName: 'Clara',
        memberLastName: 'Petit',
        title: 'Sans assigné',
        taskType: 'email',
        dueDate: today,
        assignedTo: null,
      },
    ];

    const adminRows: AdminRow[] = [
      {
        email: 'admin-one@example.com',
        notificationEmail: 'notifications-team@example.com',
      },
      {
        email: 'admin-two@example.com',
        notificationEmail: null,
      },
    ];

    const dbContext = createTriggerDbMock({
      dueTasksResult: dueTasks,
      adminRowsResult: adminRows,
    });

    const service = new TaskReminderService(
      dbContext.db,
      emailServiceMock as EmailService,
      configServiceMock as ConfigService,
    );

    const result = await service.triggerManually();

    expect(result).toEqual({ tasksFound: 4 });
    expect(emailServiceMock.sendMail).toHaveBeenCalledTimes(2);

    const sendCalls = vi.mocked(emailServiceMock.sendMail).mock.calls;
    expect(sendCalls[0][0].to).toBe('notifications-team@example.com');
    expect(sendCalls[0][0].subject).toContain('2 tâche(s)');
    expect(sendCalls[0][0].html).toContain('Alice Martin');
    expect(sendCalls[0][0].html).toContain('member-two@example.com');
    expect(sendCalls[0][0].html).toContain('Appel');
    expect(sendCalls[0][0].html).toContain('Personnalisé');
    expect(sendCalls[0][0].html).toContain('https://komuno.example/admin/members/tasks');

    expect(sendCalls[1][0].to).toBe('admin-two@example.com');
    expect(sendCalls[1][0].subject).toContain('1 tâche(s)');
    expect(sendCalls[1][0].html).toContain('other_type');

    const allPayloads = sendCalls.map(call => call[0].html).join('\n');
    expect(allPayloads).not.toContain('Sans assigné');
  });

  it('continue les envois si un email échoue (erreur mock email)', async () => {
    const dueTasks: ReminderTaskRow[] = [
      {
        id: 'a1',
        memberEmail: 'm1@example.com',
        memberFirstName: 'Nina',
        memberLastName: 'Roux',
        title: 'Task A',
        taskType: 'email',
        dueDate: new Date(),
        assignedTo: 'admin-a@example.com',
      },
      {
        id: 'b1',
        memberEmail: 'm2@example.com',
        memberFirstName: 'Leo',
        memberLastName: 'Nadal',
        title: 'Task B',
        taskType: 'meeting',
        dueDate: new Date(),
        assignedTo: 'admin-b@example.com',
      },
    ];

    const dbContext = createTriggerDbMock({
      dueTasksResult: dueTasks,
      adminRowsResult: [
        { email: 'admin-a@example.com', notificationEmail: null },
        { email: 'admin-b@example.com', notificationEmail: null },
      ],
    });

    vi.mocked(emailServiceMock.sendMail)
      .mockRejectedValueOnce(new Error('smtp failure'))
      .mockResolvedValueOnce(undefined);

    const service = new TaskReminderService(
      dbContext.db,
      emailServiceMock as EmailService,
      configServiceMock as ConfigService,
    );

    const result = await service.triggerManually();

    expect(result).toEqual({ tasksFound: 2 });
    expect(emailServiceMock.sendMail).toHaveBeenCalledTimes(2);
  });

  it('propage une erreur si la résolution des admins échoue (erreur DB mock)', async () => {
    const dueTasks: ReminderTaskRow[] = [
      {
        id: 't1',
        memberEmail: 'member@example.com',
        memberFirstName: 'Iris',
        memberLastName: 'Noir',
        title: 'Task',
        taskType: 'email',
        dueDate: new Date(),
        assignedTo: 'admin@example.com',
      },
    ];

    const dbContext = createTriggerDbMock({
      dueTasksResult: dueTasks,
      adminRowsResult: new Error('admin select failed'),
    });

    const service = new TaskReminderService(
      dbContext.db,
      emailServiceMock as EmailService,
      configServiceMock as ConfigService,
    );

    await expect(service.triggerManually()).rejects.toThrow('admin select failed');
    expect(emailServiceMock.sendMail).not.toHaveBeenCalled();
  });

  it('utilise l’URL par défaut si APP_URL est absente', async () => {
    configServiceMock.get = vi.fn().mockReturnValue(undefined);

    const dueTasks: ReminderTaskRow[] = [
      {
        id: 't1',
        memberEmail: 'member@example.com',
        memberFirstName: 'Iris',
        memberLastName: 'Noir',
        title: 'Task',
        taskType: 'call',
        dueDate: new Date(),
        assignedTo: 'admin@example.com',
      },
    ];

    const dbContext = createTriggerDbMock({
      dueTasksResult: dueTasks,
      adminRowsResult: [
        { email: 'admin@example.com', notificationEmail: null },
      ],
    });

    const service = new TaskReminderService(
      dbContext.db,
      emailServiceMock as EmailService,
      configServiceMock as ConfigService,
    );

    await service.triggerManually();

    expect(emailServiceMock.sendMail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(emailServiceMock.sendMail).mock.calls[0][0].html).toContain(
      'https://repicardie.fr/admin/members/tasks',
    );
  });
});

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, inArray, lte, isNotNull } from 'drizzle-orm';
import { DATABASE } from '../database/database.providers';
import type { DrizzleDb } from '../database/types';
import { memberTasks, members } from '../../../../shared/schema';
import { EmailService } from '../email/email.service';

interface TaskRow {
  id: string;
  memberEmail: string;
  memberFirstName: string | null;
  memberLastName: string | null;
  title: string;
  taskType: string;
  dueDate: Date | null;
  assignedTo: string | null;
}

interface GroupedTask {
  email: string;
  tasks: TaskRow[];
}

@Injectable()
export class TaskReminderService {
  private readonly logger = new Logger(TaskReminderService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDb,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Cron quotidien à 8h00 — envoie les rappels de tâches dues aux admins assignés
   */
  @Cron('0 8 * * *')
  async sendDailyReminders(): Promise<void> {
    this.logger.log('Démarrage du rappel quotidien des tâches dues');
    await this.triggerManually();
  }

  /**
   * Point d'entrée commun pour le cron et le déclenchement manuel
   */
  async triggerManually(): Promise<{ tasksFound: number }> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let dueTasks: TaskRow[];

    try {
      const rows = await this.db
        .select({
          id: memberTasks.id,
          memberEmail: memberTasks.memberEmail,
          memberFirstName: members.firstName,
          memberLastName: members.lastName,
          title: memberTasks.title,
          taskType: memberTasks.taskType,
          dueDate: memberTasks.dueDate,
          assignedTo: memberTasks.assignedTo,
        })
        .from(memberTasks)
        .leftJoin(members, eq(memberTasks.memberEmail, members.email))
        .where(
          and(
            inArray(memberTasks.status, ['todo', 'in_progress']),
            isNotNull(memberTasks.dueDate),
            lte(memberTasks.dueDate, today),
          ),
        );

      dueTasks = rows as TaskRow[];
    } catch (err) {
      this.logger.error('Erreur lors de la récupération des tâches dues', err);
      return { tasksFound: 0 };
    }

    if (dueTasks.length === 0) {
      this.logger.log('Aucune tâche due trouvée — aucun email envoyé');
      return { tasksFound: 0 };
    }

    this.logger.log(`${dueTasks.length} tâche(s) due(s) trouvée(s)`);

    // Grouper les tâches par assignedTo (email admin responsable)
    const grouped = new Map<string, TaskRow[]>();

    for (const task of dueTasks) {
      const recipient = task.assignedTo;
      if (!recipient) {
        // Tâche sans responsable assigné — ignorée pour l'envoi email
        continue;
      }
      const existing = grouped.get(recipient) ?? [];
      existing.push(task);
      grouped.set(recipient, existing);
    }

    const groups: GroupedTask[] = Array.from(grouped.entries()).map(([email, tasks]) => ({
      email,
      tasks,
    }));

    let emailsSent = 0;

    for (const group of groups) {
      try {
        await this.sendReminderEmail(group);
        emailsSent++;
      } catch (err) {
        this.logger.error(`Erreur envoi email à ${group.email}`, err);
      }
    }

    this.logger.log(`Rappels envoyés: ${emailsSent} email(s) pour ${dueTasks.length} tâche(s)`);
    return { tasksFound: dueTasks.length };
  }

  private async sendReminderEmail(group: GroupedTask): Promise<void> {
    const { email, tasks } = group;
    const count = tasks.length;

    const typeLabels: Record<string, string> = {
      call: 'Appel',
      email: 'Email',
      meeting: 'Réunion',
      custom: 'Personnalisé',
    };

    const rows = tasks
      .map((task) => {
        const memberName =
          task.memberFirstName && task.memberLastName
            ? `${task.memberFirstName} ${task.memberLastName}`
            : task.memberEmail;

        const dueLabel = task.dueDate
          ? new Date(task.dueDate).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '—';

        const typeLabel = typeLabels[task.taskType] ?? task.taskType;

        return `<tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${memberName}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${task.title}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${typeLabel}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${dueLabel}</td>
        </tr>`;
      })
      .join('\n');

    const html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e40af;">Rappel de tâches — Komuno CJD80</h2>
  <p>Bonjour,</p>
  <p>Vous avez <strong>${count} tâche(s)</strong> en attente :</p>
  <table style="width:100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #f1f5f9;">
        <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Membre</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Tâche</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Type</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Échéance</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p style="margin-top: 20px;">
    <a href="https://cjd80.fr/admin/members/tasks" style="background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
      Voir mes tâches →
    </a>
  </p>
</div>`;

    await this.emailService.sendMail({
      to: email,
      subject: `[Komuno CJD80] ${count} tâche(s) en attente`,
      html,
    });
  }
}

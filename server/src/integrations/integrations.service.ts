import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import { AuditService } from '../audit/audit.service';
import {
  INTEGRATION_AUTH_TYPE,
  INTEGRATION_PROVIDER,
  INTEGRATION_STATUS,
  INTEGRATION_SYNC_STATUS,
  INTEGRATION_WEBHOOK_STATUS,
  insertIntegrationAccountSchema,
  insertIntegrationWebhookEventSchema,
  integrationAccounts,
  integrationSyncRuns,
  integrationWebhookEvents,
  updateIntegrationAccountSchema,
  type IntegrationAccount,
} from '../../../shared/schema';
import {
  encryptIntegrationSecret,
  integrationSecretFingerprint,
  sanitizeIntegrationSettings,
  withoutIntegrationSecret,
} from './integrations.utils';

const accountInputSchema = insertIntegrationAccountSchema.extend({
  secret: z.string().min(8).max(5000).optional(),
});

const accountUpdateInputSchema = updateIntegrationAccountSchema.extend({
  secret: z.string().min(8).max(5000).optional().nullable(),
});

const providerSchema = z.enum([
  INTEGRATION_PROVIDER.HELLOASSO,
  INTEGRATION_PROVIDER.STRIPE,
  INTEGRATION_PROVIDER.BREVO,
  INTEGRATION_PROVIDER.GOOGLE_CALENDAR,
  INTEGRATION_PROVIDER.MICROSOFT_CALENDAR,
  INTEGRATION_PROVIDER.ICS,
  INTEGRATION_PROVIDER.WEBHOOK,
]);

type AccountInput = z.infer<typeof accountInputSchema>;
type AccountUpdateInput = z.infer<typeof accountUpdateInputSchema>;

@Injectable()
export class IntegrationsService {
  constructor(private readonly auditService?: AuditService) {}

  private audit(input: Parameters<AuditService['record']>[0]) {
    void this.auditService?.record(input);
  }

  private handleZodError(error: unknown): never {
    if (error instanceof ZodError) throw new BadRequestException(fromZodError(error).toString());
    throw error;
  }

  private safeAccount(account: IntegrationAccount) {
    return withoutIntegrationSecret(account);
  }

  private secretPatch(secret: string | null | undefined) {
    if (!secret) return {};
    const encrypted = encryptIntegrationSecret(secret);
    if (!encrypted) throw new BadRequestException('Clé de chiffrement des intégrations indisponible');
    return {
      secretFingerprint: integrationSecretFingerprint(secret),
      secretEncrypted: true,
      secretEncryptedPayload: encrypted.encrypted,
      secretEncryptionKeyId: encrypted.keyId,
      secretEncryptedAt: new Date(),
    };
  }

  private async getAccountOrThrow(id: string) {
    const [account] = await db.select().from(integrationAccounts).where(eq(integrationAccounts.id, id)).limit(1);
    if (!account) throw new NotFoundException('Compte d’intégration introuvable');
    return account;
  }

  getProviderCatalog() {
    return {
      success: true,
      data: [
        {
          provider: INTEGRATION_PROVIDER.HELLOASSO,
          label: 'HelloAsso',
          priority: 'P1',
          authType: INTEGRATION_AUTH_TYPE.OAUTH,
          capabilities: ['checkout', 'orders', 'payments', 'memberships', 'webhooks'],
          recommended: true,
        },
        {
          provider: INTEGRATION_PROVIDER.ICS,
          label: 'Calendrier ICS',
          priority: 'P1',
          authType: INTEGRATION_AUTH_TYPE.NONE,
          capabilities: ['events_calendar_feed', 'event_ics_download'],
          recommended: true,
        },
        {
          provider: INTEGRATION_PROVIDER.BREVO,
          label: 'Brevo',
          priority: 'P1',
          authType: INTEGRATION_AUTH_TYPE.API_KEY,
          capabilities: ['transactional_email', 'sms', 'whatsapp', 'webhooks'],
          recommended: true,
        },
        {
          provider: INTEGRATION_PROVIDER.STRIPE,
          label: 'Stripe',
          priority: 'P2',
          authType: INTEGRATION_AUTH_TYPE.API_KEY,
          capabilities: ['checkout', 'subscriptions', 'invoices', 'webhooks'],
          recommended: false,
        },
        {
          provider: INTEGRATION_PROVIDER.GOOGLE_CALENDAR,
          label: 'Google Calendar',
          priority: 'P2',
          authType: INTEGRATION_AUTH_TYPE.OAUTH,
          capabilities: ['calendar_sync', 'attendees'],
          recommended: false,
        },
        {
          provider: INTEGRATION_PROVIDER.WEBHOOK,
          label: 'Webhooks sortants',
          priority: 'P2',
          authType: INTEGRATION_AUTH_TYPE.WEBHOOK_SECRET,
          capabilities: ['outbound_events', 'automation'],
          recommended: false,
        },
      ],
    };
  }

  async listAccounts(options?: { provider?: string }) {
    const provider = options?.provider ? providerSchema.parse(options.provider) : undefined;
    const accounts = await db.select().from(integrationAccounts)
      .where(provider ? eq(integrationAccounts.provider, provider) : undefined)
      .orderBy(desc(integrationAccounts.createdAt));
    return { success: true, data: accounts.map((account) => this.safeAccount(account)) };
  }

  async createAccount(data: unknown, userEmail?: string) {
    try {
      const validated = accountInputSchema.parse(data) as AccountInput;
      const { secret, ...accountData } = validated;
      const secretPatch = this.secretPatch(secret);
      const [created] = await db.insert(integrationAccounts).values({
        ...accountData,
        settings: sanitizeIntegrationSettings(accountData.settings),
        status: accountData.enabled === false ? INTEGRATION_STATUS.DISABLED : accountData.status,
        ...secretPatch,
        createdBy: userEmail ?? null,
      }).returning();

      this.audit({
        actorEmail: userEmail ?? null,
        action: 'integrations.account.create',
        entityType: 'integration_account',
        entityId: created.id,
        organizationId: created.organizationId,
        metadata: { provider: created.provider, status: created.status, hasSecret: Boolean(secret) },
      });
      return { success: true, data: this.safeAccount(created) };
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Un compte existe déjà pour cette intégration et cette organisation');
      return this.handleZodError(error);
    }
  }

  async updateAccount(id: string, data: unknown, userEmail?: string) {
    try {
      await this.getAccountOrThrow(id);
      const validated = accountUpdateInputSchema.parse(data) as AccountUpdateInput;
      const { secret, ...patchData } = validated;
      const patch: Record<string, unknown> = { updatedAt: sql`NOW()` };
      for (const [key, value] of Object.entries(patchData)) {
        if (value !== undefined) patch[key] = key === 'settings' ? sanitizeIntegrationSettings(value as Record<string, unknown>) : value;
      }
      if (secret) Object.assign(patch, this.secretPatch(secret));

      const [updated] = await db.update(integrationAccounts).set(patch).where(eq(integrationAccounts.id, id)).returning();
      this.audit({
        actorEmail: userEmail ?? null,
        action: 'integrations.account.update',
        entityType: 'integration_account',
        entityId: updated.id,
        organizationId: updated.organizationId,
        metadata: { provider: updated.provider, changedFields: Object.keys(validated), rotatedSecret: Boolean(secret) },
      });
      return { success: true, data: this.safeAccount(updated) };
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Un compte existe déjà pour cette intégration et cette organisation');
      return this.handleZodError(error);
    }
  }

  async deleteAccount(id: string, userEmail?: string) {
    const account = await this.getAccountOrThrow(id);
    await db.delete(integrationAccounts).where(eq(integrationAccounts.id, id));
    this.audit({
      actorEmail: userEmail ?? null,
      action: 'integrations.account.delete',
      entityType: 'integration_account',
      entityId: id,
      organizationId: account.organizationId,
      metadata: { provider: account.provider, label: account.label },
    });
    return { success: true, data: { id, deleted: true } };
  }

  async createSyncRun(input: {
    accountId?: string | null;
    provider: string;
    operation: string;
    status?: string;
    metadata?: Record<string, unknown>;
    error?: string | null;
  }) {
    const provider = providerSchema.parse(input.provider);
    const [run] = await db.insert(integrationSyncRuns).values({
      accountId: input.accountId ?? null,
      provider,
      operation: input.operation,
      status: input.status ?? INTEGRATION_SYNC_STATUS.PENDING,
      metadata: input.metadata ?? {},
      error: input.error ?? null,
      finishedAt: input.status && input.status !== INTEGRATION_SYNC_STATUS.RUNNING ? new Date() : null,
    }).returning();
    return run;
  }

  async listSyncRuns(options?: { accountId?: string; provider?: string }) {
    const conditions = [] as any[];
    if (options?.accountId) conditions.push(eq(integrationSyncRuns.accountId, options.accountId));
    if (options?.provider) conditions.push(eq(integrationSyncRuns.provider, providerSchema.parse(options.provider)));
    const runs = await db.select().from(integrationSyncRuns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(integrationSyncRuns.startedAt))
      .limit(100);
    return { success: true, data: runs };
  }

  async testAccount(id: string, userEmail?: string) {
    const account = await this.getAccountOrThrow(id);
    const hasSecret = Boolean(account.secretEncryptedPayload);
    const status = account.enabled && (hasSecret || account.authType === INTEGRATION_AUTH_TYPE.NONE)
      ? INTEGRATION_SYNC_STATUS.SUCCESS
      : INTEGRATION_SYNC_STATUS.PARTIAL;
    const error = status === INTEGRATION_SYNC_STATUS.PARTIAL ? 'configuration_incomplete_or_missing_secret' : null;
    const run = await this.createSyncRun({
      accountId: account.id,
      provider: account.provider,
      operation: 'connection_test',
      status,
      error,
      metadata: { authType: account.authType, hasSecret, enabled: account.enabled },
    });

    await db.update(integrationAccounts).set({
      status: status === INTEGRATION_SYNC_STATUS.SUCCESS ? INTEGRATION_STATUS.CONNECTED : INTEGRATION_STATUS.ERROR,
      lastError: error,
      lastSyncAt: new Date(),
      updatedAt: sql`NOW()`,
    }).where(eq(integrationAccounts.id, account.id));

    this.audit({
      actorEmail: userEmail ?? null,
      action: 'integrations.account.test',
      entityType: 'integration_account',
      entityId: account.id,
      organizationId: account.organizationId,
      metadata: { provider: account.provider, status, error },
    });
    return { success: true, data: run };
  }

  async recordWebhook(providerInput: string, payload: unknown, headers: Record<string, unknown> = {}) {
    let provider: z.infer<typeof providerSchema> | null = null;
    let externalEventId = '';
    try {
      provider = providerSchema.parse(providerInput);
      const payloadRecord = typeof payload === 'object' && payload !== null && !Array.isArray(payload) ? payload as Record<string, unknown> : { value: payload };
      externalEventId = String(
      payloadRecord.id
      ?? payloadRecord.eventId
      ?? payloadRecord.event_id
      ?? headers['x-event-id']
      ?? createHash('sha256').update(JSON.stringify(payloadRecord)).digest('hex'),
    );
      const eventType = String(payloadRecord.eventType ?? payloadRecord.event_type ?? payloadRecord.type ?? 'unknown');
      const payloadHash = createHash('sha256').update(JSON.stringify(payloadRecord)).digest('hex');

      const validated = insertIntegrationWebhookEventSchema.parse({
        provider,
        externalEventId,
        eventType,
        payloadHash,
        payload: payloadRecord,
        status: INTEGRATION_WEBHOOK_STATUS.RECEIVED,
      });
      const [created] = await db.insert(integrationWebhookEvents).values(validated).returning();
      return { success: true, data: { id: created.id, status: created.status, duplicate: false } };
    } catch (error) {
      if ((error as any)?.code === '23505' && provider && externalEventId) {
        const [existing] = await db.select().from(integrationWebhookEvents)
          .where(and(eq(integrationWebhookEvents.provider, provider), eq(integrationWebhookEvents.externalEventId, externalEventId)))
          .limit(1);
        return { success: true, data: { id: existing?.id ?? null, status: existing?.status ?? 'duplicate', duplicate: true } };
      }
      return this.handleZodError(error);
    }
  }
}

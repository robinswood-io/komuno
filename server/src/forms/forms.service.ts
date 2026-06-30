import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import { AuditService } from '../audit/audit.service';
import { IntegrationsService } from '../integrations/integrations.service';
import {
  SURVEY_FORM_STATUS,
  insertSurveyFormSchema,
  submitSurveyResponseSchema,
  surveyForms,
  surveyQuestions,
  surveyResponses,
  updateSurveyFormSchema,
  type SurveyQuestion,
  type SurveyResponse,
} from '../../../shared/schema';
import {
  assertSurveyQuestionsCanBeSaved,
  buildSurveyFormSnapshot,
  csvEscapeSurveyValue,
  formatSurveyAnswerForDisplay,
  isSurveyFormExpired,
  normalizeSurveyDate,
  normalizeSurveyFormPayload,
  normalizeSurveyOptions,
  questionCatalogWithSnapshots,
  resolveUniqueSurveySlug,
  slugifySurveyValue,
  snapshotSurveyQuestions,
  summarizeSurveyQuestion,
  validateSurveyAnswer,
  type AnswerMap,
  type QuestionOption,
  type SurveyQuestionInput,
  type SurveyQuestionSnapshot,
} from './forms.utils';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    private readonly auditService?: AuditService,
    private readonly integrationsService?: IntegrationsService,
  ) {}

  private emitOutboundEventBestEffort(eventType: string, data: Record<string, unknown>) {
    void this.integrationsService?.emitOutboundEvent(eventType, data).catch((error) => {
      this.logger.warn(`Outbound webhook emission failed for ${eventType}: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  private audit(input: Parameters<AuditService['record']>[0]) {
    void this.auditService?.record(input);
  }

  private handleZodError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(fromZodError(error).toString());
    }
    throw error;
  }

  private slugify(value: string): string {
    return slugifySurveyValue(value);
  }

  private normalizeOptions(options: unknown): QuestionOption[] {
    return normalizeSurveyOptions(options);
  }

  private assertQuestionsCanBeSaved(status: string | undefined, questions: SurveyQuestionInput[] | undefined) {
    return assertSurveyQuestionsCanBeSaved(status, questions);
  }

  private questionValues(formId: string, questions: SurveyQuestionInput[]) {
    return questions.map((question, index) => ({
      ...(question.id ? { id: question.id } : {}),
      formId,
      label: question.label,
      description: question.description ?? null,
      type: question.type,
      required: question.required,
      options: this.normalizeOptions(question.options),
      validation: question.validation ?? {},
      orderIndex: question.orderIndex ?? index,
    }));
  }

  private async ensureUniqueSlug(baseSlug: string, currentFormId?: string): Promise<string> {
    return await resolveUniqueSurveySlug(baseSlug, async (candidate) => {
      const [existing] = await db.select({ id: surveyForms.id }).from(surveyForms).where(eq(surveyForms.slug, candidate)).limit(1);
      return Boolean(existing && existing.id !== currentFormId);
    });
  }

  private async getFormOrThrow(id: string) {
    const [form] = await db.select().from(surveyForms).where(eq(surveyForms.id, id)).limit(1);
    if (!form) throw new NotFoundException('Formulaire introuvable');
    return form;
  }

  private async getQuestions(formId: string) {
    return await db.select().from(surveyQuestions).where(eq(surveyQuestions.formId, formId)).orderBy(asc(surveyQuestions.orderIndex), asc(surveyQuestions.createdAt));
  }

  private normalizeDate(value: string | Date | null | undefined): Date | null {
    return normalizeSurveyDate(value);
  }

  private isExpired(form: Pick<typeof surveyForms.$inferSelect, 'expiresAt'>): boolean {
    return isSurveyFormExpired(form);
  }

  private snapshotQuestions(questions: SurveyQuestion[]): SurveyQuestionSnapshot[] {
    return snapshotSurveyQuestions(questions);
  }

  private buildFormSnapshot(form: Pick<typeof surveyForms.$inferSelect, 'id' | 'slug' | 'title' | 'version'>, questions: SurveyQuestion[]) {
    return buildSurveyFormSnapshot(form, questions);
  }

  private questionCatalog(currentQuestions: SurveyQuestion[], responses: SurveyResponse[] = []): SurveyQuestion[] {
    return questionCatalogWithSnapshots(currentQuestions, responses);
  }

  private formatAnswerForDisplay(question: SurveyQuestion, value: unknown): unknown {
    return formatSurveyAnswerForDisplay(question, value);
  }

  async listForms(options?: { status?: string }) {
    const conditions = [] as any[];
    if (options?.status && options.status !== 'all') conditions.push(eq(surveyForms.status, options.status));

    const forms = await db.select().from(surveyForms)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(surveyForms.createdAt));

    const data = await Promise.all(forms.map(async (form) => {
      const [responsesCount] = await db.select({ count: sql<number>`count(*)::int` })
        .from(surveyResponses)
        .where(eq(surveyResponses.formId, form.id));
      const [questionsCount] = await db.select({ count: sql<number>`count(*)::int` })
        .from(surveyQuestions)
        .where(eq(surveyQuestions.formId, form.id));
      return {
        ...form,
        responseCount: responsesCount?.count ?? 0,
        questionCount: questionsCount?.count ?? 0,
        publicUrl: `/forms/${form.slug}`,
      };
    }));

    return { success: true, data };
  }

  async createForm(data: unknown, userEmail?: string) {
    try {
      const validated = insertSurveyFormSchema.parse(normalizeSurveyFormPayload(data));
      this.assertQuestionsCanBeSaved(validated.status, validated.questions);
      const slug = await this.ensureUniqueSlug(validated.slug ?? validated.title);
      const now = new Date();

      const created = await db.transaction(async (tx) => {
        const [form] = await tx.insert(surveyForms).values({
          slug,
          title: validated.title,
          description: validated.description ?? null,
          status: validated.status,
          organizationId: validated.organizationId ?? null,
          originOrganizationId: validated.originOrganizationId ?? null,
          sourceFormId: validated.sourceFormId ?? null,
          sourceInstanceUrl: validated.sourceInstanceUrl ?? null,
          federationVisibility: validated.federationVisibility ?? 'local',
          federationStatus: validated.federationStatus ?? 'local_only',
          isFederatedCopy: validated.isFederatedCopy ?? false,
          canonicalFormId: validated.canonicalFormId ?? null,
          collectRespondentInfo: validated.collectRespondentInfo,
          allowMultipleSubmissions: validated.allowMultipleSubmissions,
          successMessage: validated.successMessage ?? null,
          requireConsent: validated.requireConsent,
          consentText: validated.consentText ?? null,
          retentionDays: validated.retentionDays ?? null,
          expiresAt: this.normalizeDate(validated.expiresAt),
          createdBy: userEmail ?? null,
          publishedAt: validated.status === SURVEY_FORM_STATUS.PUBLISHED ? now : null,
          closedAt: validated.status === SURVEY_FORM_STATUS.CLOSED ? now : null,
        }).returning();

        if (validated.questions.length > 0) {
          await tx.insert(surveyQuestions).values(this.questionValues(form.id, validated.questions));
        }

        return form;
      });

      this.audit({
        actorEmail: userEmail ?? null,
        action: validated.status === SURVEY_FORM_STATUS.PUBLISHED ? 'forms.publish' : 'forms.create',
        entityType: 'survey_form',
        entityId: created.id,
        organizationId: created.organizationId,
        metadata: { status: created.status, questionCount: validated.questions.length, version: created.version },
      });
      return await this.getForm(created.id);
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Un formulaire avec ce slug existe déjà');
      return this.handleZodError(error);
    }
  }

  async getForm(id: string) {
    const form = await this.getFormOrThrow(id);
    const questions = await this.getQuestions(form.id);
    const [responsesCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(surveyResponses)
      .where(eq(surveyResponses.formId, form.id));

    return {
      success: true,
      data: {
        ...form,
        questions,
        responseCount: responsesCount?.count ?? 0,
        publicUrl: `/forms/${form.slug}`,
      },
    };
  }

  async updateForm(id: string, data: unknown, userEmail?: string) {
    try {
      const current = await this.getFormOrThrow(id);
      const validated = updateSurveyFormSchema.parse(normalizeSurveyFormPayload(data));
      if ((validated.status ?? current.status) === SURVEY_FORM_STATUS.PUBLISHED && validated.questions === undefined) {
        const existingQuestions = await this.getQuestions(id);
        if (existingQuestions.length === 0) {
          throw new BadRequestException('Un formulaire publié doit contenir au moins une question');
        }
        this.assertQuestionsCanBeSaved(SURVEY_FORM_STATUS.PUBLISHED, existingQuestions);
      }
      this.assertQuestionsCanBeSaved(validated.status ?? current.status, validated.questions);
      const patch: Record<string, unknown> = { updatedAt: sql`NOW()` };

      if (validated.title !== undefined) patch.title = validated.title;
      if (validated.description !== undefined) patch.description = validated.description ?? null;
      if (validated.organizationId !== undefined) patch.organizationId = validated.organizationId ?? null;
      if (validated.originOrganizationId !== undefined) patch.originOrganizationId = validated.originOrganizationId ?? null;
      if (validated.sourceFormId !== undefined) patch.sourceFormId = validated.sourceFormId ?? null;
      if (validated.sourceInstanceUrl !== undefined) patch.sourceInstanceUrl = validated.sourceInstanceUrl ?? null;
      if (validated.federationVisibility !== undefined) patch.federationVisibility = validated.federationVisibility;
      if (validated.federationStatus !== undefined) patch.federationStatus = validated.federationStatus;
      if (validated.isFederatedCopy !== undefined) patch.isFederatedCopy = validated.isFederatedCopy;
      if (validated.canonicalFormId !== undefined) patch.canonicalFormId = validated.canonicalFormId ?? null;
      if (validated.collectRespondentInfo !== undefined) patch.collectRespondentInfo = validated.collectRespondentInfo;
      if (validated.allowMultipleSubmissions !== undefined) patch.allowMultipleSubmissions = validated.allowMultipleSubmissions;
      if (validated.successMessage !== undefined) patch.successMessage = validated.successMessage ?? null;
      if (validated.requireConsent !== undefined) patch.requireConsent = validated.requireConsent;
      if (validated.consentText !== undefined) patch.consentText = validated.consentText ?? null;
      if (validated.retentionDays !== undefined) patch.retentionDays = validated.retentionDays ?? null;
      if (validated.expiresAt !== undefined) patch.expiresAt = this.normalizeDate(validated.expiresAt);
      if (validated.questions !== undefined) patch.version = sql`${surveyForms.version} + 1`;
      if (validated.slug !== undefined) patch.slug = await this.ensureUniqueSlug(validated.slug, id);
      if (validated.status !== undefined) {
        patch.status = validated.status;
        if (validated.status === SURVEY_FORM_STATUS.PUBLISHED && !current.publishedAt) patch.publishedAt = new Date();
        if (validated.status === SURVEY_FORM_STATUS.CLOSED && !current.closedAt) patch.closedAt = new Date();
      }

      await db.transaction(async (tx) => {
        await tx.update(surveyForms).set(patch).where(eq(surveyForms.id, id));
        if (validated.questions) {
          await tx.delete(surveyQuestions).where(eq(surveyQuestions.formId, id));
          if (validated.questions.length > 0) {
            await tx.insert(surveyQuestions).values(this.questionValues(id, validated.questions));
          }
        }
      });

      const updatedForm = await this.getForm(id);
      this.audit({
        actorEmail: userEmail ?? null,
        action: validated.status === SURVEY_FORM_STATUS.PUBLISHED ? 'forms.publish' : 'forms.update',
        entityType: 'survey_form',
        entityId: id,
        organizationId: updatedForm.data.organizationId,
        metadata: {
          changedFields: Object.keys(validated),
          status: updatedForm.data.status,
          version: updatedForm.data.version,
          questionCount: updatedForm.data.questions.length,
        },
      });
      return updatedForm;
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Un formulaire avec ce slug existe déjà');
      return this.handleZodError(error);
    }
  }

  async deleteForm(id: string, userEmail?: string) {
    const form = await this.getFormOrThrow(id);
    await db.delete(surveyForms).where(eq(surveyForms.id, form.id));
    this.audit({
      actorEmail: userEmail ?? null,
      action: 'forms.delete',
      entityType: 'survey_form',
      entityId: form.id,
      organizationId: form.organizationId,
      metadata: { title: form.title, slug: form.slug, status: form.status, version: form.version },
    });
    return { success: true, data: { id: form.id, deleted: true } };
  }

  async duplicateForm(id: string, userEmail?: string) {
    const form = await this.getFormOrThrow(id);
    const questions = await this.getQuestions(form.id);
    const slug = await this.ensureUniqueSlug(`${form.slug}-copie`);

    const duplicated = await db.transaction(async (tx) => {
      const [copy] = await tx.insert(surveyForms).values({
        slug,
        title: `${form.title} — copie`,
        description: form.description,
        status: SURVEY_FORM_STATUS.DRAFT,
        organizationId: form.organizationId,
        originOrganizationId: form.originOrganizationId,
        federationVisibility: 'local',
        federationStatus: 'local_only',
        isFederatedCopy: false,
        canonicalFormId: null,
        collectRespondentInfo: form.collectRespondentInfo,
        allowMultipleSubmissions: form.allowMultipleSubmissions,
        successMessage: form.successMessage,
        requireConsent: form.requireConsent,
        consentText: form.consentText,
        retentionDays: form.retentionDays,
        expiresAt: form.expiresAt,
        createdBy: userEmail ?? form.createdBy,
      }).returning();

      if (questions.length > 0) {
        await tx.insert(surveyQuestions).values(questions.map((question, index) => ({
          formId: copy.id,
          label: question.label,
          description: question.description,
          type: question.type,
          required: question.required,
          options: question.options,
          validation: question.validation,
          orderIndex: question.orderIndex ?? index,
        })));
      }

      return copy;
    });

    this.audit({
      actorEmail: userEmail ?? null,
      action: 'forms.duplicate',
      entityType: 'survey_form',
      entityId: duplicated.id,
      organizationId: duplicated.organizationId,
      metadata: { sourceFormId: form.id, sourceSlug: form.slug, slug: duplicated.slug },
    });
    return await this.getForm(duplicated.id);
  }

  async getPublicForm(slug: string) {
    const [form] = await db.select().from(surveyForms).where(and(
      eq(surveyForms.slug, this.slugify(slug)),
      eq(surveyForms.status, SURVEY_FORM_STATUS.PUBLISHED),
    )).limit(1);

    if (!form || this.isExpired(form)) throw new NotFoundException('Formulaire introuvable, expiré ou non publié');
    const questions = await this.getQuestions(form.id);

    return {
      success: true,
      data: {
        id: form.id,
        slug: form.slug,
        title: form.title,
        description: form.description,
        version: form.version,
        collectRespondentInfo: form.collectRespondentInfo,
        allowMultipleSubmissions: form.allowMultipleSubmissions,
        successMessage: form.successMessage,
        requireConsent: form.requireConsent,
        consentText: form.consentText,
        expiresAt: form.expiresAt,
        questions,
      },
    };
  }

  private validateAnswer(question: SurveyQuestion, value: unknown) {
    return validateSurveyAnswer(question, value);
  }

  async submitResponse(slug: string, data: unknown) {
    try {
      const formResponse = await this.getPublicForm(slug);
      const form = formResponse.data;
      const validated = submitSurveyResponseSchema.parse(data);
      const questions = form.questions as SurveyQuestion[];
      const sanitizedAnswers: AnswerMap = {};

      for (const question of questions) {
        const value = (validated.answers as AnswerMap)[question.id];
        const sanitized = this.validateAnswer(question, value);
        if (sanitized !== undefined) sanitizedAnswers[question.id] = sanitized;
      }

      if (form.collectRespondentInfo && !validated.respondentEmail) {
        throw new BadRequestException('Email répondant requis pour ce formulaire');
      }

      if (form.requireConsent && !validated.consentAccepted) {
        throw new BadRequestException('Le consentement est requis pour répondre à ce formulaire');
      }

      if (!form.allowMultipleSubmissions) {
        if (!validated.respondentEmail) {
          throw new BadRequestException('Email répondant requis lorsque les réponses multiples sont désactivées');
        }
        const [existing] = await db.select({ id: surveyResponses.id })
          .from(surveyResponses)
          .where(and(
            eq(surveyResponses.formId, form.id),
            eq(surveyResponses.respondentEmail, validated.respondentEmail),
          ))
          .limit(1);
        if (existing) {
          throw new ConflictException('Une réponse existe déjà pour cette adresse email');
        }
      }

      const [response] = await db.insert(surveyResponses).values({
        formId: form.id,
        formVersion: form.version,
        respondentName: validated.respondentName ?? null,
        respondentEmail: validated.respondentEmail ?? null,
        answers: sanitizedAnswers,
        formSnapshot: this.buildFormSnapshot(form, questions),
        consentAccepted: Boolean(validated.consentAccepted),
      }).returning();

      this.emitOutboundEventBestEffort('form.response.created', {
        id: response.id,
        formId: form.id,
        formSlug: form.slug,
        formTitle: form.title,
        formVersion: form.version,
        submittedAt: response.submittedAt,
        respondentEmail: validated.respondentEmail ?? null,
        consentAccepted: Boolean(validated.consentAccepted),
      });

      return {
        success: true,
        data: {
          id: response.id,
          submittedAt: response.submittedAt,
          successMessage: form.successMessage || 'Merci, votre réponse a bien été enregistrée.',
        },
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async getResponses(formId: string) {
    const form = await this.getFormOrThrow(formId);
    const currentQuestions = await this.getQuestions(form.id);
    const responses = await db.select().from(surveyResponses).where(eq(surveyResponses.formId, form.id)).orderBy(desc(surveyResponses.submittedAt));
    const questions = this.questionCatalog(currentQuestions, responses);

    const columns = [
      { key: 'submittedAt', label: 'Date de réponse', type: 'date' },
      { key: 'formVersion', label: 'Version formulaire', type: 'number' },
      ...(form.collectRespondentInfo || !form.allowMultipleSubmissions ? [
        { key: 'respondentName', label: 'Nom', type: 'text' },
        { key: 'respondentEmail', label: 'Email', type: 'text' },
      ] : []),
      ...(form.requireConsent ? [{ key: 'consentAccepted', label: 'Consentement', type: 'boolean' }] : []),
      ...questions.map((question) => ({ key: question.id, label: question.label, type: question.type })),
    ];

    const rows = responses.map((response) => {
      const answers = response.answers as AnswerMap;
      return {
        id: response.id,
        submittedAt: response.submittedAt,
        formVersion: response.formVersion,
        respondentName: response.respondentName,
        respondentEmail: response.respondentEmail,
        consentAccepted: response.consentAccepted,
        ...Object.fromEntries(questions.map((question) => [question.id, this.formatAnswerForDisplay(question, answers[question.id])])),
      };
    });

    return { success: true, data: { form, questions, columns, rows } };
  }

  private csvEscape(value: unknown): string {
    return csvEscapeSurveyValue(value);
  }

  async getResponsesCsv(formId: string, userEmail?: string) {
    const responses = await this.getResponses(formId);
    const { form, columns, rows } = responses.data;
    const header = columns.map((column) => this.csvEscape(column.label)).join(';');
    const body = rows.map((row) => columns.map((column) => this.csvEscape((row as Record<string, unknown>)[column.key])).join(';'));
    const filename = `${this.slugify(form.title)}-reponses.csv`;
    this.audit({
      actorEmail: userEmail ?? null,
      action: 'forms.responses.export_csv',
      entityType: 'survey_form',
      entityId: form.id,
      organizationId: form.organizationId,
      metadata: { filename, responseCount: rows.length, columnCount: columns.length },
    });
    return {
      success: true,
      data: {
        filename,
        content: [header, ...body].join('\n'),
      },
    };
  }

  async deleteResponse(formId: string, responseId: string, userEmail?: string) {
    await this.getFormOrThrow(formId);
    const [deleted] = await db.delete(surveyResponses)
      .where(and(eq(surveyResponses.formId, formId), eq(surveyResponses.id, responseId)))
      .returning({ id: surveyResponses.id });
    if (!deleted) throw new NotFoundException('Réponse introuvable');
    const form = await this.getFormOrThrow(formId);
    this.audit({
      actorEmail: userEmail ?? null,
      action: 'forms.responses.delete',
      entityType: 'survey_response',
      entityId: deleted.id,
      organizationId: form.organizationId,
      metadata: { formId },
    });
    return { success: true, data: { id: deleted.id, deleted: true } };
  }

  private summarizeQuestion(question: SurveyQuestion, responses: SurveyResponse[]) {
    return summarizeSurveyQuestion(question, responses);
  }

  async runMaintenance(userEmail?: string) {
    const closedForms = await db.update(surveyForms)
      .set({ status: SURVEY_FORM_STATUS.CLOSED, closedAt: sql`NOW()`, updatedAt: sql`NOW()` })
      .where(and(
        eq(surveyForms.status, SURVEY_FORM_STATUS.PUBLISHED),
        sql`${surveyForms.expiresAt} IS NOT NULL`,
        sql`${surveyForms.expiresAt} <= NOW()`,
      ))
      .returning({ id: surveyForms.id });

    const deletedResponses = await db.execute(sql`
      DELETE FROM survey_responses sr
      USING survey_forms sf
      WHERE sr.form_id = sf.id
        AND sf.retention_days IS NOT NULL
        AND sr.submitted_at < NOW() - (sf.retention_days || ' days')::interval
    `);

    const data = {
      closedExpiredForms: closedForms.length,
      purgedResponses: (deletedResponses as any)?.rowCount ?? 0,
    };
    this.audit({
      actorEmail: userEmail ?? null,
      action: 'forms.maintenance.run',
      entityType: 'survey_form',
      metadata: data,
    });
    return {
      success: true,
      data,
    };
  }

  @Cron('0 3 * * *', { name: 'forms-maintenance', timeZone: 'Europe/Paris' })
  async runFormsMaintenanceCron() {
    try {
      const result = await this.runMaintenance();
      this.logger.log(`Maintenance formulaires terminée: ${JSON.stringify(result.data)}`);
    } catch (error) {
      this.logger.error('Maintenance formulaires échouée', error as Error);
    }
  }

  async getStats(formId: string) {
    const form = await this.getFormOrThrow(formId);
    const currentQuestions = await this.getQuestions(form.id);
    const responses = await db.select().from(surveyResponses).where(eq(surveyResponses.formId, form.id)).orderBy(asc(surveyResponses.submittedAt));
    const questions = this.questionCatalog(currentQuestions, responses);

    const byDayMap = new Map<string, number>();
    for (const response of responses) {
      const day = new Date(response.submittedAt).toISOString().slice(0, 10);
      byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
    }

    return {
      success: true,
      data: {
        form,
        totalResponses: responses.length,
        lastResponseAt: responses[responses.length - 1]?.submittedAt ?? null,
        responsesByDay: Array.from(byDayMap.entries()).map(([date, count]) => ({ date, count })),
        questionSummaries: questions.map((question) => this.summarizeQuestion(question, responses)),
      },
    };
  }
}

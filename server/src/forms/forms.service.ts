import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import {
  SURVEY_FORM_STATUS,
  SURVEY_QUESTION_TYPE,
  insertSurveyFormSchema,
  submitSurveyResponseSchema,
  surveyForms,
  surveyQuestions,
  surveyResponses,
  updateSurveyFormSchema,
  type SurveyQuestion,
  type SurveyResponse,
} from '../../../shared/schema';

type QuestionOption = { label: string; value: string };
type AnswerMap = Record<string, unknown>;

const optionTypes = new Set<string>([
  SURVEY_QUESTION_TYPE.SELECT,
  SURVEY_QUESTION_TYPE.RADIO,
  SURVEY_QUESTION_TYPE.MULTISELECT,
]);

@Injectable()
export class FormsService {
  private handleZodError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(fromZodError(error).toString());
    }
    throw error;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'formulaire';
  }

  private normalizeOptions(options: unknown): QuestionOption[] {
    if (!Array.isArray(options)) return [];
    return options
      .map((option) => {
        if (typeof option === 'string') {
          const label = option.trim();
          return label ? { label, value: this.slugify(label) } : null;
        }
        if (typeof option !== 'object' || option === null) return null;
        const record = option as Record<string, unknown>;
        const label = String(record.label ?? record.value ?? '').trim();
        if (!label) return null;
        const value = String(record.value ?? this.slugify(label)).trim() || this.slugify(label);
        return { label, value };
      })
      .filter((option): option is QuestionOption => Boolean(option));
  }

  private async ensureUniqueSlug(baseSlug: string, currentFormId?: string): Promise<string> {
    const normalized = this.slugify(baseSlug);
    let candidate = normalized;
    let suffix = 2;

    while (true) {
      const [existing] = await db.select({ id: surveyForms.id }).from(surveyForms).where(eq(surveyForms.slug, candidate)).limit(1);
      if (!existing || existing.id === currentFormId) return candidate;
      candidate = `${normalized}-${suffix++}`;
    }
  }

  private async getFormOrThrow(id: string) {
    const [form] = await db.select().from(surveyForms).where(eq(surveyForms.id, id)).limit(1);
    if (!form) throw new NotFoundException('Formulaire introuvable');
    return form;
  }

  private async getQuestions(formId: string) {
    return await db.select().from(surveyQuestions).where(eq(surveyQuestions.formId, formId)).orderBy(asc(surveyQuestions.orderIndex), asc(surveyQuestions.createdAt));
  }

  private async replaceQuestions(formId: string, questions: z.infer<typeof updateSurveyFormSchema>['questions']) {
    if (!questions) return;

    await db.delete(surveyQuestions).where(eq(surveyQuestions.formId, formId));
    if (questions.length === 0) return;

    await db.insert(surveyQuestions).values(questions.map((question, index) => ({
      formId,
      label: question.label,
      description: question.description ?? null,
      type: question.type,
      required: question.required,
      options: this.normalizeOptions(question.options),
      validation: question.validation ?? {},
      orderIndex: question.orderIndex ?? index,
    })));
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
      const validated = insertSurveyFormSchema.parse(data);
      const slug = await this.ensureUniqueSlug(validated.slug ?? validated.title);
      const now = new Date();

      const created = await db.transaction(async (tx) => {
        const [form] = await tx.insert(surveyForms).values({
          slug,
          title: validated.title,
          description: validated.description ?? null,
          status: validated.status,
          collectRespondentInfo: validated.collectRespondentInfo,
          allowMultipleSubmissions: validated.allowMultipleSubmissions,
          successMessage: validated.successMessage ?? null,
          createdBy: userEmail ?? null,
          publishedAt: validated.status === SURVEY_FORM_STATUS.PUBLISHED ? now : null,
          closedAt: validated.status === SURVEY_FORM_STATUS.CLOSED ? now : null,
        }).returning();

        if (validated.questions.length > 0) {
          await tx.insert(surveyQuestions).values(validated.questions.map((question, index) => ({
            formId: form.id,
            label: question.label,
            description: question.description ?? null,
            type: question.type,
            required: question.required,
            options: this.normalizeOptions(question.options),
            validation: question.validation ?? {},
            orderIndex: question.orderIndex ?? index,
          })));
        }

        return form;
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

  async updateForm(id: string, data: unknown) {
    try {
      const current = await this.getFormOrThrow(id);
      const validated = updateSurveyFormSchema.parse(data);
      const patch: Record<string, unknown> = { updatedAt: sql`NOW()` };

      if (validated.title !== undefined) patch.title = validated.title;
      if (validated.description !== undefined) patch.description = validated.description ?? null;
      if (validated.collectRespondentInfo !== undefined) patch.collectRespondentInfo = validated.collectRespondentInfo;
      if (validated.allowMultipleSubmissions !== undefined) patch.allowMultipleSubmissions = validated.allowMultipleSubmissions;
      if (validated.successMessage !== undefined) patch.successMessage = validated.successMessage ?? null;
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
            await tx.insert(surveyQuestions).values(validated.questions.map((question, index) => ({
              formId: id,
              label: question.label,
              description: question.description ?? null,
              type: question.type,
              required: question.required,
              options: this.normalizeOptions(question.options),
              validation: question.validation ?? {},
              orderIndex: question.orderIndex ?? index,
            })));
          }
        }
      });

      return await this.getForm(id);
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Un formulaire avec ce slug existe déjà');
      return this.handleZodError(error);
    }
  }

  async deleteForm(id: string) {
    const form = await this.getFormOrThrow(id);
    await db.delete(surveyForms).where(eq(surveyForms.id, form.id));
    return { success: true, data: { id: form.id, deleted: true } };
  }

  async getPublicForm(slug: string) {
    const [form] = await db.select().from(surveyForms).where(and(
      eq(surveyForms.slug, this.slugify(slug)),
      eq(surveyForms.status, SURVEY_FORM_STATUS.PUBLISHED),
    )).limit(1);

    if (!form) throw new NotFoundException('Formulaire introuvable ou non publié');
    const questions = await this.getQuestions(form.id);

    return {
      success: true,
      data: {
        id: form.id,
        slug: form.slug,
        title: form.title,
        description: form.description,
        collectRespondentInfo: form.collectRespondentInfo,
        allowMultipleSubmissions: form.allowMultipleSubmissions,
        successMessage: form.successMessage,
        questions,
      },
    };
  }

  private isEmptyAnswer(value: unknown): boolean {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  }

  private validateAnswer(question: SurveyQuestion, value: unknown) {
    if (question.required && this.isEmptyAnswer(value)) {
      throw new BadRequestException(`La question « ${question.label} » est obligatoire`);
    }
    if (this.isEmptyAnswer(value)) return undefined;

    const options = this.normalizeOptions(question.options);
    const allowed = new Set(options.map((option) => option.value));

    switch (question.type) {
      case SURVEY_QUESTION_TYPE.EMAIL:
        if (!z.string().email().safeParse(value).success) throw new BadRequestException(`La réponse à « ${question.label} » doit être un email valide`);
        return String(value).trim();
      case SURVEY_QUESTION_TYPE.NUMBER: {
        const number = typeof value === 'number' ? value : Number(value);
        if (Number.isNaN(number)) throw new BadRequestException(`La réponse à « ${question.label} » doit être un nombre`);
        return number;
      }
      case SURVEY_QUESTION_TYPE.RATING: {
        const rating = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new BadRequestException(`La note « ${question.label} » doit être comprise entre 1 et 5`);
        return rating;
      }
      case SURVEY_QUESTION_TYPE.CHECKBOX:
        return Boolean(value);
      case SURVEY_QUESTION_TYPE.MULTISELECT: {
        if (!Array.isArray(value)) throw new BadRequestException(`La réponse à « ${question.label} » doit être une liste`);
        const values = value.map(String);
        if (allowed.size && values.some((answer) => !allowed.has(answer))) throw new BadRequestException(`Une réponse à « ${question.label} » n’est pas autorisée`);
        return values;
      }
      case SURVEY_QUESTION_TYPE.SELECT:
      case SURVEY_QUESTION_TYPE.RADIO: {
        const answer = String(value);
        if (allowed.size && !allowed.has(answer)) throw new BadRequestException(`La réponse à « ${question.label} » n’est pas autorisée`);
        return answer;
      }
      default:
        return String(value).trim();
    }
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

      const [response] = await db.insert(surveyResponses).values({
        formId: form.id,
        respondentName: validated.respondentName ?? null,
        respondentEmail: validated.respondentEmail ?? null,
        answers: sanitizedAnswers,
      }).returning();

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
    const questions = await this.getQuestions(form.id);
    const responses = await db.select().from(surveyResponses).where(eq(surveyResponses.formId, form.id)).orderBy(desc(surveyResponses.submittedAt));

    const columns = [
      { key: 'submittedAt', label: 'Date de réponse', type: 'date' },
      ...(form.collectRespondentInfo ? [
        { key: 'respondentName', label: 'Nom', type: 'text' },
        { key: 'respondentEmail', label: 'Email', type: 'text' },
      ] : []),
      ...questions.map((question) => ({ key: question.id, label: question.label, type: question.type })),
    ];

    const rows = responses.map((response) => {
      const answers = response.answers as AnswerMap;
      return {
        id: response.id,
        submittedAt: response.submittedAt,
        respondentName: response.respondentName,
        respondentEmail: response.respondentEmail,
        ...Object.fromEntries(questions.map((question) => [question.id, answers[question.id] ?? null])),
      };
    });

    return { success: true, data: { form, questions, columns, rows } };
  }

  private labelForOption(question: SurveyQuestion, value: string): string {
    const option = this.normalizeOptions(question.options).find((item) => item.value === value);
    return option?.label ?? value;
  }

  private summarizeQuestion(question: SurveyQuestion, responses: SurveyResponse[]) {
    const answers = responses.map((response) => (response.answers as AnswerMap)[question.id]).filter((value) => !this.isEmptyAnswer(value));
    const totalAnswered = answers.length;

    if (optionTypes.has(question.type)) {
      const counts = new Map<string, number>();
      for (const answer of answers) {
        const values = Array.isArray(answer) ? answer.map(String) : [String(answer)];
        for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      const options = Array.from(counts.entries()).map(([value, count]) => ({
        value,
        label: this.labelForOption(question, value),
        count,
        percent: totalAnswered ? Math.round((count / totalAnswered) * 1000) / 10 : 0,
      })).sort((a, b) => b.count - a.count);
      return { questionId: question.id, label: question.label, type: question.type, chartType: 'bar', totalAnswered, options };
    }

    if (question.type === SURVEY_QUESTION_TYPE.CHECKBOX) {
      const yes = answers.filter(Boolean).length;
      const no = totalAnswered - yes;
      return {
        questionId: question.id,
        label: question.label,
        type: question.type,
        chartType: 'pie',
        totalAnswered,
        options: [
          { value: 'true', label: 'Oui', count: yes, percent: totalAnswered ? Math.round((yes / totalAnswered) * 1000) / 10 : 0 },
          { value: 'false', label: 'Non', count: no, percent: totalAnswered ? Math.round((no / totalAnswered) * 1000) / 10 : 0 },
        ],
      };
    }

    if (question.type === SURVEY_QUESTION_TYPE.NUMBER || question.type === SURVEY_QUESTION_TYPE.RATING) {
      const values = answers.map(Number).filter(Number.isFinite);
      const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return {
        questionId: question.id,
        label: question.label,
        type: question.type,
        chartType: 'number',
        totalAnswered: values.length,
        numeric: {
          average: Math.round(average * 100) / 100,
          min: values.length ? Math.min(...values) : null,
          max: values.length ? Math.max(...values) : null,
        },
      };
    }

    return {
      questionId: question.id,
      label: question.label,
      type: question.type,
      chartType: 'text',
      totalAnswered,
      samples: answers.slice(0, 8).map(String),
    };
  }

  async getStats(formId: string) {
    const form = await this.getFormOrThrow(formId);
    const questions = await this.getQuestions(form.id);
    const responses = await db.select().from(surveyResponses).where(eq(surveyResponses.formId, form.id)).orderBy(asc(surveyResponses.submittedAt));

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

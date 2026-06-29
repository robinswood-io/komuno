import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { SurveyQuestion, SurveyResponse } from '../../../shared/schema';

const SURVEY_STATUS_PUBLISHED = 'published';
const QUESTION_TYPE_SELECT = 'select';
const QUESTION_TYPE_RADIO = 'radio';
const QUESTION_TYPE_MULTISELECT = 'multiselect';
const QUESTION_TYPE_EMAIL = 'email';
const QUESTION_TYPE_NUMBER = 'number';
const QUESTION_TYPE_RATING = 'rating';
const QUESTION_TYPE_CHECKBOX = 'checkbox';
const QUESTION_TYPE_DATE = 'date';
const SURVEY_SLUG_MAX_LENGTH = 120;

export type QuestionOption = { label: string; value: string };
export type AnswerMap = Record<string, unknown>;
export type SurveyQuestionInput = {
  id?: string;
  label: string;
  description?: string | null;
  type: string;
  required: boolean;
  options?: unknown;
  validation?: unknown;
  orderIndex?: number;
};
export type SurveyQuestionSnapshot = Pick<SurveyQuestion, 'id' | 'label' | 'description' | 'type' | 'required' | 'options' | 'orderIndex'>;

export const surveyOptionTypes = new Set<string>([
  QUESTION_TYPE_SELECT,
  QUESTION_TYPE_RADIO,
  QUESTION_TYPE_MULTISELECT,
]);

export function slugifySurveyValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'formulaire';
}

export function surveySlugCandidate(baseSlug: string, suffix?: number): string {
  const normalized = slugifySurveyValue(baseSlug);
  if (!suffix) return normalized.slice(0, SURVEY_SLUG_MAX_LENGTH);

  const suffixText = `-${suffix}`;
  return `${normalized.slice(0, SURVEY_SLUG_MAX_LENGTH - suffixText.length)}${suffixText}`;
}

export async function resolveUniqueSurveySlug(
  baseSlug: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let suffix: number | undefined;

  for (let attempts = 0; attempts < 1000; attempts += 1) {
    const candidate = surveySlugCandidate(baseSlug, suffix);
    if (!(await isTaken(candidate))) return candidate;
    suffix = suffix ? suffix + 1 : 2;
  }

  throw new BadRequestException('Impossible de générer une URL unique pour ce formulaire');
}

export function normalizeSurveyFormPayload(data: unknown): unknown {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;

  const payload = { ...(data as Record<string, unknown>) };
  const rawSlug = typeof payload.slug === 'string' ? payload.slug.trim() : undefined;
  const rawTitle = typeof payload.title === 'string' ? payload.title.trim() : undefined;

  if (rawSlug !== undefined) {
    const normalizedSlug = rawSlug ? slugifySurveyValue(rawSlug) : '';
    if (normalizedSlug.length >= 3) payload.slug = normalizedSlug;
    else if (rawTitle && slugifySurveyValue(rawTitle).length >= 3) payload.slug = slugifySurveyValue(rawTitle);
    else if (rawSlug === '') delete payload.slug;
    else payload.slug = normalizedSlug;
  }

  return payload;
}

export function normalizeSurveyOptions(options: unknown): QuestionOption[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => {
      if (typeof option === 'string') {
        const label = option.trim();
        return label ? { label, value: slugifySurveyValue(label) } : null;
      }
      if (typeof option !== 'object' || option === null) return null;
      const record = option as Record<string, unknown>;
      const label = String(record.label ?? record.value ?? '').trim();
      if (!label) return null;
      const value = String(record.value ?? slugifySurveyValue(label)).trim() || slugifySurveyValue(label);
      return { label, value };
    })
    .filter((option): option is QuestionOption => Boolean(option));
}

export function assertSurveyQuestionsCanBeSaved(status: string | undefined, questions: SurveyQuestionInput[] | undefined) {
  if (status === SURVEY_STATUS_PUBLISHED && questions !== undefined && questions.length === 0) {
    throw new BadRequestException('Un formulaire publié doit contenir au moins une question');
  }

  for (const question of questions ?? []) {
    const options = normalizeSurveyOptions(question.options);
    if (surveyOptionTypes.has(question.type) && options.length < 2) {
      throw new BadRequestException(`La question « ${question.label} » doit contenir au moins deux options`);
    }
    const values = options.map((option) => option.value);
    if (new Set(values).size !== values.length) {
      throw new BadRequestException(`La question « ${question.label} » contient des options en doublon`);
    }
  }
}

export function normalizeSurveyDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSurveyFormExpired(form: Pick<{ expiresAt: string | Date | null }, 'expiresAt'>): boolean {
  const expiresAt = normalizeSurveyDate(form.expiresAt);
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function snapshotSurveyQuestions(questions: SurveyQuestion[]): SurveyQuestionSnapshot[] {
  return questions.map((question) => ({
    id: question.id,
    label: question.label,
    description: question.description,
    type: question.type,
    required: question.required,
    options: question.options,
    orderIndex: question.orderIndex,
  }));
}

export function buildSurveyFormSnapshot(
  form: Pick<{ id: string; slug: string; title: string; version: number }, 'id' | 'slug' | 'title' | 'version'>,
  questions: SurveyQuestion[],
) {
  return {
    formId: form.id,
    slug: form.slug,
    title: form.title,
    version: form.version,
    capturedAt: new Date().toISOString(),
    questions: snapshotSurveyQuestions(questions),
  };
}

export function questionCatalogWithSnapshots(currentQuestions: SurveyQuestion[], responses: SurveyResponse[] = []): SurveyQuestion[] {
  const byId = new Map<string, SurveyQuestion>();
  for (const question of currentQuestions) byId.set(question.id, question);

  for (const response of responses) {
    const snapshot = response.formSnapshot as { questions?: SurveyQuestion[] } | null;
    for (const question of snapshot?.questions ?? []) {
      if (question?.id && !byId.has(question.id)) {
        byId.set(question.id, question as SurveyQuestion);
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

export function isEmptySurveyAnswer(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

export function labelForSurveyOption(question: SurveyQuestion, value: string): string {
  const option = normalizeSurveyOptions(question.options).find((item) => item.value === value);
  return option?.label ?? value;
}

export function formatSurveyAnswerForDisplay(question: SurveyQuestion, value: unknown): unknown {
  if (isEmptySurveyAnswer(value)) return null;
  if (question.type === QUESTION_TYPE_MULTISELECT && Array.isArray(value)) {
    return value.map((item) => labelForSurveyOption(question, String(item)));
  }
  if (question.type === QUESTION_TYPE_SELECT || question.type === QUESTION_TYPE_RADIO) {
    return labelForSurveyOption(question, String(value));
  }
  return value;
}

export function validateSurveyAnswer(question: SurveyQuestion, value: unknown) {
  if (question.required && question.type === QUESTION_TYPE_CHECKBOX && value !== true) {
    throw new BadRequestException(`La question « ${question.label} » doit être confirmée`);
  }
  if (question.required && isEmptySurveyAnswer(value)) {
    throw new BadRequestException(`La question « ${question.label} » est obligatoire`);
  }
  if (isEmptySurveyAnswer(value)) return undefined;

  const options = normalizeSurveyOptions(question.options);
  const allowed = new Set(options.map((option) => option.value));

  switch (question.type) {
    case QUESTION_TYPE_EMAIL:
      if (!z.string().email().safeParse(value).success) throw new BadRequestException(`La réponse à « ${question.label} » doit être un email valide`);
      return String(value).trim();
    case QUESTION_TYPE_NUMBER: {
      const number = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(number)) throw new BadRequestException(`La réponse à « ${question.label} » doit être un nombre`);
      return number;
    }
    case QUESTION_TYPE_RATING: {
      const rating = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new BadRequestException(`La note « ${question.label} » doit être comprise entre 1 et 5`);
      return rating;
    }
    case QUESTION_TYPE_DATE: {
      const answer = String(value).trim();
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(answer);
      if (!match) throw new BadRequestException(`La réponse à « ${question.label} » doit être une date valide`);
      const [, yearText, monthText, dayText] = match;
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new BadRequestException(`La réponse à « ${question.label} » doit être une date valide`);
      }
      return answer;
    }
    case QUESTION_TYPE_CHECKBOX:
      return Boolean(value);
    case QUESTION_TYPE_MULTISELECT: {
      if (!Array.isArray(value)) throw new BadRequestException(`La réponse à « ${question.label} » doit être une liste`);
      const values = Array.from(new Set(value.map(String).filter((answer) => answer.trim())));
      if (allowed.size && values.some((answer) => !allowed.has(answer))) throw new BadRequestException(`Une réponse à « ${question.label} » n’est pas autorisée`);
      return values;
    }
    case QUESTION_TYPE_SELECT:
    case QUESTION_TYPE_RADIO: {
      const answer = String(value);
      if (allowed.size && !allowed.has(answer)) throw new BadRequestException(`La réponse à « ${question.label} » n’est pas autorisée`);
      return answer;
    }
    default:
      return String(value).trim();
  }
}

export function csvEscapeSurveyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const rawValue = Array.isArray(value) ? value.join(', ') : String(value);
  const raw = /^[=+\-@]/.test(rawValue) ? `'${rawValue}` : rawValue;
  return /[";\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function summarizeSurveyQuestion(question: SurveyQuestion, responses: SurveyResponse[]) {
  const answers = responses.map((response) => (response.answers as AnswerMap)[question.id]).filter((value) => !isEmptySurveyAnswer(value));
  const totalAnswered = answers.length;

  if (surveyOptionTypes.has(question.type)) {
    const counts = new Map<string, number>();
    for (const answer of answers) {
      const values = Array.isArray(answer) ? answer.map(String) : [String(answer)];
      for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const options = Array.from(counts.entries()).map(([value, count]) => ({
      value,
      label: labelForSurveyOption(question, value),
      count,
      percent: totalAnswered ? Math.round((count / totalAnswered) * 1000) / 10 : 0,
    })).sort((a, b) => b.count - a.count);
    return { questionId: question.id, label: question.label, type: question.type, chartType: 'bar', totalAnswered, options };
  }

  if (question.type === QUESTION_TYPE_CHECKBOX) {
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

  if (question.type === QUESTION_TYPE_NUMBER || question.type === QUESTION_TYPE_RATING) {
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

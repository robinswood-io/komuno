import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import {
  assertSurveyQuestionsCanBeSaved,
  buildSurveyFormSnapshot,
  csvEscapeSurveyValue,
  isSurveyFormExpired,
  questionCatalogWithSnapshots,
  validateSurveyAnswer,
} from '../../server/src/forms/forms.utils';
import {
  hasPermission,
  insertSurveyFormSchema,
  submitSurveyResponseSchema,
  updateSurveyFormSchema,
  type SurveyQuestion,
  type SurveyResponse,
} from '../../shared/schema.ts';

function question(overrides: Partial<SurveyQuestion> = {}): SurveyQuestion {
  return {
    id: overrides.id ?? 'question-1',
    formId: overrides.formId ?? 'form-1',
    label: overrides.label ?? 'Question test',
    description: overrides.description ?? null,
    type: overrides.type ?? 'text',
    required: overrides.required ?? false,
    options: overrides.options ?? [],
    validation: overrides.validation ?? {},
    orderIndex: overrides.orderIndex ?? 0,
    createdAt: overrides.createdAt ?? new Date('2026-06-28T09:19:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-06-28T09:19:00.000Z'),
  } as SurveyQuestion;
}

function response(overrides: Partial<SurveyResponse> = {}): SurveyResponse {
  return {
    id: overrides.id ?? 'response-1',
    formId: overrides.formId ?? 'form-1',
    formVersion: overrides.formVersion ?? 1,
    respondentName: overrides.respondentName ?? null,
    respondentEmail: overrides.respondentEmail ?? null,
    answers: overrides.answers ?? {},
    formSnapshot: overrides.formSnapshot ?? {},
    consentAccepted: overrides.consentAccepted ?? false,
    submittedAt: overrides.submittedAt ?? new Date('2026-06-28T09:19:00.000Z'),
    createdAt: overrides.createdAt ?? new Date('2026-06-28T09:19:00.000Z'),
  } as SurveyResponse;
}

describe('Formulaires v2 — schémas et permissions', () => {
  it('valide expiration, consentement, rétention et champs fédération contrôlés', () => {
    const parsed = insertSurveyFormSchema.parse({
      title: 'Diagnostic régional',
      slug: 'diagnostic-regional',
      status: 'draft',
      expiresAt: '2026-07-31T22:00:00.000Z',
      requireConsent: true,
      consentText: '<b>Consentement</b> OK',
      retentionDays: 365,
      federationVisibility: 'parent_region',
      federationStatus: 'proposed_to_region',
      questions: [
        { label: 'Votre email', type: 'email', required: true, options: [] },
      ],
    });

    expect(parsed.requireConsent).toBe(true);
    expect(parsed.retentionDays).toBe(365);
    expect(parsed.federationVisibility).toBe('parent_region');
    expect(parsed.consentText).not.toContain('<b>');
  });

  it('refuse les valeurs de fédération non déclarées pour éviter les statuts implicites', () => {
    expect(() => updateSurveyFormSchema.parse({ federationVisibility: 'all-domains' })).toThrow();
    expect(() => updateSurveyFormSchema.parse({ federationStatus: 'auto_imported' })).toThrow();
  });

  it('requiert explicitement consentAccepted dans la réponse publique quand le service l’exige', () => {
    const parsed = submitSurveyResponseSchema.parse({
      respondentEmail: 'membre@example.com',
      consentAccepted: true,
      answers: { q1: 'Oui' },
    });

    expect(parsed.consentAccepted).toBe(true);
    expect(parsed.respondentEmail).toBe('membre@example.com');
  });

  it('accorde lecture formulaires aux lecteurs, mais écriture/export/suppression seulement aux managers et super-admin', () => {
    expect(hasPermission('ideas_reader', 'forms.view')).toBe(true);
    expect(hasPermission('events_reader', 'forms.view')).toBe(true);
    expect(hasPermission('ideas_reader', 'forms.write')).toBe(false);
    expect(hasPermission('events_reader', 'forms.export')).toBe(false);
    expect(hasPermission('ideas_manager', 'forms.write')).toBe(true);
    expect(hasPermission('events_manager', 'forms.delete')).toBe(true);
    expect(hasPermission('super_admin', 'forms.export')).toBe(true);
  });
});

describe('Formulaires v2 — helpers service sans DB', () => {
  it('protège les exports CSV contre formula injection', () => {
    expect(csvEscapeSurveyValue('=IMPORTXML("https://evil")')).toBe('"\'=IMPORTXML(""https://evil"")"');
    expect(csvEscapeSurveyValue('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(csvEscapeSurveyValue('-10')).toBe("'-10");
    expect(csvEscapeSurveyValue('@cmd')).toBe("'@cmd");
    expect(csvEscapeSurveyValue('Texte;avec;points-virgules')).toBe('"Texte;avec;points-virgules"');
  });

  it('détecte les formulaires expirés de manière stricte', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-28T09:19:00.000Z'));

    expect(isSurveyFormExpired({ expiresAt: new Date('2026-06-28T09:18:59.000Z') })).toBe(true);
    expect(isSurveyFormExpired({ expiresAt: new Date('2026-06-28T09:19:00.000Z') })).toBe(true);
    expect(isSurveyFormExpired({ expiresAt: new Date('2026-06-28T09:19:01.000Z') })).toBe(false);
    expect(isSurveyFormExpired({ expiresAt: null })).toBe(false);

    vi.useRealTimers();
  });

  it('snapshot le schéma au moment de la réponse', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-28T09:19:00.000Z'));

    const snapshot = buildSurveyFormSnapshot(
      { id: 'form-1', slug: 'test', title: 'Formulaire test', version: 3 },
      [question({ id: 'q1', label: 'Question historique', required: true })],
    );

    expect(snapshot).toMatchObject({
      formId: 'form-1',
      slug: 'test',
      title: 'Formulaire test',
      version: 3,
      capturedAt: '2026-06-28T09:19:00.000Z',
      questions: [{ id: 'q1', label: 'Question historique', required: true }],
    });

    vi.useRealTimers();
  });

  it('conserve les questions historiques issues des snapshots pour tableaux/statistiques', () => {
    const current = question({ id: 'q-current', label: 'Question actuelle', orderIndex: 2 });
    const historical = question({ id: 'q-old', label: 'Ancienne question', orderIndex: 1 });

    const catalog = questionCatalogWithSnapshots([current], [
      response({ formSnapshot: { questions: [historical] } }),
    ]);

    expect(catalog.map((item: SurveyQuestion) => item.id)).toEqual(['q-old', 'q-current']);
  });

  it('refuse publication vide et options dupliquées', () => {
    expect(() => assertSurveyQuestionsCanBeSaved('published', [])).toThrow(BadRequestException);
    expect(() => assertSurveyQuestionsCanBeSaved('published', [
      { label: 'Choix', type: 'radio', required: true, options: [{ label: 'A', value: 'same' }, { label: 'B', value: 'same' }] },
    ])).toThrow(BadRequestException);
  });

  it('valide et normalise les réponses typées', () => {
    expect(validateSurveyAnswer(question({ type: 'email' }), 'test@example.com')).toBe('test@example.com');
    expect(validateSurveyAnswer(question({ type: 'number' }), '42')).toBe(42);
    expect(validateSurveyAnswer(question({ type: 'rating' }), '5')).toBe(5);
    expect(validateSurveyAnswer(question({ type: 'checkbox' }), 'non-empty')).toBe(true);
    expect(validateSurveyAnswer(question({
      type: 'multiselect',
      options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }],
    }), ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('refuse les réponses hors options et notes hors limites', () => {
    expect(() => validateSurveyAnswer(question({
      type: 'select',
      options: [{ label: 'A', value: 'a' }],
    }), 'b')).toThrow(BadRequestException);

    expect(() => validateSurveyAnswer(question({ type: 'rating' }), 6)).toThrow(BadRequestException);
  });
});

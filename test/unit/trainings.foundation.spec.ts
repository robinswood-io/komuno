import { describe, expect, it } from 'vitest';

import {
  ADMIN_ROLES,
  FEDERATION_VISIBILITY,
  TRAINING_PROGRAM_STATUS,
  hasPermission,
  insertTrainingProgramSchema,
  insertTrainingSessionSchema,
  submitTrainingInterestSchema,
} from '../../shared/schema';

describe('Trainings foundation', () => {
  it('valide une formation régionale publiable avec objectifs', () => {
    const parsed = insertTrainingProgramSchema.safeParse({
      title: 'Prise de parole en public',
      description: 'Formation régionale proposée aux sections.',
      category: 'Leadership',
      audience: 'Membres CJD',
      objectives: ['Structurer son message', 'Gérer le trac'],
      status: TRAINING_PROGRAM_STATUS.PUBLISHED,
      federationVisibility: FEDERATION_VISIBILITY.CHILD_SECTIONS,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.objectives).toHaveLength(2);
  });

  it('valide une date de formation', () => {
    const parsed = insertTrainingSessionSchema.safeParse({
      trainingId: '11111111-1111-4111-8111-111111111111',
      startsAt: '2026-09-15T08:30:00.000Z',
      endsAt: '2026-09-15T15:30:00.000Z',
      locationName: 'CJD Hauts de France',
      city: 'Amiens',
      capacity: 20,
    });

    expect(parsed.success).toBe(true);
  });

  it('exige consentement et date ou intérêt sans date', () => {
    const missingConsent = submitTrainingInterestSchema.safeParse({
      trainingId: '11111111-1111-4111-8111-111111111111',
      sessionIds: ['22222222-2222-4222-8222-222222222222'],
      respondentName: 'Jean Dupont',
      respondentEmail: 'jean@example.com',
      consentAccepted: false,
    });
    expect(missingConsent.success).toBe(false);

    const missingSession = submitTrainingInterestSchema.safeParse({
      trainingId: '11111111-1111-4111-8111-111111111111',
      sessionIds: [],
      respondentName: 'Jean Dupont',
      respondentEmail: 'jean@example.com',
      consentAccepted: true,
    });
    expect(missingSession.success).toBe(false);

    const withoutSession = submitTrainingInterestSchema.safeParse({
      trainingId: '11111111-1111-4111-8111-111111111111',
      sessionIds: [],
      interestWithoutSession: true,
      respondentName: 'Jean Dupont',
      respondentEmail: 'jean@example.com',
      consentAccepted: true,
    });
    expect(withoutSession.success).toBe(true);
  });

  it('expose les permissions trainings aux managers mais pas aux lecteurs', () => {
    expect(hasPermission(ADMIN_ROLES.SUPER_ADMIN, 'trainings.manage')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'trainings.write')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.EVENTS_MANAGER, 'trainings.export')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.IDEAS_READER, 'trainings.view')).toBe(false);
  });
});

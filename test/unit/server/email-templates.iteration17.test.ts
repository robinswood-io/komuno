import { describe, expect, it } from 'vitest';

import {
  createNewEventEmailTemplate,
  createNewIdeaEmailTemplate,
  createNewLoanItemEmailTemplate,
  createNewMemberProposalEmailTemplate,
} from '../../../server/email-templates.js';

describe('server/email-templates.js - iteration 17 remaining branches', () => {
  it('idea template keeps custom status and omits description/deadline blocks when absent', () => {
    const template = createNewIdeaEmailTemplate(
      {
        title: 'Idée sans détails',
        proposedByEmail: 'nouvelle-idee@example.com',
        status: 'archived',
      },
      'Camille',
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    expect(template.subject).toBe('Nouvelle idée : Idée sans détails');
    expect(template.html).toContain('Camille');
    expect(template.html).toContain('nouvelle-idee@example.com');
    expect(template.html).toContain('archived');
    expect(template.html).not.toContain('Échéance');
    expect(template.html).not.toContain('border-left: 3px solid #e0e0e0');
  });

  it('event template omits optional rows when location is empty and maxParticipants is zero', () => {
    const template = createNewEventEmailTemplate(
      {
        title: 'Atelier minimal',
        date: '2026-07-14T09:15:00.000Z',
        location: '',
        maxParticipants: 0,
      },
      'Morgan',
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    expect(template.subject).toBe('Nouvel événement : Atelier minimal');
    expect(template.html).toContain('Morgan');
    expect(template.html).not.toContain('participants max');
    expect(template.html).not.toContain('>Lieu<');
    expect(template.html).toContain('Nouvel événement');
  });

  it('member proposal template builds CRM link and omits optional notes block when notes absent', () => {
    const template = createNewMemberProposalEmailTemplate(
      {
        firstName: 'Inès',
        lastName: 'Durand',
        email: 'ines@example.com',
        proposedBy: 'Nora',
      },
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    expect(template.subject).toBe('Nouveau membre proposé : Inès Durand');
    expect(template.html).toContain('https://admin.example.com/members');
    expect(template.html).toContain('Inès Durand');
    expect(template.html).toContain('Nora');
    expect(template.html).not.toContain('<strong>Notes :</strong>');
  });

  it('loan item template omits description card when description is missing', () => {
    const template = createNewLoanItemEmailTemplate(
      {
        title: 'Micro HF',
        lenderName: 'Sami',
        proposedBy: 'Léa',
        proposedByEmail: 'lea@example.com',
      },
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    expect(template.subject).toBe('Nouveau matériel proposé au prêt : Micro HF');
    expect(template.html).toContain('Sami');
    expect(template.html).toContain('Léa');
    expect(template.html).toContain('lea@example.com');
    expect(template.html).not.toContain('border-left: 3px solid #e0e0e0');
  });
});

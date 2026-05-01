import { describe, expect, it } from 'vitest';

import {
  createNewEventEmailTemplate,
  createNewIdeaEmailTemplate,
  createNewLoanItemEmailTemplate,
  createNewMemberProposalEmailTemplate,
  createTestEmailTemplate,
} from '../../../server/email-templates.js';

describe('server/email-templates.js - iteration 16', () => {
  it('renders idea template with optional fields and newline formatting', () => {
    const tpl = createNewIdeaEmailTemplate(
      {
        title: 'Idée A',
        description: 'Ligne 1\nLigne 2',
        proposedByEmail: 'idea@example.com',
        status: 'pending',
        deadline: '2026-05-10T10:00:00.000Z',
      },
      'Alice',
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    expect(tpl.subject).toContain('Nouvelle idée : Idée A');
    expect(tpl.html).toContain('Ligne 1<br>Ligne 2');
    expect(tpl.html).toContain('En attente');
    expect(tpl.html).toContain('https://admin.example.com');
  });

  it('renders event template with and without optional fields', () => {
    const full = createNewEventEmailTemplate(
      {
        title: 'Événement A',
        description: 'Desc\nEvent',
        date: '2026-06-01T12:30:00.000Z',
        location: 'Paris',
        maxParticipants: 42,
      },
      'Bob',
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    const minimal = createNewEventEmailTemplate(
      {
        title: 'Événement B',
        date: '2026-06-02T12:30:00.000Z',
      },
      'Bob',
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    expect(full.subject).toContain('Nouvel événement');
    expect(full.html).toContain('Paris');
    expect(full.html).toContain('42 participants max');
    expect(minimal.html).not.toContain('participants max');
  });

  it('renders member proposal template optional company/phone/role/notes branches', () => {
    const withOptional = createNewMemberProposalEmailTemplate(
      {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jd@example.com',
        company: 'ACME',
        phone: '0102030405',
        role: 'CTO',
        proposedBy: 'Claire',
        notes: 'Note 1\nNote 2',
      },
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    const withoutOptional = createNewMemberProposalEmailTemplate(
      {
        firstName: 'Paul',
        lastName: 'Martin',
        email: 'pm@example.com',
        proposedBy: 'Claire',
      },
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    expect(withOptional.subject).toContain('Nouveau membre proposé');
    expect(withOptional.html).toContain('ACME');
    expect(withOptional.html).toContain('0102030405');
    expect(withOptional.html).toContain('CTO');
    expect(withOptional.html).toContain('Note 1<br>');

    expect(withoutOptional.html).not.toContain('Société');
    expect(withoutOptional.html).not.toContain('Téléphone');
    expect(withoutOptional.html).not.toContain('<strong>Notes :</strong>');
  });

  it('renders loan item template with description branch and contact values', () => {
    const tpl = createNewLoanItemEmailTemplate(
      {
        title: 'Projecteur',
        description: 'Bon état\n4K',
        lenderName: 'Marc',
        proposedBy: 'Sophie',
        proposedByEmail: 'sophie@example.com',
      },
      { adminDashboardUrl: 'https://admin.example.com' },
    );

    expect(tpl.subject).toContain('Nouveau matériel proposé au prêt');
    expect(tpl.html).toContain('Bon état<br>4K');
    expect(tpl.html).toContain('sophie@example.com');
  });

  it('renders test email template', () => {
    const tpl = createTestEmailTemplate();
    expect(tpl.subject).toContain('Test configuration email');
    expect(tpl.html).toContain('Configuration email réussie');
    expect(tpl.html).toContain('OVH SMTP');
  });
});

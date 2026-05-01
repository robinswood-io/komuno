import { describe, expect, it } from 'vitest';

import {
  createNewEventEmailTemplate,
  createNewIdeaEmailTemplate,
  createNewLoanItemEmailTemplate,
  createNewMemberProposalEmailTemplate,
  createTestEmailTemplate,
} from '../../../server/email-templates.js';
import { brandingCore, getShortAppName } from '../../../lib/config/branding-core';

describe('server/email-templates.js - iteration 1 focused branches', () => {
  it('idea template maps pending status label and keeps unknown status as-is', () => {
    const pendingTemplate = createNewIdeaEmailTemplate(
      {
        title: 'Idée pending',
        proposedByEmail: 'pending@example.com',
        status: 'pending',
      },
      'Alice',
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    const customTemplate = createNewIdeaEmailTemplate(
      {
        title: 'Idée custom',
        proposedByEmail: 'custom@example.com',
        status: 'validated',
      },
      'Bob',
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    expect(pendingTemplate.html).toContain('En attente');
    expect(customTemplate.html).toContain('validated');
  });

  it('event template always includes organizer and formatted date row', () => {
    const template = createNewEventEmailTemplate(
      {
        title: 'Rencontre mensuelle',
        date: '2026-09-21T18:45:00.000Z',
      },
      'Camille',
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    expect(template.subject).toBe('Nouvel événement : Rencontre mensuelle');
    expect(template.html).toContain('Camille');
    expect(template.html).toContain('Date');
    expect(template.html).toContain('2026');
  });

  it('member proposal template transforms notes line breaks and uses CRM deep link', () => {
    const template = createNewMemberProposalEmailTemplate(
      {
        firstName: 'Nina',
        lastName: 'Martin',
        email: 'nina@example.com',
        proposedBy: 'Lucas',
        notes: 'Première ligne\nSeconde ligne',
      },
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    expect(template.subject).toBe('Nouveau membre proposé : Nina Martin');
    expect(template.html).toContain('Première ligne<br>Seconde ligne');
    expect(template.html).toContain('https://admin.komuno.test/members');
  });

  it('loan item template keeps fixed validation status text', () => {
    const template = createNewLoanItemEmailTemplate(
      {
        title: 'Caméra 4K',
        lenderName: 'Sophie',
        proposedBy: 'Marc',
        proposedByEmail: 'marc@example.com',
      },
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    expect(template.subject).toBe('Nouveau matériel proposé au prêt : Caméra 4K');
    expect(template.html).toContain('En attente de validation');
    expect(template.html).toContain('marc@example.com');
  });

  it('test email template includes app short name and organization full name', () => {
    const template = createTestEmailTemplate();

    expect(template.subject).toBe(`Test configuration email - ${getShortAppName()}`);
    expect(template.html).toContain(brandingCore.organization.fullName);
    expect(template.html).toContain('Configuration email réussie');
  });
});


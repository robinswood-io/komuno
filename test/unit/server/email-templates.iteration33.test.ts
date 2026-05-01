import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createNewEventEmailTemplate,
  createNewIdeaEmailTemplate,
  createNewLoanItemEmailTemplate,
  createNewMemberProposalEmailTemplate,
  createTestEmailTemplate,
} from '../../../server/email-templates.js';
import { brandingCore, getShortAppName } from '../../../lib/config/branding-core';

describe('server/email-templates.js - iteration 33 strict rendering checks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats event date with fr-FR locale and full weekday/hour options', () => {
    const toLocaleDateStringSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('mardi 14 juillet 2026 à 09:15');

    const template = createNewEventEmailTemplate(
      {
        title: 'Petit-déjeuner réseau',
        date: '2026-07-14T09:15:00.000Z',
      },
      'Romain',
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    expect(template.subject).toBe('Nouvel événement : Petit-déjeuner réseau');
    expect(toLocaleDateStringSpy).toHaveBeenCalledWith('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(template.html).toContain('mardi 14 juillet 2026 à 09:15');
  });

  it('replaces all newline occurrences in idea and member notes blocks', () => {
    const ideaTemplate = createNewIdeaEmailTemplate(
      {
        title: 'Idée en 3 lignes',
        description: 'L1\nL2\nL3',
        proposedByEmail: 'idee@example.com',
        status: 'pending',
      },
      'Aurore',
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    const memberTemplate = createNewMemberProposalEmailTemplate(
      {
        firstName: 'Noa',
        lastName: 'Bernard',
        email: 'noa@example.com',
        proposedBy: 'Yanis',
        notes: 'Note A\nNote B\nNote C',
      },
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    expect(ideaTemplate.html).toContain('L1<br>L2<br>L3');
    expect(memberTemplate.html).toContain('Note A<br>');
    expect(memberTemplate.html).toContain('Note B<br>');
    expect(memberTemplate.html).toContain('Note C');
  });

  it('renders test template with deterministic timestamp and branding markers', () => {
    const toLocaleStringSpy = vi
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('01/05/2026 09:00:00');

    const template = createTestEmailTemplate();

    expect(template.subject).toBe(`Test configuration email - ${getShortAppName()}`);
    expect(toLocaleStringSpy).toHaveBeenCalledWith('fr-FR');
    expect(template.html).toContain('01/05/2026 09:00:00');
    expect(template.html).toContain(brandingCore.organization.fullName);
    expect(template.html).toContain('Système de notifications automatiques');
  });

  it('builds admin links for member proposal and loan item templates', () => {
    const memberTemplate = createNewMemberProposalEmailTemplate(
      {
        firstName: 'Lina',
        lastName: 'Perez',
        email: 'lina@example.com',
        proposedBy: 'Sacha',
      },
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    const loanTemplate = createNewLoanItemEmailTemplate(
      {
        title: 'Enceinte mobile',
        lenderName: 'Mathis',
        proposedBy: 'Ines',
        proposedByEmail: 'ines@example.com',
      },
      { adminDashboardUrl: 'https://admin.komuno.test' },
    );

    expect(memberTemplate.html).toContain('href="https://admin.komuno.test/members"');
    expect(loanTemplate.html).toContain('href="https://admin.komuno.test"');
    expect(loanTemplate.subject).toBe('Nouveau matériel proposé au prêt : Enceinte mobile');
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV } from '@/app/(protected)/admin/members/page';

describe('exportToCSV', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when members list is empty', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    exportToCSV([]);

    expect(createElementSpy).not.toHaveBeenCalledWith('a');
  });

  it('creates a download link with expected csv filename when members exist', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test-url');

    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const anchorElement = originalCreateElement('a');
    anchorElement.click = clickMock;

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return anchorElement;
      }
      return originalCreateElement(tagName);
    });

    exportToCSV([
      {
        email: 'membre@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        status: 'active',
        engagementScore: 82,
      },
    ]);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(anchorElement.getAttribute('href')).toBe('blob:test-url');
    expect(anchorElement.getAttribute('download')).toMatch(/^membres-cjd-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('escapes csv fields and formats dates/statuses correctly', async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test-url');

    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const anchorElement = originalCreateElement('a');
    anchorElement.click = clickMock;

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return anchorElement;
      }
      return originalCreateElement(tagName);
    });

    const members = [
      {
        email: 'active@example.com',
        firstName: 'Jean;Claude',
        lastName: 'Dupont "Senior"',
        status: 'active',
        engagementScore: 99,
        firstContactDate: '2026-04-01T00:00:00.000Z',
        appointmentDate: '2026-04-15T00:00:00.000Z',
      },
      {
        email: 'prospect@example.com',
        firstName: 'Prospect',
        lastName: 'R1',
        status: 'inactive',
        prospectionStatus: 'R1' as const,
      },
      {
        email: 'invalid-date@example.com',
        firstName: 'Invalid',
        lastName: 'Date',
        status: 'proposed',
        firstContactDate: 'not-a-date',
      },
    ];

    exportToCSV(members);

    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);

    const blobArg = createObjectUrlSpy.mock.calls[0]?.[0];
    expect(blobArg).toBeInstanceOf(Blob);

    const csvText = await (blobArg as Blob).text();
    expect(csvText).toContain('Prénom;Nom;Email');
    expect(csvText).toContain('"Jean;Claude"');
    expect(csvText).toContain('"Dupont ""Senior"""');
    expect(csvText).toContain('01/04/2026');
    expect(csvText).toContain('15/04/2026');
    expect(csvText).toContain('active;99');
    expect(csvText).toContain('R1;');
    expect(csvText).toContain('invalid-date@example.com');
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ProspectsPage, { formatDate, getStageColor, getStageConfig } from '@/app/(protected)/admin/prospects/page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/FeatureConfigContext', () => ({
  useFeatureConfig: () => ({
    isFeatureEnabled: () => false,
  }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useQuery: () => ({ data: undefined, isLoading: false }),
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

describe('prospects helpers', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('returns active stage config for known stage', () => {
    const config = getStageConfig('R1');

    expect(config?.value).toBe('R1');
    expect(config?.label).toContain('Premier RDV');
  });

  it('returns null stage config for unknown stage', () => {
    const config = getStageConfig('UNKNOWN_STAGE');

    expect(config).toBeNull();
  });

  it('returns archived color for archived statuses', () => {
    expect(getStageColor('Refusé')).toContain('bg-gray-100');
  });

  it('returns default color for empty status', () => {
    expect(getStageColor(null)).toContain('bg-gray-100');
  });

  it('formats date in fr-FR dd/mm/yyyy format', () => {
    expect(formatDate('2026-03-15T00:00:00.000Z')).toBe('15/03/2026');
  });

  it('returns em dash for missing date', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns formatted archived stage color for unknown archived stage', () => {
    expect(getStageColor('Signé')).toContain('text-gray-600');
  });

  it('renders CRM disabled state and redirects to modules settings', () => {
    render(createElement(ProspectsPage));

    expect(screen.getByText('Module CRM désactivé')).toBeTruthy();
    const settingsButton = screen.getByRole('button', { name: /paramètres modules/i });
    fireEvent.click(settingsButton);
    expect(pushMock).toHaveBeenCalledWith('/admin/settings?tab=modules');
  });
});

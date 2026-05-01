// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '@/app/(public)/page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/components/ideas-section', () => ({
  default: ({ onNavigateToPropose }: { onNavigateToPropose: () => void }) => (
    <button onClick={onNavigateToPropose}>Proposer une idée</button>
  ),
}));

vi.mock('@/components/events-section', () => ({
  default: () => <div>Events section</div>,
}));

vi.mock('@/contexts/BrandingContext', () => ({
  useBranding: () => ({
    branding: {
      app: { shortName: 'Komuno' },
      organization: { fullName: 'Organisation Test' },
    },
  }),
}));

vi.mock('@/contexts/FeatureConfigContext', () => ({
  useFeatureConfig: () => ({
    isFeatureEnabled: (_feature: string) => true,
  }),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ version: '1.2.3' }),
        })
      )
    );
  });

  it('navigates to admin when clicking Administration label', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByTestId('link-admin'));

    expect(pushMock).toHaveBeenCalledWith('/admin');
  });

  it('shows version tag when version endpoint returns a version', async () => {
    render(<HomePage />);

    await waitFor(() => {
      const versionTag = screen.getByTestId('version-tag');
      expect(versionTag.textContent).toContain('Version 1.2.3');
    });
  });

  it('falls back to /api/version when /version.json fails', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('version file missing'))
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ version: '9.9.9' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('version-tag').textContent).toContain('Version 9.9.9');
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/version.json', { cache: 'no-store' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/version');
  });

  it('navigates to /propose from ideas section callback', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Proposer une idée' }));

    expect(pushMock).toHaveBeenCalledWith('/propose');
  });
});

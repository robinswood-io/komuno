// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiretSearch, type SiretCompanyData } from '@/components/ui/siret-search';

type ApiResult = {
  nom_complet?: string;
  siege?: {
    libelle_commune?: string;
    code_postal?: string;
    departement?: string;
    activite_principale_registre_metier?: string;
  };
  siren?: string;
};

type FetchPayload = {
  results?: ApiResult[];
};

type MockResponse = {
  ok: boolean;
  json: () => Promise<FetchPayload>;
};

describe('SiretSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders trigger button and respects disabled prop', () => {
    const onSelect = vi.fn<(data: SiretCompanyData) => void>();
    render(<SiretSearch onSelect={onSelect} disabled />);

    const triggerButton = screen.getByRole('button', { name: /chercher via siret/i });
    expect(triggerButton).toBeTruthy();
    expect((triggerButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not call API when query has less than 2 characters', async () => {
    const onSelect = vi.fn<(data: SiretCompanyData) => void>();
    const fetchMock = vi.fn<[input: RequestInfo | URL], Promise<MockResponse>>();
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SiretSearch onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /chercher via siret/i }));
    const input = screen.getByPlaceholderText(/nom de l'entreprise/i);

    await user.type(input, 'a');
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches, displays mapped result and fires onSelect callback', async () => {
    const onSelect = vi.fn<(data: SiretCompanyData) => void>();

    const fetchMock = vi.fn<[input: RequestInfo | URL], Promise<MockResponse>>();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            nom_complet: 'ACME FRANCE',
            siege: {
              libelle_commune: 'PARIS',
              code_postal: '75001',
              departement: '75',
              activite_principale_registre_metier: 'SERVICES NUMERIQUES',
            },
            siren: '123456789',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SiretSearch onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /chercher via siret/i }));
    const input = screen.getByPlaceholderText(/nom de l'entreprise/i);

    await user.type(input, 'acme france');
    await new Promise((resolve) => setTimeout(resolve, 450));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock.mock.calls[0]?.[0].toString()).toContain('q=acme%20france');

    const resultButton = await screen.findByRole('button', { name: /acme france/i });
    await user.click(resultButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      company: 'Acme France',
      city: 'Paris',
      postalCode: '75001',
      department: '75',
      sector: 'Services Numeriques',
      siren: '123456789',
    });
  });

  it('shows an error message when API response is not ok', async () => {
    const onSelect = vi.fn<(data: SiretCompanyData) => void>();

    const fetchMock = vi.fn<[input: RequestInfo | URL], Promise<MockResponse>>();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SiretSearch onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /chercher via siret/i }));
    const input = screen.getByPlaceholderText(/nom de l'entreprise/i);

    await user.type(input, 'acme');
    await new Promise((resolve) => setTimeout(resolve, 450));

    await waitFor(() => {
      expect(screen.getByText(/impossible de contacter l'api siret/i)).toBeTruthy();
    });
  });
});

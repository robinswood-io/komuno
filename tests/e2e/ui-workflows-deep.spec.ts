import { expect, test, type Page, type APIRequestContext } from '@playwright/test';

const runDeepUi = process.env.E2E_DEEP_UI === '1';

type JsonResponse<T = unknown> = {
  success?: boolean;
  data?: T;
  total?: number;
};

type EventSummary = {
  id: string;
  title?: string;
};

async function expectJsonOk(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.ok(), `${path} should respond ${response.status()}`).toBe(true);
  const payload = await response.json() as JsonResponse;
  if ('success' in payload) expect(payload.success, `${path} success flag`).not.toBe(false);
  return payload;
}

async function collectPageIssues(page: Page, route: string, action: () => Promise<void>) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onPageError = (error: Error) => {
    pageErrors.push((error.stack || error.message || String(error)).slice(0, 1_000));
  };
  const onRequestFailed = (request: { method: () => string; url: () => string; failure: () => { errorText: string } | null }) => {
    const failure = request.failure()?.errorText ?? '';
    const url = request.url();
    // Browser/router navigations routinely abort in-flight prefetch and React Query GETs.
    if (failure === 'net::ERR_ABORTED') return;
    failedRequests.push(`${request.method()} ${url} ${failure}`);
  };
  const onResponse = (response: { status: () => number; url: () => string }) => {
    const status = response.status();
    const url = response.url();
    if (status < 400) return;
    // Some browser-level assets such as favicon can legitimately be absent without breaking a workflow.
    if (url.endsWith('/favicon.ico')) return;
    badResponses.push(`${status} ${url}`);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);
  try {
    await action();
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }

  expect.soft(consoleErrors, `${route} console errors`).toEqual([]);
  expect.soft(pageErrors, `${route} page errors`).toEqual([]);
  expect.soft(failedRequests, `${route} failed requests`).toEqual([]);
  expect.soft(badResponses, `${route} HTTP 4xx/5xx responses`).toEqual([]);
}

test.describe('Deep UI workflows — demo/smoke', () => {
  test.skip(!runDeepUi, 'Set E2E_DEEP_UI=1 to run deep UI workflow checks. Use demo.komuno.org or authenticated env.');
  test.setTimeout(180_000);

  test('critical API endpoints used by UI are healthy', async ({ request }) => {
    const events = await expectJsonOk(request, '/api/events?limit=5') as JsonResponse<EventSummary[]>;
    const firstEvent = Array.isArray(events.data) ? events.data[0] : undefined;

    await expectJsonOk(request, '/api/tools/categories');
    await expectJsonOk(request, '/api/tools');
    await expectJsonOk(request, '/api/tools/featured');
    await expectJsonOk(request, '/api/admin/tools/categories?includeInactive=true');
    await expectJsonOk(request, '/api/admin/tools/stats');
    await expectJsonOk(request, '/api/admin/tools?includeInactive=true');
    await expectJsonOk(request, '/api/admin/member-statuses?isActive=true');

    if (firstEvent?.id) {
      await expectJsonOk(request, `/api/public/events/${encodeURIComponent(firstEvent.id)}/sponsorships`);
      await expectJsonOk(request, `/api/admin/events/${encodeURIComponent(firstEvent.id)}/operations/summary`);
    }
  });

  test('public and admin pages render without console/network failures', async ({ page, request }) => {
    const events = await expectJsonOk(request, '/api/events?limit=1') as JsonResponse<EventSummary[]>;
    const firstEvent = Array.isArray(events.data) ? events.data[0] : undefined;

    const routes = [
      '/',
      '/events',
      '/ideas',
      '/propose',
      '/tools',
      '/loan',
      '/loans',
      '/statuts',
      '/changelog',
      '/admin',
      '/admin/dashboard',
      '/admin/events',
      ...(firstEvent?.id ? [`/admin/events/${encodeURIComponent(firstEvent.id)}/operations`] : []),
      '/admin/ideas',
      '/admin/members',
      '/admin/members/groups',
      '/admin/members/member-graph',
      '/admin/members/stats',
      '/admin/members/tasks',
      '/admin/forms',
      '/admin/trainings',
      '/admin/federation',
      '/admin/integrations',
      '/admin/automations',
      '/admin/features',
      '/admin/financial',
      '/admin/tracking',
      '/admin/audit',
      '/admin/development-requests',
      '/admin/settings',
      '/admin/settings/statuses',
      '/admin/tools',
      '/admin/notifications',
      '/admin/patrons',
      '/admin/prospects',
      '/admin/loans',
      '/admin/branding',
    ];

    for (const route of routes) {
      await collectPageIssues(page, route, async () => {
        const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        expect(response?.status(), `${route} document status`).toBeLessThan(400);
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('body')).not.toContainText(/This page couldn.t load|Application error|Internal server error|Unhandled Runtime Error/i);
      });
    }
  });

  test('public proposal tabs remain usable', async ({ page }) => {
    await collectPageIssues(page, '/propose interactions', async () => {
      await page.goto('/propose', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Proposer / Participer')).toBeVisible();
      await page.getByRole('button', { name: /formation/i }).click();
      await expect(page.getByRole('button', { name: /manifester mon intérêt/i })).toBeVisible();
      await page.getByRole('button', { name: /idée/i }).click();
      await expect(page.getByText('Titre de l’idée *')).toBeVisible();
    });
  });

  test('forms workflow: admin creates, public submits, admin reads, cleanup', async ({ page }) => {
    const suffix = Date.now();
    const slug = `deep-ui-form-${suffix}`;
    let formId: string | undefined;

    const adminFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
      return await page.evaluate(async ({ path, init }) => {
        const response = await fetch(path, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
          },
        });
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};
        if (!response.ok) throw new Error(payload?.message || `${response.status} ${response.statusText}`);
        return payload;
      }, { path, init: init ? { ...init, body: init.body?.toString() } : undefined }) as T;
    };

    await page.goto('/admin/forms', { waitUntil: 'domcontentloaded' });

    try {
      const created = await adminFetch<{ data: { id: string; slug: string } }>('/api/admin/forms', {
        method: 'POST',
        body: JSON.stringify({
          title: `Deep UI Form ${suffix}`,
          slug,
          status: 'published',
          collectRespondentInfo: true,
          allowMultipleSubmissions: true,
          requireConsent: true,
          consentText: 'J’accepte le traitement de mes réponses de test.',
          successMessage: 'Réponse Deep UI enregistrée.',
          questions: [
            { label: 'Commentaire Deep UI', type: 'text', required: true, options: [] },
            { label: 'Satisfaction Deep UI', type: 'rating', required: true, options: [] },
          ],
        }),
      });
      formId = created.data.id;
      expect(created.data.slug).toBe(slug);

      await collectPageIssues(page, `/forms/${slug}`, async () => {
        await page.goto(`/forms/${slug}`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(`Deep UI Form ${suffix}`)).toBeVisible();
        const inputs = page.locator('input');
        await inputs.nth(0).fill('Répondant Deep UI');
        await inputs.nth(1).fill(`deep-ui-${suffix}@example.com`);
        await inputs.nth(2).fill('Réponse Deep UI structurée');
        await page.getByText('Note de 1 à 5').click();
        await page.getByRole('option', { name: '5' }).click();
        await page.getByText('J’accepte le traitement').click();
        await page.getByRole('button', { name: /envoyer ma réponse/i }).click();
        await expect(page.getByRole('heading', { name: 'Réponse enregistrée' })).toBeVisible();
      });

      const responses = await adminFetch<{ data: { rows: Array<Record<string, unknown>> } }>(`/api/admin/forms/${formId}/responses`);
      expect(JSON.stringify(responses.data.rows)).toContain('Réponse Deep UI structurée');
    } finally {
      if (formId) {
        await adminFetch(`/api/admin/forms/${formId}`, { method: 'DELETE' }).catch(() => null);
      }
    }
  });
});

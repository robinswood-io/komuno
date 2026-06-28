import { expect, test } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function adminFetch<T>(page: import('@playwright/test').Page, url: string, init?: RequestInit): Promise<T> {
  return await page.evaluate(async ({ url, init }) => {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(payload?.message || `${response.status} ${response.statusText}`);
    }
    return payload;
  }, { url, init: init ? { ...init, body: init.body?.toString() } : undefined }) as T;
}

test.describe('Formulaires & sondages — E2E admin/public', () => {
  test.skip(!adminEmail || !adminPassword, 'Définir E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD pour activer cet E2E.');

  test('admin crée/publie, public répond, admin voit la réponse puis nettoie', async ({ page }) => {
    const suffix = Date.now();
    const slug = `e2e-formulaire-${suffix}`;
    let formId: string | null = null;

    await page.goto('/login');
    await page.getByLabel('Email').fill(adminEmail!);
    await page.getByLabel('Mot de passe').fill(adminPassword!);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/admin|\/$/, { timeout: 20_000 });

    try {
      const created = await adminFetch<{ data: { id: string; slug: string } }>(page, '/api/admin/forms', {
        method: 'POST',
        body: JSON.stringify({
          title: `E2E Formulaire ${suffix}`,
          slug,
          status: 'published',
          collectRespondentInfo: true,
          allowMultipleSubmissions: true,
          requireConsent: true,
          consentText: 'J’accepte le traitement E2E de mes réponses.',
          successMessage: 'Réponse E2E bien enregistrée.',
          questions: [
            { label: 'Commentaire E2E', type: 'text', required: true, options: [] },
            { label: 'Satisfaction E2E', type: 'rating', required: true, options: [] },
          ],
        }),
      });
      formId = created.data.id;
      expect(created.data.slug).toBe(slug);

      await page.goto(`/forms/${slug}`);
      await expect(page.getByRole('heading', { name: `E2E Formulaire ${suffix}` })).toBeVisible();
      const inputs = page.locator('input');
      await inputs.nth(0).fill('Répondant E2E');
      await inputs.nth(1).fill(`e2e-${suffix}@example.com`);
      await inputs.nth(2).fill('Réponse structurée E2E');
      await page.getByText('Note de 1 à 5').click();
      await page.getByRole('option', { name: '5' }).click();
      await page.getByText('J’accepte le traitement E2E').click();
      await page.getByRole('button', { name: /envoyer ma réponse/i }).click();
      await expect(page.getByRole('heading', { name: 'Réponse enregistrée' })).toBeVisible();
      await expect(page.getByText('Réponse E2E bien enregistrée.')).toBeVisible();

      const responses = await adminFetch<{ data: { rows: Array<Record<string, unknown>> } }>(page, `/api/admin/forms/${formId}/responses`);
      expect(responses.data.rows.length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(responses.data.rows)).toContain('Réponse structurée E2E');

      const stats = await adminFetch<{ data: { totalResponses: number } }>(page, `/api/admin/forms/${formId}/stats`);
      expect(stats.data.totalResponses).toBeGreaterThanOrEqual(1);
    } finally {
      if (formId) {
        await adminFetch(page, `/api/admin/forms/${formId}`, { method: 'DELETE' }).catch(() => null);
      }
    }
  });
});

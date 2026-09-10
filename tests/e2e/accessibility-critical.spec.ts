import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const enabled = process.env.E2E_ACCESSIBILITY === '1' || process.env.E2E_DEEP_UI === '1';
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const publicRoutes = ['/', '/events', '/ideas', '/propose', '/tools', '/loan', '/statuts', '/changelog', '/login'];

async function expectNoBlockingViolations(page: Page, route: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
  expect(blocking, `${route} ne doit contenir aucune violation axe critique ou sérieuse`).toEqual([]);
}

test.describe('Accessibilité des parcours prioritaires', () => {
  test.skip(!enabled, 'Définir E2E_ACCESSIBILITY=1 pour contrôler les parcours rendus.');

  for (const route of publicRoutes) {
    test(`${route} respecte WCAG A/AA sans violation bloquante`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
      await expectNoBlockingViolations(page, route);
    });
  }

  test('le parcours Proposer / Participer est utilisable au clavier', async ({ page }) => {
    await page.goto('/propose', { waitUntil: 'networkidle' });
    const training = page.getByRole('button', { name: 'Formation', exact: true });
    await training.focus();
    await expect(training).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(training).toHaveAttribute('aria-pressed', 'true');
    const idea = page.getByRole('button', { name: 'Idée', exact: true });
    await idea.focus();
    await page.keyboard.press('Space');
    await expect(idea).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Titre de l’idée *')).toBeVisible();
  });

  test('les pages publiques ne débordent pas sur un mobile de 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['/', '/events', '/propose', '/tools', '/loan']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} ne doit pas déborder horizontalement`).toBeLessThanOrEqual(1);
    }
  });

  test('les pages administrateur prioritaires sont accessibles après authentification', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'Identifiants E2E administrateur requis pour les pages protégées.');
    await page.goto('/login');
    await page.getByLabel('Email').fill(adminEmail!);
    await page.getByLabel('Mot de passe').fill(adminPassword!);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/admin|\/$/, { timeout: 20_000 });
    for (const route of ['/admin/members', '/admin/ideas', '/admin/events', '/admin/financial', '/admin/loans', '/admin/forms']) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expectNoBlockingViolations(page, route);
    }
  });
});

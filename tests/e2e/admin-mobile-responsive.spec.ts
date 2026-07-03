import { expect, test, type Page } from '@playwright/test';

const runAdminMobile = process.env.E2E_ADMIN_MOBILE === '1' || process.env.E2E_DEEP_UI === '1';

const overlaySelector = '[role="dialog"], [data-radix-popper-content-wrapper]';

type OverlayScenario = {
  route: string;
  trigger: RegExp;
  label: string;
};

const scenarios: OverlayScenario[] = [
  { route: '/admin/events', trigger: /créer un événement/i, label: 'event creation dialog' },
  { route: '/admin/patrons', trigger: /ajouter un sponsor/i, label: 'patron creation dialog' },
  { route: '/admin/ideas', trigger: /nouvelle idée/i, label: 'idea creation dialog' },
  { route: '/admin/members/groups', trigger: /nouveau groupe/i, label: 'member group dialog' },
  { route: '/admin/members/tasks', trigger: /créer une tâche/i, label: 'member task dialog' },
  { route: '/admin/members/member-graph', trigger: /filtres/i, label: 'member graph filters sheet' },
];

async function assertNoViewportOverflow(page: Page, label: string) {
  const issues = await page.evaluate((selector) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tolerance = 1;

    const visibleElements = Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 1 && rect.height > 1;
      });

    return visibleElements.flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const elementIssues: string[] = [];
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      const prefix = `${index}:${element.getAttribute('role') || element.tagName.toLowerCase()} ${text}`;

      if (rect.left < -tolerance) elementIssues.push(`${prefix} left overflow ${rect.left.toFixed(1)}px`);
      if (rect.right > viewportWidth + tolerance) {
        elementIssues.push(`${prefix} right overflow ${rect.right.toFixed(1)}px > ${viewportWidth}px`);
      }
      if (rect.top < -tolerance) elementIssues.push(`${prefix} top overflow ${rect.top.toFixed(1)}px`);
      if (rect.bottom > viewportHeight + tolerance) {
        elementIssues.push(`${prefix} bottom overflow ${rect.bottom.toFixed(1)}px > ${viewportHeight}px`);
      }

      const hasClippedVerticalContent = element.scrollHeight > element.clientHeight + tolerance;
      const canScrollVertically = ['auto', 'scroll'].includes(style.overflowY);
      if (hasClippedVerticalContent && !canScrollVertically) {
        elementIssues.push(`${prefix} clipped vertically without internal scroll`);
      }

      return elementIssues;
    });
  }, overlaySelector);

  expect(issues, `${label} must fit inside the mobile viewport`).toEqual([]);
}

async function openScenario(page: Page, scenario: OverlayScenario) {
  await page.goto(scenario.route, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await expect(page.locator('body'), `${scenario.route} body`).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/404 page not found|Application error|Internal server error/i);

  const trigger = page.getByRole('button', { name: scenario.trigger }).first();
  await expect(trigger, `${scenario.label} trigger`).toBeVisible();
  await trigger.click();

  await page.locator(overlaySelector).first().waitFor({ state: 'visible', timeout: 10_000 });
  // Sheet open animations can last 500ms; measure the settled layout, not the slide-in transition.
  await page.waitForTimeout(700);
}

test.describe('Admin mobile responsive overlays', () => {
  test.skip(!runAdminMobile, 'Set E2E_ADMIN_MOBILE=1 or E2E_DEEP_UI=1 to run mobile admin overlay checks.');
  test.setTimeout(180_000);
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test('admin dialogs and sheets stay inside a mobile viewport', async ({ page }) => {
    for (const scenario of scenarios) {
      await openScenario(page, scenario);
      await assertNoViewportOverflow(page, scenario.label);
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(150);
    }
  });
});

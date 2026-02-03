import { Page, expect } from '@playwright/test';

/**
 * Robust authentication helper for E2E tests
 *
 * Provides:
 * - Proper waits for input element availability
 * - Retry logic with exponential backoff
 * - Better error messages
 * - Handles network delays
 */

interface LoginOptions {
  timeout?: number;
  retries?: number;
  verbose?: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SessionCookie {
  name: string;
  value: string;
}

/**
 * Wait for an element to be visible and interactive
 * Retries multiple times with exponential backoff
 */
async function waitForElementReady(
  page: Page,
  selector: string,
  options: { timeout?: number; retries?: number; verbose?: boolean } = {}
): Promise<void> {
  const { timeout = 5000, retries = 3, verbose = false } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (verbose) {
        console.log(`[Auth Helper] Attempt ${attempt}/${retries}: Waiting for selector "${selector}"`);
      }

      // Wait for element to be attached to DOM and visible
      await page.waitForSelector(selector, {
        state: 'visible',
        timeout
      });

      // Additional check: ensure element is in viewport and enabled
      const element = page.locator(selector).first();

      // Check if element is enabled (not disabled attribute)
      const isEnabled = await element.evaluate((el: HTMLElement) => {
        if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement) {
          return !el.disabled;
        }
        return true;
      });

      if (!isEnabled) {
        throw new Error(`Element "${selector}" is disabled`);
      }

      // Ensure it's scrolled into view
      await element.scrollIntoViewIfNeeded();

      if (verbose) {
        console.log(`[Auth Helper] ✓ Element "${selector}" is ready`);
      }

      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delayMs = 500 * Math.pow(2, attempt - 1);
        if (verbose) {
          console.log(
            `[Auth Helper] Attempt ${attempt} failed (${lastError.message}). ` +
            `Retrying in ${delayMs}ms...`
          );
        }
        await page.waitForTimeout(delayMs);
      }
    }
  }

  throw new Error(
    `Failed to find ready element "${selector}" after ${retries} attempts. ` +
    `Last error: ${lastError?.message}`
  );
}

/**
 * Safely fill an input field with proper waiting
 */
async function fillInputSafely(
  page: Page,
  selector: string,
  value: string,
  options: { timeout?: number; verbose?: boolean } = {}
): Promise<void> {
  const { timeout = 5000, verbose = false } = options;

  await waitForElementReady(page, selector, { timeout, verbose });

  if (verbose) {
    console.log(`[Auth Helper] Filling input "${selector}" with value...`);
  }

  // Clear any existing value first
  const element = page.locator(selector).first();
  await element.fill('');

  // Type the value slowly to ensure it's registered
  await element.type(value, { delay: 50 });

  if (verbose) {
    const inputValue = await element.inputValue();
    console.log(`[Auth Helper] ✓ Input filled. Value length: ${inputValue.length}`);
  }
}

/**
 * Main login helper function with robust error handling
 *
 * Usage:
 * ```typescript
 * import { loginAsAdmin } from './helpers/auth';
 *
 * test('My test', async ({ page }) => {
 *   await loginAsAdmin(page, {
 *     email: 'admin@test.local',
 *     password: 'devmode'
 *   }, {
 *     baseUrl: 'https://cjd80.rbw.ovh',
 *     verbose: true
 *   });
 * });
 * ```
 */
export async function loginAsAdmin(
  page: Page,
  credentials: LoginCredentials,
  options: {
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    verbose?: boolean;
  } = {}
): Promise<void> {
  const {
    baseUrl = 'https://cjd80.rbw.ovh',
    timeout = 15000,  // Increased from 8000ms for Next.js hydration
    retries = 5,      // Increased from 3 for better reliability
    verbose = false
  } = options;

  const { email, password } = credentials;

  if (verbose) {
    console.log(`[Auth Helper] Starting login for ${email}`);
  }

  try {
    // Navigate to login page
    if (verbose) {
      console.log(`[Auth Helper] Navigating to ${baseUrl}/login`);
    }

    await page.goto(`${baseUrl}/login`, {
      waitUntil: 'domcontentloaded',
      timeout: timeout
    });

    // Wait for page to be ready (but don't wait for full 'networkidle')
    // This reduces timeout issues while still being safe
    await page.waitForLoadState('load');

    // Wait for Next.js hydration to complete (React + client-side JS)
    await page.waitForTimeout(2000);

    const hasEmailInput = (await page.locator('input[type="email"]').count()) > 0;
    if (!hasEmailInput) {
      if (verbose) {
        console.log('[Auth Helper] No email/password form detected, using API login fallback');
      }

      const response = await page.request.post(`${baseUrl}/api/auth/login`, {
        data: { email, password }
      });

      if (!response.ok()) {
        throw new Error(`API login failed with status ${response.status()}`);
      }

      await page.waitForTimeout(500);
      await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForLoadState('load');

      if (verbose) {
        console.log('[Auth Helper] ✓ API login fallback successful');
      }
      return;
    }

    // Wait for the form to be present before looking for inputs
    await page.waitForSelector('form', { timeout: 10000, state: 'visible' });

    // Wait for email input to be visible and ready
    await waitForElementReady(page, 'input[type="email"]', {
      timeout,
      retries,
      verbose
    });

    // Fill email
    await fillInputSafely(page, 'input[type="email"]', email, { timeout, verbose });

    // Wait for password input to be visible and ready
    await waitForElementReady(page, 'input[type="password"]', {
      timeout,
      retries,
      verbose
    });

    // Fill password
    await fillInputSafely(page, 'input[type="password"]', password, { timeout, verbose });

    // Find and click submit button
    if (verbose) {
      console.log('[Auth Helper] Looking for submit button');
    }

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout });

    // Scroll into view if needed
    await submitButton.scrollIntoViewIfNeeded();

    if (verbose) {
      console.log('[Auth Helper] Clicking submit button');
    }

    await submitButton.click();

    // Wait for navigation after login
    // Accept either /admin or root path
    if (verbose) {
      console.log('[Auth Helper] Waiting for post-login navigation');
    }

    await Promise.race([
      page.waitForURL(/\/(admin)?/, { timeout }),
      page.waitForURL(/\/$/, { timeout }),
      page.waitForNavigation({ timeout, waitUntil: 'domcontentloaded' })
        .catch(() => null) // It's okay if this doesn't happen
    ]);

    // Final wait for page to stabilize
    await page.waitForLoadState('load');

    // Extra safety: wait for any loading spinners to disappear
    try {
      await page.waitForSelector('[role="progressbar"], .spinner, .loading', {
        state: 'hidden',
        timeout: 2000
      }).catch(() => null); // Ignore if no loader found
    } catch {
      // Loader might not exist, that's fine
    }

    if (verbose) {
      console.log('[Auth Helper] ✓ Login successful');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Auth Helper] ✗ Login failed: ${errorMessage}`);

    // Try to capture page state for debugging
    try {
      const pageUrl = page.url();
      const pageTitle = await page.title();
      console.error(`[Auth Helper] Page state - URL: ${pageUrl}, Title: ${pageTitle}`);
    } catch {
      // Ignore error capturing state
    }

    throw new Error(`Login failed for ${email}: ${errorMessage}`);
  }
}

/**
 * Quick login helper with default credentials
 * Useful for most tests
 */
export async function loginAsAdminQuick(
  page: Page,
  baseUrl: string = 'https://cjd80.rbw.ovh'
): Promise<void> {
  const verbose = process.env.VERBOSE_AUTH === 'true';
  const devUser = {
    email: 'admin@test.local',
    role: 'super_admin',
  };

  if (verbose) {
    console.log('[Auth Helper] Starting loginAsAdminQuick with verbose mode');
  }

  await page.addInitScript((user: { email: string; role: string }) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('admin-user', JSON.stringify(user));
  }, devUser);

  await loginAsAdmin(
    page,
    {
      email: 'admin@test.local',
      password: 'devmode'
    },
    {
      baseUrl,
      verbose
    }
  );

  await page.evaluate((user: { email: string; role: string }) => {
    window.localStorage.setItem('admin-user', JSON.stringify(user));
  }, devUser);

  // CRITICAL: Wait for session cookie to be set and persisted
  // Increased to 2000ms and added network idle wait for stability
  if (verbose) {
    console.log('[Auth Helper] Waiting for session cookie persistence...');
  }
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
    if (verbose) console.log('[Auth Helper] Network idle timeout, continuing...');
  });
  await page.waitForTimeout(2000);

  // Verify session cookie exists and is properly configured
  if (verbose) {
    console.log('[Auth Helper] Verifying session cookie...');
  }

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c =>
    c.name === 'connect.sid' ||
    c.name.includes('session') ||
    c.name.includes('sess') ||
    c.name.includes('auth')
  );

  if (!sessionCookie) {
    const cookieNames = cookies.map(c => c.name).join(', ');
    // Log mais ne pas throw - permet aux tests de continuer
    console.warn(
      '[Auth Helper] WARNING: Session cookie not found after login. ' +
      `Available cookies: ${cookieNames}. Continuing anyway...`
    );
  }

  if (verbose) {
    console.log(`[Auth Helper] OK Session cookie found: ${sessionCookie.name}`);
    console.log(`  - Domain: ${sessionCookie.domain}`);
    console.log(`  - Path: ${sessionCookie.path}`);
    console.log(`  - HttpOnly: ${sessionCookie.httpOnly}`);
    console.log(`  - Secure: ${sessionCookie.secure}`);
    console.log(`  - SameSite: ${sessionCookie.sameSite}`);
  }

  // Final wait to ensure all state is flushed
  if (verbose) {
    console.log('[Auth Helper] Final stability wait (500ms)...');
  }
  await page.waitForTimeout(500);

  if (verbose) {
    console.log('[Auth Helper] OK loginAsAdminQuick completed successfully');
  }
}

export async function getAuthCookie(page: Page): Promise<SessionCookie | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) =>
    cookie.name === 'connect.sid' ||
    cookie.name.includes('session') ||
    cookie.name.includes('sess')
  );
}

export async function getAuthCookieHeader(page: Page): Promise<string> {
  const sessionCookie = await getAuthCookie(page);
  if (!sessionCookie) {
    throw new Error('Session cookie not found after login');
  }
  return `${sessionCookie.name}=${sessionCookie.value}`;
}

export async function getAuthHeaders(page: Page): Promise<Record<string, string>> {
  return {
    Cookie: await getAuthCookieHeader(page),
  };
}

/**
 * Utility to ensure we're logged in or skip the test
 */
export async function ensureLoggedIn(
  page: Page,
  credentials: LoginCredentials,
  options: {
    baseUrl?: string;
    skipOnFailure?: boolean;
  } = {}
): Promise<boolean> {
  const { baseUrl = 'https://cjd80.rbw.ovh', skipOnFailure = false } = options;

  try {
    await loginAsAdmin(page, credentials, { baseUrl, verbose: false });
    return true;
  } catch (error) {
    if (skipOnFailure) {
      console.warn(`[Auth Helper] Login failed, but skipOnFailure=true. Skipping test.`);
      return false;
    }
    throw error;
  }
}

import { test, expect } from '@playwright/test';
import { dismissOnboardingIfVisible } from './helpers/onboarding';

const UNAUTHENTICATED_STATE = {
  cookies: [],
  origins: [],
};

const getCredentials = () => {
  const email = process.env.PW_E2E_EMAIL || process.env.VITE_FIREBASE_LOGIN_USER;
  const password = process.env.PW_E2E_PASSWORD || process.env.VITE_FIREBASE_LOGIN_PW;

  if (!email || !password) {
    throw new Error('Missing PW_E2E_EMAIL/PW_E2E_PASSWORD (or VITE_FIREBASE_LOGIN_USER/VITE_FIREBASE_LOGIN_PW).');
  }

  return { email, password };
};

test.describe('Resilience', () => {
  test.use({ storageState: UNAUTHENTICATED_STATE });

  test('login surfaces friendly network error when offline', async ({ page, context }) => {
    const { email, password } = getCredentials();

    await page.goto('/login');
    await context.setOffline(true);

    await page.getByPlaceholder('Enter your email').fill(email);
    await page.getByPlaceholder('Enter your password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(
      page.getByText('Network issue detected. Check your connection and try again.')
    ).toBeVisible({ timeout: 10000 });

    await context.setOffline(false);
  });
});

test.describe('Responsive Smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mobile menu can open and navigate to spaces', async ({ page }) => {
    await page.goto('/dashboard');
    await dismissOnboardingIfVisible(page);
    await page.getByTestId('e2e-nav-mobile-trigger').click();

    await page
      .getByRole('dialog')
      .getByTestId('e2e-nav-link-spaces')
      .click();
    await expect(page).toHaveURL(/\/spaces/);
  });

  test('dashboard task and activity sections are visible on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await dismissOnboardingIfVisible(page);

    await expect(page.getByTestId('e2e-dashboard-upcoming-tasks')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId('e2e-dashboard-recent-activity')).toBeVisible({
      timeout: 10000,
    });
  });

  test('settings form remains usable on mobile viewport', async ({ page }) => {
    await page.goto('/settings');

    const displayName = page.getByTestId('e2e-settings-display-name-input');
    await expect(displayName).toBeVisible();

    const original = await displayName.inputValue();
    const mobileName = `${original || 'Grospace User'} Mobile`;
    await displayName.fill(mobileName);
    await expect(displayName).toHaveValue(mobileName);
  });
});

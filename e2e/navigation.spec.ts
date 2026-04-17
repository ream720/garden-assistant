import { test, expect } from '@playwright/test';
import { dismissOnboardingIfVisible } from './helpers/onboarding';

const UNAUTHENTICATED_STATE = {
  cookies: [],
  origins: [],
};

test.describe('Navigation & Routing', () => {
  test.describe('Public pages', () => {
    test.use({ storageState: UNAUTHENTICATED_STATE });

    test('home page is accessible without authentication', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL('/');
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('about page is accessible without authentication', async ({ page }) => {
      await page.goto('/about');
      await expect(page).toHaveURL(/\/about/);
      await expect(page).toHaveTitle(/About/);
    });

    test('login page is accessible without authentication', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveURL(/\/login/);
      await expect(page).toHaveTitle(/Sign In/);
    });

    test('register page is accessible without authentication', async ({ page }) => {
      await page.goto('/register');
      await expect(page).toHaveURL(/\/register/);
      await expect(page).toHaveTitle(/Create Account/);
    });
  });

  test.describe('Protected routes redirect to login when not authenticated', () => {
    test.use({ storageState: UNAUTHENTICATED_STATE });

    test('dashboard redirects to login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });

    test('spaces redirects to login', async ({ page }) => {
      await page.goto('/spaces');
      await expect(page).toHaveURL(/\/login/);
    });

    test('plants redirects to login', async ({ page }) => {
      await page.goto('/plants');
      await expect(page).toHaveURL(/\/login/);
    });

    test('events redirects to login', async ({ page }) => {
      await page.goto('/events');
      await expect(page).toHaveURL(/\/login/);
    });

    test('legacy notes route returns 404', async ({ page }) => {
      await page.goto('/notes');
      await expect(page).toHaveURL(/\/notes/);
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    });

    test('legacy tasks route returns 404', async ({ page }) => {
      await page.goto('/tasks');
      await expect(page).toHaveURL(/\/tasks/);
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    });

    test('profile redirects to login', async ({ page }) => {
      await page.goto('/profile');
      await expect(page).toHaveURL(/\/login/);
    });

    test('settings redirects to login', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Authenticated navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
      await dismissOnboardingIfVisible(page);
    });

    test('sidebar shows Events IA links', async ({ page }) => {
      const nav = page.getByTestId('e2e-nav-sidebar');
      await expect(nav).toBeVisible();
      await expect(nav.getByTestId('e2e-nav-link-dashboard')).toBeVisible();
      await expect(nav.getByTestId('e2e-nav-link-spaces')).toBeVisible();
      await expect(nav.getByTestId('e2e-nav-link-plants')).toBeVisible();
      await expect(nav.getByTestId('e2e-nav-link-events')).toBeVisible();
      await expect(nav.getByTestId('e2e-nav-link-profile')).toBeVisible();
      await expect(nav.getByTestId('e2e-nav-link-settings')).toBeVisible();
    });

    test('can navigate to Events via sidebar', async ({ page }) => {
      await page.getByTestId('e2e-nav-link-events').click();
      await expect(page).toHaveURL(/\/events/);
      await expect(page).toHaveTitle(/Events/);
      await expect(page.getByTestId('e2e-events-add-note')).toBeVisible({
        timeout: 10000,
      });
    });

    test('can navigate to Spaces via sidebar', async ({ page }) => {
      await page.getByTestId('e2e-nav-link-spaces').click();
      await expect(page).toHaveURL(/\/spaces/);
      await expect(page).toHaveTitle(/Spaces/);
    });

    test('can navigate to Plants via sidebar', async ({ page }) => {
      await page.getByTestId('e2e-nav-link-plants').click();
      await expect(page).toHaveURL(/\/plants/);
      await expect(page).toHaveTitle(/Plants/);
    });

    test('can navigate to Profile via sidebar', async ({ page }) => {
      await page.getByTestId('e2e-nav-link-profile').click();
      await expect(page).toHaveURL(/\/profile/);
      await expect(page).toHaveTitle(/Profile/);
    });

    test('can navigate to Settings via sidebar', async ({ page }) => {
      await page.getByTestId('e2e-nav-link-settings').click();
      await expect(page).toHaveURL(/\/settings/);
      await expect(page).toHaveTitle(/Settings/);
    });

    test('legacy /notes route returns 404 when authenticated', async ({ page }) => {
      await page.goto('/notes');
      await expect(page).toHaveURL(/\/notes/);
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    });

    test('legacy /tasks route returns 404 when authenticated', async ({ page }) => {
      await page.goto('/tasks');
      await expect(page).toHaveURL(/\/tasks/);
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    });

    test('Log Out button is visible when authenticated', async ({ page }) => {
      await expect(page.getByTestId('e2e-nav-logout-button')).toBeVisible();
    });
  });
});

import { test, expect } from '@playwright/test';
import { dismissOnboardingIfVisible } from './helpers/onboarding';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await dismissOnboardingIfVisible(page);
  });

  test('dashboard page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).toHaveTitle(/Dashboard|Grospace/);
    await expect(page.getByTestId('e2e-dashboard-root')).toBeVisible();
  });

  test('displays stat cards', async ({ page }) => {
    await expect(page.getByTestId('e2e-dashboard-stat-active-plants')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-stat-open-issues')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-stat-tasks-due')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-stat-total-harvests')).toBeVisible();
  });

  test('displays quick action buttons', async ({ page }) => {
    await expect(page.getByTestId('e2e-dashboard-quick-actions')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-qa-add-plant')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-qa-add-space')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-qa-add-note')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-qa-add-task')).toBeVisible();
  });

  test('quick action for adding a space opens dialog', async ({ page }) => {
    await page.getByTestId('e2e-dashboard-qa-add-space').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('recent activity section is visible', async ({ page }) => {
    await expect(page.getByTestId('e2e-dashboard-recent-activity')).toBeVisible();
  });

  test('upcoming tasks section is visible', async ({ page }) => {
    await expect(page.getByTestId('e2e-dashboard-upcoming-tasks')).toBeVisible();
  });

  test('plant stages distribution is visible', async ({ page }) => {
    await expect(page.getByTestId('e2e-dashboard-plant-stages')).toBeVisible();
  });
});

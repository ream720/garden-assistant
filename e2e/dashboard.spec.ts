import { test, expect, type Page } from '@playwright/test';

const getOnboardingCompleteButton = (page: Page) =>
  page.getByRole('button', { name: /Complete setup|Let's grow/i });

const dismissOnboardingIfVisible = async (page: Page) => {
  const continueButton = getOnboardingCompleteButton(page);
  if (await continueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await continueButton.click();
    await expect(continueButton).not.toBeVisible({ timeout: 10000 });
  }
};

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await dismissOnboardingIfVisible(page);
  });

  test('dashboard page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).toHaveTitle(/Dashboard|Grospace/);
  });

  test('displays stat cards', async ({ page }) => {
    // Wait for dashboard data to load — match the actual stat card labels
    await expect(page.getByText('Active Plants').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Open Issues').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tasks Due').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Harvests').first()).toBeVisible({ timeout: 10000 });
  });

  test('displays quick action buttons', async ({ page }) => {
    await expect(page.getByText('Quick Actions').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Add Plant' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Add Space' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Add Task' })).toBeVisible({ timeout: 10000 });
  });

  test('quick action for adding a space opens dialog', async ({ page }) => {
    const addSpaceButton = page.getByRole('button', { name: 'Add Space' });
    await expect(addSpaceButton).toBeVisible({ timeout: 10000 });
    await addSpaceButton.click();

    // A dialog should open with the space form
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('recent activity section is visible', async ({ page }) => {
    await expect(page.getByText('Recent Activity').first()).toBeVisible({ timeout: 10000 });
  });

  test('upcoming tasks section is visible', async ({ page }) => {
    await expect(page.getByText('Upcoming Tasks').first()).toBeVisible({ timeout: 10000 });
  });

  test('plant stages distribution is visible', async ({ page }) => {
    await expect(page.getByText('Plant Stages').first()).toBeVisible({ timeout: 10000 });
  });

});

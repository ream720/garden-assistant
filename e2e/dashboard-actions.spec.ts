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

test.describe('Dashboard Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await dismissOnboardingIfVisible(page);
    await expect(page.getByText('Quick Actions')).toBeVisible({ timeout: 10000 });
  });

  test('Add Space quick action creates a space', async ({ page }) => {
    const spaceName = `E2E Quick Space ${Date.now()}`;

    await page.getByRole('button', { name: 'Add Space' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Space Name').fill(spaceName);
    await dialog.getByRole('button', { name: 'Create Space' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    await page.goto('/spaces');
    await expect(page.getByText(spaceName)).toBeVisible({ timeout: 15000 });
  });

  test('Add Plant quick action creates a plant', async ({ page }) => {
    const plantName = `E2E Quick Plant ${Date.now()}`;

    await page.getByRole('button', { name: 'Add Plant' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Plant Name').fill(plantName);
    await dialog.getByLabel('Variety/Cultivar').fill('Quick Variety');

    const spaceSelect = dialog.locator('button[role="combobox"]').first();
    await spaceSelect.click();
    const options = page.getByRole('option');
    const optionCount = await options.count();
    await options.nth(optionCount > 1 ? 1 : 0).click();

    await dialog.getByRole('button', { name: 'Add Plant' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    await page.goto('/plants');
    await expect(page.getByText(plantName)).toBeVisible({ timeout: 15000 });
  });

  test('Add Note and Add Task quick actions create entries in Events', async ({ page }) => {
    const noteContent = `E2E Quick Note ${Date.now()}`;
    const taskTitle = `E2E Quick Task ${Date.now()}`;

    // Add Note
    await page.getByRole('button', { name: 'Add Note' }).click();
    const noteDialog = page.getByRole('dialog');
    await expect(noteDialog).toBeVisible();

    await noteDialog.getByLabel('Note Content').fill(noteContent);
    const noteSpaceSelect = noteDialog.locator('button[role="combobox"]').nth(1);
    await noteSpaceSelect.click();
    const noteOptions = page.getByRole('option');
    const noteOptionCount = await noteOptions.count();
    await noteOptions.nth(noteOptionCount > 1 ? 1 : 0).click();

    await noteDialog.getByRole('button', { name: 'Save Note' }).click();
    await expect(noteDialog).not.toBeVisible({ timeout: 15000 });

    await page.goto('/events?type=notes');
    await expect(page.getByText(noteContent)).toBeVisible({ timeout: 15000 });

    // Add Task
    await page.goto('/dashboard');
    await dismissOnboardingIfVisible(page);
    await page.getByRole('button', { name: 'Add Task' }).click();
    const taskDialog = page.getByRole('dialog');
    await expect(taskDialog).toBeVisible();
    await taskDialog.getByLabel('Title *').fill(taskTitle);
    await taskDialog.getByRole('button', { name: 'Create Task' }).click();
    await expect(taskDialog).not.toBeVisible({ timeout: 15000 });

    await page.goto('/events?type=tasks');
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 15000 });
  });

  test('Mark Complete from dashboard upcoming tasks completes the task', async ({ page }) => {
    const taskTitle = `E2E Dashboard Complete ${Date.now()}`;

    await page.getByRole('button', { name: 'Add Task' }).click();
    const createTaskDialog = page.getByRole('dialog');
    await expect(createTaskDialog).toBeVisible();
    await createTaskDialog.getByLabel('Title *').fill(taskTitle);
    await createTaskDialog.getByRole('button', { name: 'Create Task' }).click();
    await expect(createTaskDialog).not.toBeVisible({ timeout: 15000 });

    const taskRow = page.locator('div').filter({ hasText: taskTitle }).first();
    await expect(taskRow).toBeVisible({ timeout: 15000 });
    await taskRow.getByRole('button', { name: 'Mark Complete' }).click();

    const completionDialog = page.getByRole('dialog');
    await expect(completionDialog).toBeVisible({ timeout: 5000 });
    await completionDialog.getByRole('button', { name: 'Complete Task' }).click();
    await expect(completionDialog).not.toBeVisible({ timeout: 10000 });

    await page.goto('/events?type=tasks');
    await page.getByRole('button', { name: /Completed statuses/i }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10000 });
  });
});

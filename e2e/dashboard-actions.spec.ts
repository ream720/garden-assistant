import { test, expect, type Locator, type Page } from '@playwright/test';
import { dismissOnboardingIfVisible } from './helpers/onboarding';

const selectFirstNonPlaceholderOption = async (
  trigger: Locator,
  page: Page,
  placeholderPattern: RegExp
) => {
  await trigger.click();
  const options = page.getByRole('option');
  const optionCount = await options.count();

  for (let i = 0; i < optionCount; i += 1) {
    const option = options.nth(i);
    const text = (await option.textContent())?.trim() ?? '';
    const isVisible = await option.isVisible().catch(() => false);
    if (isVisible && !placeholderPattern.test(text)) {
      await option.click();
      return;
    }
  }

  for (let i = 0; i < optionCount; i += 1) {
    const option = options.nth(i);
    const isVisible = await option.isVisible().catch(() => false);
    if (isVisible) {
      await option.click();
      return;
    }
  }
};

const selectOptionByNameWithRetry = async (
  trigger: Locator,
  page: Page,
  optionName: string
) => {
  for (let i = 0; i < 5; i += 1) {
    await trigger.click();
    const option = page.getByRole('option', { name: optionName, exact: true });
    if (await option.isVisible({ timeout: 1200 }).catch(() => false)) {
      await option.click();
      return;
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }

  throw new Error(`Failed to locate select option: ${optionName}`);
};

test.describe('Dashboard Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await dismissOnboardingIfVisible(page);
    await expect(page.getByTestId('e2e-dashboard-quick-actions')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Add Space quick action creates a space', async ({ page }) => {
    const spaceName = `E2E Quick Space ${Date.now()}`;

    await page.getByTestId('e2e-dashboard-qa-add-space').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByTestId('e2e-spaces-form-name').fill(spaceName);
    await dialog.getByTestId('e2e-spaces-form-submit').click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    await page.goto('/spaces');
    await expect(page.getByText(spaceName, { exact: true })).toBeVisible({
      timeout: 15000,
    });
  });

  test('Add Plant quick action creates a plant', async ({ page }) => {
    const plantName = `E2E Quick Plant ${Date.now()}`;
    const spaceName = `E2E Quick Plant Space ${Date.now()}`;

    // Ensure there is at least one concrete space option to attach the plant to.
    await page.getByTestId('e2e-dashboard-qa-add-space').click();
    const createSpaceDialog = page.getByRole('dialog');
    await expect(createSpaceDialog).toBeVisible();
    await createSpaceDialog.getByTestId('e2e-spaces-form-name').fill(spaceName);
    await createSpaceDialog.getByTestId('e2e-spaces-form-submit').click();
    await expect(createSpaceDialog).not.toBeVisible({ timeout: 10000 });

    await page.getByTestId('e2e-dashboard-qa-add-plant').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByTestId('e2e-plants-form-name').fill(plantName);
    await dialog.getByTestId('e2e-plants-form-variety').fill('Quick Variety');

    await selectOptionByNameWithRetry(
      dialog.getByTestId('e2e-plants-form-space'),
      page,
      spaceName
    );

    await dialog.getByTestId('e2e-plants-form-submit').click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  });

  test('Add Note and Add Task quick actions create entries in Events', async ({ page }) => {
    const noteContent = `E2E Quick Note ${Date.now()}`;
    const taskTitle = `E2E Quick Task ${Date.now()}`;

    await page.getByTestId('e2e-dashboard-qa-add-note').click();
    const noteDialog = page.getByRole('dialog');
    await expect(noteDialog).toBeVisible();

    await noteDialog.getByTestId('e2e-note-form-content').fill(noteContent);
    await selectFirstNonPlaceholderOption(
      noteDialog.getByTestId('e2e-note-form-space'),
      page,
      /^No specific space$/i
    );

    await noteDialog.getByTestId('e2e-note-form-submit').click();
    await expect(noteDialog).not.toBeVisible({ timeout: 15000 });

    await page.goto('/events?type=notes');
    await expect(
      page
        .locator('[data-testid^="e2e-events-note-card-"]')
        .filter({ hasText: noteContent })
        .first()
    ).toBeVisible({ timeout: 15000 });

    await page.goto('/dashboard');
    await dismissOnboardingIfVisible(page);

    await page.getByTestId('e2e-dashboard-qa-add-task').click();
    const taskDialog = page.getByRole('dialog');
    await expect(taskDialog).toBeVisible();

    await taskDialog.getByTestId('e2e-task-form-title').fill(taskTitle);
    await taskDialog.getByTestId('e2e-task-form-submit').click();
    await expect(taskDialog).not.toBeVisible({ timeout: 15000 });

    await page.goto('/events?type=tasks');
    await expect(
      page
        .locator('[data-testid^="e2e-events-task-card-"]')
        .filter({ hasText: taskTitle })
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Mark Complete from dashboard upcoming tasks completes the task', async ({ page }) => {
    const taskTitle = `E2E Dashboard Complete ${Date.now()}`;

    await page.getByTestId('e2e-dashboard-qa-add-task').click();
    const createTaskDialog = page.getByRole('dialog');
    await expect(createTaskDialog).toBeVisible();

    await createTaskDialog.getByTestId('e2e-task-form-title').fill(taskTitle);
    await createTaskDialog.getByTestId('e2e-task-form-submit').click();
    await expect(createTaskDialog).not.toBeVisible({ timeout: 15000 });

    const taskRow = page
      .locator('[data-testid^="e2e-dashboard-task-row-"]')
      .filter({ hasText: taskTitle })
      .first();
    await expect(taskRow).toBeVisible({ timeout: 15000 });
    await taskRow.getByRole('button', { name: 'Mark Complete' }).click();

    const completionDialog = page.getByRole('dialog');
    await expect(completionDialog).toBeVisible({ timeout: 5000 });
    await completionDialog.getByRole('button', { name: 'Complete Task' }).click();
    await expect(completionDialog).not.toBeVisible({ timeout: 10000 });

    await page.goto('/events?type=tasks');
    await page.getByTestId('e2e-events-task-status-completed').click();
    await expect(
      page
        .locator('[data-testid^="e2e-events-task-card-"]')
        .filter({ hasText: taskTitle })
        .first()
    ).toBeVisible({ timeout: 10000 });
  });
});

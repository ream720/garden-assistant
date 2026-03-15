import { test, expect, type Locator, type Page } from '@playwright/test';

const openCreateTaskDialog = async (page: Page): Promise<Locator> => {
  await page.getByRole('button', { name: 'Add Task' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog.getByText('Create New Task')).toBeVisible();
  return dialog;
};

const createTask = async (
  page: Page,
  {
    title,
    description,
    priority,
    makeOverdue = false,
  }: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    makeOverdue?: boolean;
  }
) => {
  const dialog = await openCreateTaskDialog(page);

  await dialog.getByLabel('Title *').fill(title);

  if (description) {
    await dialog.getByLabel('Description').fill(description);
  }

  if (priority && priority !== 'medium') {
    await dialog
      .locator('button[role="combobox"]')
      .filter({ hasText: /^Medium$/ })
      .click();
    await page
      .getByRole('option', {
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        exact: true,
      })
      .click();
  }

  if (makeOverdue) {
    const dueDateButton = dialog
      .getByRole('button')
      .filter({ hasText: /[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|Pick a date/i })
      .first();
    await dueDateButton.click();

    // Day picker focuses the selected day by default; move one day back and select.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
  }

  await dialog.getByRole('button', { name: 'Create Task' }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 });
};

const deleteTaskByTitle = async (page: Page, title: string) => {
  const actionsButton = page
    .getByRole('button', { name: `Task actions for ${title}` })
    .first();

  if (!(await actionsButton.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;
  }

  await actionsButton.click();
  await page.getByRole('menuitem', { name: 'Delete task' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(title)).not.toBeVisible({ timeout: 15000 });
};

test.describe('Events Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events?type=tasks');
    await expect(page).toHaveURL(/\/events\?.*type=tasks/);
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('tasks view loads with core controls', async ({ page }) => {
    await expect(page).toHaveTitle(/Events/);
    await expect(page.getByRole('button', { name: 'Add Task' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
    await expect(page.getByPlaceholder('Search tasks...')).toBeVisible();
  });

  test('task dialog opens with required fields', async ({ page }) => {
    const dialog = await openCreateTaskDialog(page);

    await expect(dialog.getByText('Title')).toBeVisible();
    await expect(dialog.getByText('Description')).toBeVisible();
    await expect(dialog.getByText('Due Date')).toBeVisible();
    await expect(dialog.getByText('Priority')).toBeVisible();
  });

  test('can create, edit, and delete a task in Events', async ({ page }) => {
    const title = `E2E Events Task ${Date.now()}`;
    await createTask(page, { title, description: 'created in events tasks view' });

    await page
      .getByRole('button', { name: `Task actions for ${title}` })
      .first()
      .click();
    await page.getByRole('menuitem', { name: 'Edit task' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Edit Task')).toBeVisible();

    const editedTitle = `${title} Updated`;
    const titleInput = dialog.getByLabel('Title *');
    await titleInput.clear();
    await titleInput.fill(editedTitle);
    await dialog.getByRole('button', { name: 'Update Task' }).click();

    await expect(page.getByText(editedTitle)).toBeVisible({ timeout: 15000 });
    await deleteTaskByTitle(page, editedTitle);
  });

  test('can complete a task without creating a note', async ({ page }) => {
    const title = `E2E Complete Task ${Date.now()}`;
    await createTask(page, { title });

    await page.getByRole('button', { name: `Mark ${title} complete` }).click();
    const completionDialog = page.getByRole('dialog');
    await expect(completionDialog).toBeVisible({ timeout: 5000 });
    await completionDialog.getByRole('button', { name: 'Complete Task' }).click();
    await expect(completionDialog).not.toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Completed statuses/i }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
    await deleteTaskByTitle(page, title);
  });

  test('can complete a task with a linked note', async ({ page }) => {
    const title = `E2E Complete+Note ${Date.now()}`;
    await createTask(page, { title });

    await page.getByRole('button', { name: `Mark ${title} complete` }).click();
    const completionDialog = page.getByRole('dialog');
    await expect(completionDialog).toBeVisible({ timeout: 5000 });

    const createNoteCheckbox = completionDialog.locator('#createNote');
    if (!(await createNoteCheckbox.isChecked())) {
      await createNoteCheckbox.check();
    }

    await completionDialog
      .getByPlaceholder('Describe what you accomplished or observed...')
      .fill('Linked completion note from Events tasks e2e');
    await completionDialog.getByRole('button', { name: 'Complete Task' }).click();
    await expect(completionDialog).not.toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Completed statuses/i }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
    await deleteTaskByTitle(page, title);
  });

  test('filters tasks by status and priority', async ({ page }) => {
    const highTitle = `E2E High ${Date.now()}`;
    const lowTitle = `E2E Low ${Date.now()}`;

    await createTask(page, { title: highTitle, priority: 'high' });
    await createTask(page, { title: lowTitle, priority: 'low' });

    // Mark high priority task complete, then validate status filter.
    await page.getByRole('button', { name: `Mark ${highTitle} complete` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Complete Task' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Completed statuses/i }).click();
    await expect(page.getByText(highTitle)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(lowTitle)).not.toBeVisible();

    await page.getByRole('button', { name: /All statuses/i }).click();

    // Open filter popover and apply low-priority filter.
    await page.getByRole('button', { name: 'Filters' }).click();
    await page
      .getByRole('combobox')
      .filter({ hasText: /All Priorities/i })
      .click();
    await page.getByRole('option', { name: 'Low', exact: true }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByText(lowTitle)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(highTitle)).not.toBeVisible();

    await page.getByRole('button', { name: /Clear filters/i }).click();
    await deleteTaskByTitle(page, highTitle);
    await deleteTaskByTitle(page, lowTitle);
  });

  test('overdue filter surfaces past-due tasks', async ({ page }) => {
    const overdueTitle = `E2E Overdue ${Date.now()}`;
    await createTask(page, { title: overdueTitle, makeOverdue: true });

    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('button', { name: 'Overdue', exact: true }).click();
    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(/taskStatus=overdue/);
    await expect(page.getByText(overdueTitle)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Clear filters/i }).click();
    await deleteTaskByTitle(page, overdueTitle);
  });
});

import { test, expect, type Locator, type Page } from '@playwright/test';

const taskCardByTitle = (page: Page, title: string) =>
  page
    .locator('[data-testid^="e2e-events-task-card-"]')
    .filter({ hasText: title })
    .first();

const openCreateTaskDialog = async (page: Page): Promise<Locator> => {
  await page.getByTestId('e2e-events-add-task').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog.getByText('Create New Task')).toBeVisible();
  return dialog;
};

const selectOption = async (trigger: Locator, page: Page, optionName: string) => {
  await trigger.click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
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

  await dialog.getByTestId('e2e-task-form-title').fill(title);

  if (description) {
    await dialog.getByTestId('e2e-task-form-description').fill(description);
  }

  if (priority && priority !== 'medium') {
    const optionLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
    await selectOption(dialog.getByTestId('e2e-task-form-priority'), page, optionLabel);
  }

  if (makeOverdue) {
    await dialog.getByTestId('e2e-task-form-due-date').click();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
  }

  await dialog.getByTestId('e2e-task-form-submit').click();
  await expect(taskCardByTitle(page, title)).toBeVisible({ timeout: 15000 });
};

const deleteTaskByTitle = async (page: Page, title: string) => {
  const card = taskCardByTitle(page, title);
  if (!(await card.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;
  }

  await card
    .locator('[data-testid^="e2e-events-task-actions-"]')
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Delete task' }).click();

  const deleteDialog = page.getByRole('alertdialog');
  await expect(deleteDialog).toBeVisible({ timeout: 5000 });
  await deleteDialog.getByRole('button', { name: 'Delete' }).click();
  await expect(card).not.toBeVisible({ timeout: 15000 });
};

const completeTaskByTitle = async (
  page: Page,
  title: string,
  createNote = false
) => {
  const card = taskCardByTitle(page, title);
  await expect(card).toBeVisible({ timeout: 10000 });

  await card
    .locator('[data-testid^="e2e-events-task-mark-complete-"]')
    .first()
    .click();
  const completionDialog = page.getByRole('dialog');
  await expect(completionDialog).toBeVisible({ timeout: 5000 });

  if (createNote) {
    const createNoteCheckbox = completionDialog.locator('#createNote');
    if (!(await createNoteCheckbox.isChecked())) {
      await createNoteCheckbox.check();
    }
    await completionDialog
      .getByPlaceholder('Describe what you accomplished or observed...')
      .fill('Linked completion note from Events tasks e2e');
  }

  await completionDialog.getByRole('button', { name: 'Complete Task' }).click();
  await expect(completionDialog).not.toBeVisible({ timeout: 10000 });
};

test.describe('Events Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events?type=tasks');
    await expect(page).toHaveURL(/\/events\?.*type=tasks/);
    await expect(page.getByTestId('e2e-events-root')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('e2e-events-add-task')).toBeVisible();
  });

  test('tasks view loads with core controls', async ({ page }) => {
    await expect(page).toHaveTitle(/Events/);
    await expect(page.getByTestId('e2e-events-add-task')).toBeVisible();
    await expect(page.getByTestId('e2e-events-filters-tasks')).toBeVisible();
    await expect(page.getByTestId('e2e-events-search-tasks')).toBeVisible();
  });

  test('task dialog opens with required fields', async ({ page }) => {
    const dialog = await openCreateTaskDialog(page);
    await expect(dialog.getByTestId('e2e-task-form')).toBeVisible();
    await expect(dialog.getByTestId('e2e-task-form-title')).toBeVisible();
    await expect(dialog.getByTestId('e2e-task-form-description')).toBeVisible();
    await expect(dialog.getByTestId('e2e-task-form-due-date')).toBeVisible();
    await expect(dialog.getByTestId('e2e-task-form-priority')).toBeVisible();
    await expect(dialog.getByTestId('e2e-task-form-submit')).toBeVisible();
  });

  test('can create, edit, and delete a task in Events', async ({ page }) => {
    const title = `E2E Events Task ${Date.now()}`;
    await createTask(page, { title, description: 'created in events tasks view' });

    const card = taskCardByTitle(page, title);
    await card.locator('[data-testid^="e2e-events-task-actions-"]').first().click();
    await page.getByRole('menuitem', { name: 'Edit task' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Edit Task')).toBeVisible();

    const editedTitle = `${title} Updated`;
    await dialog.getByTestId('e2e-task-form-title').clear();
    await dialog.getByTestId('e2e-task-form-title').fill(editedTitle);
    await dialog.getByTestId('e2e-task-form-submit').click();

    await expect(taskCardByTitle(page, editedTitle)).toBeVisible({ timeout: 15000 });
    await deleteTaskByTitle(page, editedTitle);
  });

  test('can complete a task without creating a note', async ({ page }) => {
    const title = `E2E Complete Task ${Date.now()}`;
    await createTask(page, { title });
    await completeTaskByTitle(page, title, false);

    await page.getByTestId('e2e-events-task-status-completed').click();
    await expect(taskCardByTitle(page, title)).toBeVisible({ timeout: 10000 });
    await deleteTaskByTitle(page, title);
  });

  test('can complete a task with a linked note', async ({ page }) => {
    const title = `E2E Complete+Note ${Date.now()}`;
    await createTask(page, { title });
    await completeTaskByTitle(page, title, true);

    await page.getByTestId('e2e-events-task-status-completed').click();
    await expect(taskCardByTitle(page, title)).toBeVisible({ timeout: 10000 });
    await deleteTaskByTitle(page, title);
  });

  test('filters tasks by status and priority', async ({ page }) => {
    const highTitle = `E2E High ${Date.now()}`;
    const lowTitle = `E2E Low ${Date.now()}`;

    await createTask(page, { title: highTitle, priority: 'high' });
    await createTask(page, { title: lowTitle, priority: 'low' });
    await completeTaskByTitle(page, highTitle, false);

    await page.getByTestId('e2e-events-task-status-completed').click();
    await expect(taskCardByTitle(page, highTitle)).toBeVisible({ timeout: 10000 });
    await expect(taskCardByTitle(page, lowTitle)).not.toBeVisible();

    await page.getByTestId('e2e-events-task-status-all').click();
    await page.getByTestId('e2e-events-filters-tasks').click();
    await selectOption(page.getByTestId('e2e-events-task-filter-priority'), page, 'Low');

    await expect(taskCardByTitle(page, lowTitle)).toBeVisible({ timeout: 10000 });
    await expect(taskCardByTitle(page, highTitle)).not.toBeVisible();

    await page.getByTestId('e2e-events-clear-filters-tasks').click();
    await deleteTaskByTitle(page, highTitle);
    await deleteTaskByTitle(page, lowTitle);
  });

  test('overdue filter can be applied and cleared', async ({ page }) => {
    const overdueTitle = `E2E Overdue ${Date.now()}`;
    await createTask(page, { title: overdueTitle, makeOverdue: true });

    await page.getByTestId('e2e-events-filters-tasks').click();
    await page.getByTestId('e2e-events-task-filter-overdue').click();

    await expect(page).toHaveURL(/taskStatus=overdue/);
    await expect(page.getByTestId('e2e-events-clear-filters-tasks')).toBeVisible();

    await page.getByTestId('e2e-events-clear-filters-tasks').click();
    await expect(page).not.toHaveURL(/taskStatus=overdue/);
    await deleteTaskByTitle(page, overdueTitle);
  });
});

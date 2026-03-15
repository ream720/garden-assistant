import { test, expect, type Locator, type Page } from '@playwright/test';

const openCreateNoteDialog = async (page: Page): Promise<Locator> => {
  await page.getByRole('button', { name: 'Add Note' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog.getByText('Create New Note')).toBeVisible();
  return dialog;
};

const chooseSpaceForNote = async (dialog: Locator, page: Page) => {
  const spaceSelect = dialog.locator('button[role="combobox"]').nth(1);
  await spaceSelect.click();
  const options = page.getByRole('option');
  const count = await options.count();

  if (count <= 1) {
    throw new Error('Expected at least one grow space option for note creation');
  }

  // Option 0 = "No specific space", option 1+ = real spaces.
  await options.nth(1).click();
};

const createNote = async (page: Page, content: string) => {
  const dialog = await openCreateNoteDialog(page);
  await dialog.getByLabel('Note Content').fill(content);
  await chooseSpaceForNote(dialog, page);
  await dialog.getByRole('button', { name: 'Save Note' }).click();
  await expect(page.getByText(content)).toBeVisible({ timeout: 15000 });
};

const deleteNoteByContent = async (page: Page, content: string) => {
  if (!(await page.getByText(content).first().isVisible().catch(() => false))) {
    return;
  }

  await page.getByText(content).first().click();
  await page.getByRole('button', { name: 'Delete note' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(content)).not.toBeVisible({ timeout: 15000 });
};

test.describe('Events Notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events?type=notes');
    await expect(page).toHaveURL(/\/events\?.*type=notes/);
    await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('notes view loads with heading and controls', async ({ page }) => {
    await expect(page).toHaveTitle(/Events/);
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
    await expect(page.getByPlaceholder('Search notes...')).toBeVisible();
  });

  test('add note dialog opens with required form fields', async ({ page }) => {
    const dialog = await openCreateNoteDialog(page);

    await expect(dialog.getByText('Note Content')).toBeVisible();
    await expect(dialog.getByText('Category')).toBeVisible();
    await expect(dialog.getByText('Grow Space')).toBeVisible();
  });

  test('can create and delete a note from Events', async ({ page }) => {
    const content = `E2E Note ${Date.now()}`;
    await createNote(page, content);
    await deleteNoteByContent(page, content);
  });

  test('can edit a note from details pane', async ({ page }) => {
    const content = `E2E Editable Note ${Date.now()}`;
    await createNote(page, content);

    await page.getByText(content).first().click();
    await page.getByRole('button', { name: 'Edit note' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit Note')).toBeVisible();

    const updatedContent = `${content} Updated`;
    await dialog.getByLabel('Note Content').fill(updatedContent);
    await dialog.getByRole('button', { name: 'Update Note' }).click();

    await expect(page.getByText(updatedContent)).toBeVisible({ timeout: 10000 });
    await deleteNoteByContent(page, updatedContent);
  });

  test('filters notes by category', async ({ page }) => {
    const content = `E2E Issue Note ${Date.now()}`;
    await createNote(page, content);

    await page.getByRole('button', { name: 'Filters' }).click();
    await page
      .getByRole('combobox')
      .filter({ hasText: /All categories/i })
      .click();
    await page.getByRole('option', { name: 'Issue', exact: true }).click();
    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(/category=issue/);
    await expect(page.getByText(content)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Clear filters/i }).click();
    await deleteNoteByContent(page, content);
  });
});

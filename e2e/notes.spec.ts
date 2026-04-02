import { test, expect, type Locator, type Page } from '@playwright/test';

const NOTE_PHOTO_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
  'base64'
);

const noteCardByContent = (page: Page, content: string) =>
  page
    .locator('[data-testid^="e2e-events-note-card-"]')
    .filter({ hasText: content })
    .first();

const selectOption = async (trigger: Locator, page: Page, optionName: string) => {
  await trigger.click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
};

const selectFirstGrowSpaceOption = async (trigger: Locator, page: Page) => {
  await trigger.click();
  const options = page.getByRole('option');
  const optionCount = await options.count();

  for (let i = 0; i < optionCount; i += 1) {
    const option = options.nth(i);
    const text = (await option.textContent())?.trim() ?? '';

    if (!/^no specific space$/i.test(text)) {
      await option.click();
      return;
    }
  }

  throw new Error('Note creation requires a grow space, but no grow space options were available.');
};

const openCreateNoteDialog = async (page: Page): Promise<Locator> => {
  await page.getByTestId('e2e-events-add-note').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog.getByText('Create New Note')).toBeVisible();
  return dialog;
};

const createNote = async (
  page: Page,
  {
    content,
    category,
  }: {
    content: string;
    category?: 'observation' | 'feeding' | 'pruning' | 'issue' | 'milestone';
  }
) => {
  const dialog = await openCreateNoteDialog(page);
  await dialog.getByTestId('e2e-note-form-content').fill(content);

  if (category === 'issue') {
    await selectOption(dialog.getByTestId('e2e-note-form-category'), page, 'Issue');
  }

  await selectFirstGrowSpaceOption(dialog.getByTestId('e2e-note-form-space'), page);
  await dialog.getByTestId('e2e-note-form-submit').click();
  await expect(noteCardByContent(page, content)).toBeVisible({ timeout: 15000 });
};

const deleteNoteByContent = async (page: Page, content: string) => {
  const card = noteCardByContent(page, content);
  if (!(await card.isVisible().catch(() => false))) {
    return;
  }

  await card.click();
  await page.getByRole('button', { name: 'Delete note' }).click();

  const deleteDialog = page.getByRole('alertdialog');
  await expect(deleteDialog).toBeVisible({ timeout: 5000 });
  await deleteDialog.getByRole('button', { name: 'Delete' }).click();
  await expect(card).not.toBeVisible({ timeout: 15000 });
};

test.describe('Events Notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events?type=notes');
    await expect(page).toHaveURL(/\/events\?.*type=notes/);
    await expect(page.getByTestId('e2e-events-root')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('e2e-events-add-note')).toBeVisible();
  });

  test('notes view loads with core controls', async ({ page }) => {
    await expect(page).toHaveTitle(/Events/);
    await expect(page.getByTestId('e2e-events-search-notes')).toBeVisible();
    await expect(page.getByTestId('e2e-events-filters-notes')).toBeVisible();
  });

  test('add note dialog opens with required fields', async ({ page }) => {
    const dialog = await openCreateNoteDialog(page);
    await expect(dialog.getByTestId('e2e-note-form')).toBeVisible();
    await expect(dialog.getByTestId('e2e-note-form-content')).toBeVisible();
    await expect(dialog.getByTestId('e2e-note-form-category')).toBeVisible();
    await expect(dialog.getByTestId('e2e-note-form-space')).toBeVisible();
    await expect(dialog.getByTestId('e2e-note-form-submit')).toBeVisible();
  });

  test('can create and delete a note from Events', async ({ page }) => {
    const content = `E2E Note ${Date.now()}`;
    await createNote(page, { content });
    await deleteNoteByContent(page, content);
  });

  test('can upload a photo when creating a note', async ({ page }) => {
    const content = `E2E Note With Photo ${Date.now()}`;
    const dialog = await openCreateNoteDialog(page);

    await dialog.getByTestId('e2e-note-form-content').fill(content);
    await selectFirstGrowSpaceOption(dialog.getByTestId('e2e-note-form-space'), page);
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'e2e-note-photo.png',
      mimeType: 'image/png',
      buffer: NOTE_PHOTO_BUFFER,
    });
    await expect(dialog.getByText('e2e-note-photo.png')).toBeVisible();

    await dialog.getByTestId('e2e-note-form-submit').click();
    await expect(noteCardByContent(page, content)).toBeVisible({ timeout: 15000 });

    await noteCardByContent(page, content).click();
    await expect(page.getByText('Photos', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('img', { name: /Note photo/i }).first()).toBeVisible({
      timeout: 15000,
    });

    await deleteNoteByContent(page, content);
  });

  test('can edit a note from details pane', async ({ page }) => {
    const content = `E2E Editable Note ${Date.now()}`;
    await createNote(page, { content });

    await noteCardByContent(page, content).click();
    await page.getByRole('button', { name: 'Edit note' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit Note')).toBeVisible();

    const updatedContent = `${content} Updated`;
    await dialog.getByTestId('e2e-note-form-content').fill(updatedContent);
    await dialog.getByTestId('e2e-note-form-submit').click();

    await expect(noteCardByContent(page, updatedContent)).toBeVisible({ timeout: 10000 });
    await deleteNoteByContent(page, updatedContent);
  });

  test('filters notes by category', async ({ page }) => {
    const content = `E2E Issue Note ${Date.now()}`;
    await createNote(page, { content, category: 'issue' });

    await page.getByTestId('e2e-events-filters-notes').click();
    await selectOption(page.getByTestId('e2e-events-note-filter-category'), page, 'Issue');
    await expect(page).toHaveURL(/category=issue/);
    await expect(noteCardByContent(page, content)).toBeVisible({ timeout: 10000 });

    await page.getByTestId('e2e-events-clear-filters-notes').click();
    await deleteNoteByContent(page, content);
  });
});

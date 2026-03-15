import { test, expect } from '@playwright/test';

test.describe('Spaces', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spaces');
    await expect(page).toHaveURL(/\/spaces/);
  });

  test('spaces page loads and shows heading', async ({ page }) => {
    await expect(page).toHaveTitle(/Spaces/);
    await expect(page.getByText('Grow Spaces')).toBeVisible();
    await expect(page.getByText('Manage your growing environments')).toBeVisible();
  });

  test('spaces page shows create space button', async ({ page }) => {
    // There should be a button or link to create a new space
    const createButton = page.getByRole('button', { name: /create|add|new/i });
    await expect(createButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('create space form opens and has required fields', async ({ page }) => {
    // Click the create/add space button
    const createButton = page.getByRole('button', { name: /create|add|new/i });
    await createButton.first().click();

    // The form should be visible (either in a dialog or inline)
    await expect(page.getByLabel(/name/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('can create a new space and it appears in the list', async ({ page }) => {
    // Click create button
    const createButton = page.getByRole('button', { name: /create|add|new/i });
    await createButton.first().click();

    // Fill the form
    const testSpaceName = `E2E Test Space ${Date.now()}`;
    await page.getByLabel(/name/i).first().fill(testSpaceName);

    // Select a type if there's a type selector
    const typeSelector = page.locator('[role="combobox"]').first();
    if (await typeSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeSelector.click();
      // Click the first option
      await page.getByRole('option').first().click();
    }

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create|save|submit/i }).last();
    await submitButton.click();

    // The new space should appear in the list
    await expect(page.getByText(testSpaceName)).toBeVisible({ timeout: 10000 });

    // Clean up: delete the space we just created
    // Click into the space
    await page.getByText(testSpaceName).click();
    await page.waitForURL(/\/spaces\//);

    // Look for a delete button/action
    const deleteButton = page.getByRole('button', { name: /delete/i });
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();
      // Confirm deletion if there's a confirmation dialog
      const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
    }
  });

  test('clicking a space card navigates to the space detail page', async ({ page }) => {
    // Wait for spaces to load
    await page.waitForTimeout(3000);

    // Click the first space card (if any exist)
    const spaceCards = page.locator('[class*="card"], [class*="Card"]').filter({
      has: page.locator('h3, h4, [class*="title"], [class*="Title"]'),
    });

    const cardCount = await spaceCards.count();
    if (cardCount > 0) {
      // Get the first card and click it
      await spaceCards.first().click();
      await expect(page).toHaveURL(/\/spaces\/.+/);
    }
  });
});

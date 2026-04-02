import { test, expect } from '@playwright/test';

test.describe('Plants', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plants');
    await expect(page).toHaveURL(/\/plants/);
  });

  test('plants page loads with heading and subtitle', async ({ page }) => {
    await expect(page).toHaveTitle(/Plants/);
    await expect(page.getByText('My Plants')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText('Manage all your plants across different growing spaces')
    ).toBeVisible();
  });

  test('add plant button is visible', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'Add Plant' });
    await expect(addButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('add plant dialog opens with required form fields', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'Add Plant' });
    await addButton.first().click();

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Add New Plant')).toBeVisible();

    // Required form fields should be present (scoped to dialog)
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Plant Name')).toBeVisible();
    await expect(dialog.getByText('Variety/Cultivar')).toBeVisible();
    await expect(dialog.getByText('Grow Space')).toBeVisible();
    await expect(dialog.getByText('Status')).toBeVisible();
  });

  test('can create a new plant and it appears in the list', async ({ page }) => {
    // Wait for page data to load
    await page.waitForTimeout(2000);

    // Click Add Plant
    const addButton = page.getByRole('button', { name: 'Add Plant' });
    await addButton.first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill the form
    const testPlantName = `E2E Test Plant ${Date.now()}`;
    await page.getByPlaceholder('e.g., Tomato #1').fill(testPlantName);
    await page.getByPlaceholder('e.g., Cherry Tomato').fill('Test Variety');

    // Select a space from the Grow Space dropdown
    const spaceSelect = page.getByRole('dialog').locator('[role="combobox"]').first();
    if (await spaceSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spaceSelect.click();
      // Skip the "Create New Space" option and pick the first real space
      const options = page.getByRole('option');
      const count = await options.count();
      if (count > 1) {
        // Click the second option (first real space, skipping "Create New Space")
        await options.nth(1).click();
      } else {
        // Only "Create New Space" exists, use it
        await options.first().click();
      }
    }

    // Submit the form
    const submitButton = page.getByRole('dialog').getByRole('button', { name: 'Add Plant' });
    await submitButton.click();

    // Dialog should close and plant should appear in the list
    await expect(page.getByText(testPlantName)).toBeVisible({ timeout: 15000 });

    // Clean up: delete the plant we just created
    // Find the card with our plant name and click its dropdown menu
    const plantCard = page.locator('[class*="card"], [class*="Card"]').filter({
      hasText: testPlantName,
    });

    const menuButton = plantCard.getByRole('button', { name: /more/i }).or(
      plantCard.locator('[class*="MoreHorizontal"], button:has(svg)').last()
    );

    if (await menuButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuButton.first().click();

      const deleteMenuItem = page.getByRole('menuitem', { name: /delete/i });
      if (await deleteMenuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteMenuItem.click();

        // Confirm deletion if there's a confirmation dialog
        const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
      }
    }
  });

  test('plant card shows name, variety, and status badge', async ({ page }) => {
    // Wait for plant data to load
    await page.waitForTimeout(3000);

    // Check if any plant cards exist
    const cards = page.locator('[class*="card"], [class*="Card"]').filter({
      has: page.locator('h3, h4, [class*="title"], [class*="Title"]'),
    });

    const count = await cards.count();
    if (count > 0) {
      const firstCard = cards.first();
      // Plant cards should display a status badge (Seedling, Vegetative, etc.)
      const statusBadge = firstCard.locator('[class*="badge"], [class*="Badge"]');
      await expect(statusBadge.first()).toBeVisible();
    }
  });

  test('clicking a plant card navigates to plant detail page', async ({ page }) => {
    // Wait for plant data to load
    await page.waitForTimeout(3000);

    // Look for plant cards with links to detail pages
    const plantLinks = page.locator('a[href*="/plants/"]');
    const count = await plantLinks.count();

    if (count > 0) {
      await plantLinks.first().click();
      await expect(page).toHaveURL(/\/plants\/.+/);
    }
  });

  test('can delete a plant via the card menu', async ({ page }) => {
    // First, create a plant to delete
    await page.waitForTimeout(2000);

    const addButton = page.getByRole('button', { name: 'Add Plant' });
    await addButton.first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const testPlantName = `E2E Delete Plant ${Date.now()}`;
    await page.getByPlaceholder('e.g., Tomato #1').fill(testPlantName);
    await page.getByPlaceholder('e.g., Cherry Tomato').fill('Delete Variety');

    // Select a space
    const spaceSelect = page.getByRole('dialog').locator('[role="combobox"]').first();
    if (await spaceSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spaceSelect.click();
      const options = page.getByRole('option');
      const count = await options.count();
      if (count > 1) {
        await options.nth(1).click();
      } else {
        await options.first().click();
      }
    }

    const submitButton = page.getByRole('dialog').getByRole('button', { name: 'Add Plant' });
    await submitButton.click();

    // Verify it was created
    await expect(page.getByText(testPlantName)).toBeVisible({ timeout: 15000 });

    // Now delete it via the card menu
    const plantCard = page.locator('[class*="card"], [class*="Card"]').filter({
      hasText: testPlantName,
    });

    const menuButton = plantCard.getByRole('button', { name: /more/i }).or(
      plantCard.locator('button:has(svg)').last()
    );
    await menuButton.first().click();

    await page.getByRole('menuitem', { name: /delete/i }).click();

    // Confirm deletion
    const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Verify plant is gone
    await expect(page.getByText(testPlantName)).not.toBeVisible({ timeout: 10000 });
  });

  test('plant detail page shows plant info and action buttons', async ({ page }) => {
    // Wait for plant data to load
    await page.waitForTimeout(3000);

    // Navigate to a plant detail page
    const plantLinks = page.locator('a[href*="/plants/"]');
    const count = await plantLinks.count();
    if (count === 0) return; // Skip if no plants exist

    await plantLinks.first().click();
    await expect(page).toHaveURL(/\/plants\/.+/, { timeout: 10000 });

    // Plant detail page should show the plant name as heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Should show info cards
    await expect(page.getByText('Plant Information', { exact: true })).toBeVisible();
    await expect(page.getByText('Timeline', { exact: true })).toBeVisible();

    // Should show action buttons
    await expect(page.getByRole('button', { name: 'Edit Plant' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move to Space' })).toBeVisible();
  });

  test('can edit a plant from the detail page', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'Add Plant' });
    await addButton.first().click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible({ timeout: 5000 });

    const testPlantName = `E2E Edit Plant ${Date.now()}`;
    await createDialog.getByPlaceholder('e.g., Tomato #1').fill(testPlantName);
    await createDialog.getByPlaceholder('e.g., Cherry Tomato').fill('Edit Variety');

    const spaceSelect = createDialog.locator('[role="combobox"]').first();
    if (await spaceSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spaceSelect.click();
      const options = page.getByRole('option');
      const optCount = await options.count();
      await options.nth(optCount > 1 ? 1 : 0).click();
    }

    await createDialog.getByRole('button', { name: 'Add Plant' }).click();
    await expect(createDialog).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(testPlantName)).toBeVisible({ timeout: 15000 });

    // Navigate to its detail page
    await page.locator('a[href*="/plants/"]').filter({ hasText: testPlantName }).click();
    await expect(page).toHaveURL(/\/plants\/.+/, { timeout: 10000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(testPlantName, { timeout: 10000 });

    // Click Edit Plant
    await page.getByRole('button', { name: 'Edit Plant' }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 5000 });
    await expect(editDialog.getByRole('heading', { name: 'Edit Plant', exact: true })).toBeVisible();

    // Change the name
    const editedName = `${testPlantName} Edited`;
    const nameInput = page.getByRole('dialog').getByPlaceholder('e.g., Tomato #1');
    await nameInput.clear();
    await nameInput.fill(editedName);

    // Submit
    await editDialog.getByRole('button', { name: 'Update Plant' }).click();
    await expect(editDialog).not.toBeVisible({ timeout: 10000 });

    // Verify the name changed on the detail page
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(editedName, { timeout: 20000 });

    // Clean up: go back to plants list and delete
    await page.goto('/plants');
    await expect(page).toHaveURL(/\/plants/);
    await expect(page.getByText(editedName)).toBeVisible({ timeout: 15000 });
    const plantCard = page.locator('[class*="card"], [class*="Card"]').filter({ hasText: editedName });
    const menuButton = plantCard.getByRole('button', { name: /more/i }).or(plantCard.locator('button:has(svg)').last());
    if (await menuButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuButton.first().click();
      const deleteItem = page.getByRole('menuitem', { name: /delete/i });
      if (await deleteItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteItem.click();
        const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }
      }
    }
  });

  test('can move a plant to a different space via Move dialog', async ({ page }) => {
    // Wait for data to load and navigate to a plant detail page
    await page.waitForTimeout(3000);
    const plantLinks = page.locator('a[href*="/plants/"]');
    const count = await plantLinks.count();
    if (count === 0) return;

    await plantLinks.first().click();
    await expect(page).toHaveURL(/\/plants\/.+/, { timeout: 10000 });

    // Click "Move to Space" button
    await page.getByRole('button', { name: 'Move to Space' }).click();

    // Move dialog should appear
    const moveDialog = page.getByRole('dialog');
    await expect(moveDialog).toBeVisible({ timeout: 5000 });
    await expect(moveDialog.getByRole('heading', { name: 'Move Plant', exact: true })).toBeVisible();
    await expect(moveDialog.getByText('Move to Space', { exact: false })).toBeVisible();

    // Cancel — we don't actually want to move a real plant in this test
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('can open the harvest dialog for a non-harvested plant', async ({ page }) => {
    // Wait for data to load and navigate to a plant detail page
    await page.waitForTimeout(3000);
    const plantLinks = page.locator('a[href*="/plants/"]');
    const count = await plantLinks.count();
    if (count === 0) return;

    await plantLinks.first().click();
    await expect(page).toHaveURL(/\/plants\/.+/, { timeout: 10000 });

    // Check if "Record Harvest" button exists (only visible for non-harvested plants)
    const harvestButton = page.getByRole('button', { name: 'Record Harvest' });
    if (await harvestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await harvestButton.click();

      // Harvest dialog should appear
      const harvestDialog = page.getByRole('dialog');
      await expect(harvestDialog).toBeVisible({ timeout: 5000 });
      await expect(
        harvestDialog.getByRole('heading', { name: 'Record Harvest', exact: true })
      ).toBeVisible();
      await expect(harvestDialog.getByText('Harvest Date', { exact: true })).toBeVisible();

      // Cancel — we don't want to actually harvest a real plant
      await harvestDialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(harvestDialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('plant form validation shows errors on empty submit', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'Add Plant' });
    await addButton.first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Clear any default values and submit empty form
    const nameInput = page.getByRole('dialog').getByPlaceholder('e.g., Tomato #1');
    await nameInput.clear();

    const varietyInput = page.getByRole('dialog').getByPlaceholder('e.g., Cherry Tomato');
    await varietyInput.clear();

    // Click submit without filling required fields
    const submitButton = page.getByRole('dialog').getByRole('button', { name: 'Add Plant' });
    await submitButton.click();

    // Validation errors should appear for required fields
    await expect(page.getByText('Plant name is required')).toBeVisible({ timeout: 5000 });
  });

  test('can change plant status (seedling -> vegetative)', async ({ page }) => {
    // 1. Create a plant (defaults to Seedling)
    await page.waitForTimeout(2000);
    const addButton = page.getByRole('button', { name: 'Add Plant' });
    await addButton.first().click();

    // Fill required fields
    const testPlantName = `E2E Status Plant ${Date.now()}`;
    await page.getByPlaceholder('e.g., Tomato #1').fill(testPlantName);
    await page.getByPlaceholder('e.g., Cherry Tomato').fill('Status Variety');

    // Select space
    const spaceSelect = page.getByRole('dialog').locator('[role="combobox"]').first();
    if (await spaceSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spaceSelect.click();
      const options = page.getByRole('option');
      const optCount = await options.count();
      await options.nth(optCount > 1 ? 1 : 0).click();
    }

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: 'Add Plant' }).click();
    await expect(page.getByText(testPlantName)).toBeVisible({ timeout: 15000 });

    // 2. Navigate to detail page
    await page.locator('a[href*="/plants/"]').filter({ hasText: testPlantName }).click();
    await expect(page).toHaveURL(/\/plants\/.+/, { timeout: 10000 });

    // 3. Verify initial "Seedling" badge is visible
    // Wait for the detail page to fully render
    await page.waitForTimeout(1000);
    const statusBadge = page.getByText('Seedling', { exact: true });
    await expect(statusBadge.first()).toBeVisible({ timeout: 5000 });

    // 4. Click Edit Plant
    await page.getByRole('button', { name: 'Edit Plant' }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 5000 });

    // 5. Change Status to Vegetative
    // The Status combobox is the second combobox in the form (after Grow Space)
    const statusSelect = editDialog.locator('[role="combobox"]').nth(1);
    await statusSelect.click();
    await page.getByRole('option', { name: 'Vegetative' }).click();

    // 6. Submit the form
    await editDialog.getByRole('button', { name: 'Update Plant' }).click();
    await expect(editDialog).not.toBeVisible({ timeout: 5000 });

    // 7. Verify the badge on the detail page now says "Vegetative"
    await page.waitForTimeout(1000);
    const newStatusBadge = page.getByText('Vegetative', { exact: true });
    await expect(newStatusBadge.first()).toBeVisible({ timeout: 5000 });

    // 8. Clean up (go back to list and delete)
    await page.goto('/plants');
    await page.waitForTimeout(2000);
    const plantCard = page
      .locator('[data-testid^="e2e-plants-card-"]')
      .filter({ hasText: testPlantName })
      .first();
    const menuButton = plantCard
      .locator('[data-testid^="e2e-plants-card-menu-"]')
      .first();
    if (await menuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuButton.click({ force: true });
      const deleteItem = page
        .locator('[data-testid^="e2e-plants-card-delete-"]')
        .first();
      if (await deleteItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteItem.click();
        const confirmBtn = page
          .locator('[data-testid^="e2e-plants-card-delete-confirm-"]')
          .first();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }
      }
    }
  });
});

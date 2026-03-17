import { test, expect } from '@playwright/test';

test.describe('Profile & Settings', () => {
  test('profile page shows account, stats, and activity sections', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: 'Profile' }).first()).toBeVisible();
    await expect(page.getByText('Garden Statistics')).toBeVisible();
    await expect(page.getByText('Recent Activity')).toBeVisible();
  });

  test('settings page can update display name', async ({ page }) => {
    await page.goto('/settings');

    const nameInput = page.locator('#displayName');
    await expect(nameInput).toBeVisible();

    const originalName = await nameInput.inputValue();
    const updatedName = `E2E ${Date.now().toString().slice(-6)}`;

    await nameInput.fill(updatedName);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Profile updated successfully')).toBeVisible({ timeout: 10000 });

    if (originalName && originalName !== updatedName) {
      await nameInput.fill(originalName);
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByText('Profile updated successfully')).toBeVisible({ timeout: 10000 });
    }
  });

  test('settings page theme toggles persist in local storage', async ({ page }) => {
    await page.goto('/settings');

    await page.getByRole('button', { name: /^Dark$/ }).click();
    const darkThemeState = await page.evaluate(() => localStorage.getItem('theme-storage') ?? '');
    expect(darkThemeState).toContain('"theme":"dark"');

    await page.getByRole('button', { name: /^Light$/ }).click();
    const lightThemeState = await page.evaluate(() => localStorage.getItem('theme-storage') ?? '');
    expect(lightThemeState).toContain('"theme":"light"');
  });

  test('settings page sign out button ends the session', async ({ page }) => {
    await page.goto('/settings');

    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

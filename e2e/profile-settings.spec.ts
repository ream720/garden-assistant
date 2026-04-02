import { test, expect } from '@playwright/test';

test.describe('Profile & Settings', () => {
  test('profile page shows account, stats, and activity sections', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByTestId('e2e-profile-root')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('e2e-profile-user-card')).toBeVisible();
    await expect(page.getByTestId('e2e-profile-stats-card')).toBeVisible();
    await expect(page.getByTestId('e2e-profile-activity-card')).toBeVisible();
  });

  test('settings page can update display name', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByTestId('e2e-settings-root')).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByTestId('e2e-settings-display-name-input');
    await expect(nameInput).toBeVisible();

    const originalName = await nameInput.inputValue();
    const updatedName = `E2E ${Date.now().toString().slice(-6)}`;

    await nameInput.fill(updatedName);
    await page.getByTestId('e2e-settings-save-profile').click();
    await expect(
      page.getByText('Profile updated successfully', { exact: true }).first()
    ).toBeVisible({ timeout: 10000 });

    if (originalName && originalName !== updatedName) {
      await nameInput.fill(originalName);
      await page.getByTestId('e2e-settings-save-profile').click();
      await expect(
        page.getByText('Profile updated successfully', { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('settings page theme toggles persist in local storage', async ({ page }) => {
    await page.goto('/settings');

    await page.getByTestId('e2e-settings-theme-dark').click();
    const darkThemeState = await page.evaluate(() => localStorage.getItem('theme-storage') ?? '');
    expect(darkThemeState).toContain('"theme":"dark"');

    await page.getByTestId('e2e-settings-theme-light').click();
    const lightThemeState = await page.evaluate(() => localStorage.getItem('theme-storage') ?? '');
    expect(lightThemeState).toContain('"theme":"light"');
  });

  test('settings page sign out button ends the session', async ({ page }) => {
    await page.goto('/settings');

    await page.getByTestId('e2e-settings-sign-out').click();
    await expect(page).toHaveURL(/\/login/);
  });
});

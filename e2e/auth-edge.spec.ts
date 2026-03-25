import { test, expect } from '@playwright/test';

const UNAUTHENTICATED_STATE = {
  cookies: [],
  origins: [],
};

test.use({ storageState: UNAUTHENTICATED_STATE });
const usingFirebaseEmulator = process.env.PW_USE_FIREBASE_EMULATOR === 'true';

const getCredentials = () => {
  const email = process.env.PW_E2E_EMAIL || process.env.VITE_FIREBASE_LOGIN_USER;
  const password = process.env.PW_E2E_PASSWORD || process.env.VITE_FIREBASE_LOGIN_PW;

  if (!email || !password) {
    throw new Error('Missing PW_E2E_EMAIL/PW_E2E_PASSWORD (or VITE_FIREBASE_LOGIN_USER/VITE_FIREBASE_LOGIN_PW).');
  }

  return { email, password };
};

test.describe('Authentication Edge Cases', () => {
  test('new signup shows guided setup and can reopen setup steps', async ({ page }) => {
    test.skip(
      !usingFirebaseEmulator,
      'Signup account-creation coverage runs only in emulator mode to avoid cloud auth pollution.'
    );

    const email = `onboarding-${Date.now()}@grospace.test`;

    await page.goto('/register');
    await page.getByPlaceholder('Enter your display name').fill('Onboarding User');
    await page.getByPlaceholder('Enter your email').fill(email);
    await page.getByPlaceholder('Create a password (min. 6 characters)').fill('Password123!');
    await page.getByPlaceholder('Confirm your password').fill('Password123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('dialog')).toContainText('Welcome to Grospace');

    await page.getByRole('button', { name: 'Close For Now' }).click();
    await expect(page.getByRole('button', { name: 'View Setup Steps' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: 'View Setup Steps' }).click();
    await expect(page.getByRole('dialog')).toContainText('Welcome to Grospace');
  });

  test('register shows validation for mismatched passwords', async ({ page }) => {
    await page.goto('/register');

    await page.getByPlaceholder('Enter your display name').fill('Mismatch User');
    await page.getByPlaceholder('Enter your email').fill(`mismatch-${Date.now()}@grospace.test`);
    await page.getByPlaceholder('Create a password (min. 6 characters)').fill('Password123!');
    await page.getByPlaceholder('Confirm your password').fill('Password456!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test('register shows validation for short password', async ({ page }) => {
    await page.goto('/register');

    await page.getByPlaceholder('Enter your display name').fill('Short Pw User');
    await page.getByPlaceholder('Enter your email').fill(`short-${Date.now()}@grospace.test`);
    await page.getByPlaceholder('Create a password (min. 6 characters)').fill('123');
    await page.getByPlaceholder('Confirm your password').fill('123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('register shows duplicate email message', async ({ page }) => {
    const { email } = getCredentials();

    await page.goto('/register');
    await page.getByPlaceholder('Enter your display name').fill('Duplicate User');
    await page.getByPlaceholder('Enter your email').fill(email);
    await page.getByPlaceholder('Create a password (min. 6 characters)').fill('Password123!');
    await page.getByPlaceholder('Confirm your password').fill('Password123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.getByText('An account with this email already exists. Try signing in instead.')
    ).toBeVisible({ timeout: 10000 });
  });

  test('reset password flow accepts an existing email', async ({ page }) => {
    const { email } = getCredentials();

    await page.goto('/reset-password');
    await page.getByPlaceholder('Enter your email').fill(email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 });
  });

  test('session remains authenticated after reload', async ({ page }) => {
    const { email, password } = getCredentials();

    await page.goto('/login');
    await page.getByPlaceholder('Enter your email').fill(email);
    await page.getByPlaceholder('Enter your password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('remember me option can be selected during login', async ({ page }) => {
    const { email, password } = getCredentials();

    await page.goto('/login');
    await page.getByRole('checkbox', { name: 'Remember me' }).click();
    await expect(page.getByRole('checkbox', { name: 'Remember me' })).toBeChecked();

    await page.getByPlaceholder('Enter your email').fill(email);
    await page.getByPlaceholder('Enter your password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});

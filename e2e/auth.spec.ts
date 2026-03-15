import { test, expect } from '@playwright/test';
import { loginAsTestUser, logout } from './helpers/auth';

const UNAUTHENTICATED_STATE = {
  cookies: [],
  origins: [],
};

test.use({ storageState: UNAUTHENTICATED_STATE });

test.describe('Authentication', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/Sign In/);
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows validation errors for empty form submission', async ({ page }) => {
    await page.goto('/login');

    // Click submit without filling anything
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Zod validation should show error messages
    await expect(page.locator('text=Required').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Enter your email').fill('notreal@test.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for the error message to appear
    const errorMessage = page.locator('.text-destructive');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('forgot password link reveals reset password link', async ({ page }) => {
    await page.goto('/login');

    // Click "Forgot your password?"
    await page.getByText('Forgot your password?').click();

    // The reset password link should now be visible
    await expect(page.getByText('Reset your password here')).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await loginAsTestUser(page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).toHaveTitle(/Dashboard|Grospace/);
  });

  test('logout redirects to login page', async ({ page }) => {
    await loginAsTestUser(page);
    await logout(page);

    await expect(page).toHaveURL(/\/login/);
  });

  test('register page renders with all form fields', async ({ page }) => {
    await page.goto('/register');

    await expect(page).toHaveTitle(/Create Account/);
    await expect(page.getByPlaceholder('Enter your display name')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
    await expect(page.getByPlaceholder('Create a password (min. 6 characters)')).toBeVisible();
    await expect(page.getByPlaceholder('Confirm your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('register page has link to login page', async ({ page }) => {
    await page.goto('/register');

    const signInLink = page.getByRole('link', { name: 'Sign in' });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page has link to register page', async ({ page }) => {
    await page.goto('/login');

    const signUpLink = page.getByRole('link', { name: 'Sign up' });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL(/\/register/);
  });
});

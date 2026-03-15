import { type Page, expect } from '@playwright/test';

/**
 * Log in via the UI by filling the login form.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Log in with the dedicated test user from .env credentials.
 * Uses VITE_FIREBASE_LOGIN_USER and VITE_FIREBASE_LOGIN_PW.
 */
export async function loginAsTestUser(page: Page) {
  const email = process.env.PW_E2E_EMAIL || process.env.VITE_FIREBASE_LOGIN_USER;
  const password =
    process.env.PW_E2E_PASSWORD || process.env.VITE_FIREBASE_LOGIN_PW;

  if (!email || !password) {
    throw new Error(
      'PW_E2E_EMAIL/PW_E2E_PASSWORD or VITE_FIREBASE_LOGIN_USER/VITE_FIREBASE_LOGIN_PW must be set in .env'
    );
  }

  await login(page, email, password);
}

/**
 * Log out by clicking the "Log Out" button in the navbar.
 */
export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log Out' }).click();

  // Wait for redirect back to login
  await page.waitForURL('**/login', { timeout: 10000 });
  await expect(page).toHaveURL(/\/login/);
}

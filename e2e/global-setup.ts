import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { chromium, type FullConfig } from '@playwright/test';

const execFileAsync = promisify(execFile);
const STORAGE_STATE_PATH = path.resolve(process.cwd(), 'e2e/.auth/user.json');

const EMPTY_STORAGE_STATE = {
  cookies: [],
  origins: [],
};

const resolveBaseUrl = (config: FullConfig) => {
  const projectBaseUrl = config.projects.find((project) => project.use?.baseURL)?.use
    ?.baseURL;
  return String(projectBaseUrl ?? 'http://localhost:3000');
};

const seedFirebaseEmulator = async () => {
  const useEmulator = process.env.PW_USE_FIREBASE_EMULATOR === 'true';

  if (!useEmulator) {
    return;
  }

  await execFileAsync('node', ['scripts/seed-firebase-emulator.mjs'], {
    cwd: process.cwd(),
    env: process.env,
  });
};

const buildAuthStorageState = async (baseUrl: string) => {
  if (process.env.PW_SKIP_AUTH_BOOTSTRAP === 'true') {
    return;
  }

  const email = process.env.PW_E2E_EMAIL || process.env.VITE_FIREBASE_LOGIN_USER;
  const password =
    process.env.PW_E2E_PASSWORD || process.env.VITE_FIREBASE_LOGIN_PW;

  if (!email || !password) {
    throw new Error(
      'Missing credentials for Playwright auth bootstrap. Set PW_E2E_EMAIL/PW_E2E_PASSWORD or VITE_FIREBASE_LOGIN_USER/VITE_FIREBASE_LOGIN_PW.'
    );
  }

  await mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ storageState: EMPTY_STORAGE_STATE });

  await page.goto(`${baseUrl}/login`);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });

  const onboardingContinue = page.getByRole('button', {
    name: /Complete setup|Let's grow/i,
  });
  if (await onboardingContinue.isVisible().catch(() => false)) {
    await onboardingContinue.click();
    await onboardingContinue.waitFor({ state: 'hidden', timeout: 10000 });
  }

  await page.context().storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
};

export default async function globalSetup(config: FullConfig) {
  const baseUrl = resolveBaseUrl(config);

  await seedFirebaseEmulator();
  await buildAuthStorageState(baseUrl);
}

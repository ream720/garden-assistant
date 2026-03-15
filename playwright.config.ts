import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load test-specific environment variables
config({ path: ['.env.local', '.env'] });

const useFirebaseEmulator = process.env.PW_USE_FIREBASE_EMULATOR === 'true';
const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000';

const authEmulatorHost =
  process.env.PW_FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ||
  '127.0.0.1:9099';
const firestoreEmulatorHost =
  process.env.PW_FIRESTORE_EMULATOR_HOST ||
  process.env.VITE_FIRESTORE_EMULATOR_HOST ||
  '127.0.0.1:8080';
const storageEmulatorHost =
  process.env.PW_FIREBASE_STORAGE_EMULATOR_HOST ||
  process.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST ||
  '127.0.0.1:9199';
const emulatorHubHost =
  process.env.PW_FIREBASE_EMULATOR_HUB_HOST || '127.0.0.1:4400';
const emulatorHealthUrl = `http://${emulatorHubHost}/emulators`;

const appServerCommand = useFirebaseEmulator
  ? [
      `VITE_USE_FIREBASE_EMULATORS=true`,
      `VITE_FIREBASE_AUTH_EMULATOR_HOST=${authEmulatorHost}`,
      `VITE_FIRESTORE_EMULATOR_HOST=${firestoreEmulatorHost}`,
      `VITE_FIREBASE_STORAGE_EMULATOR_HOST=${storageEmulatorHost}`,
      'npm run build',
      '&&',
      `PORT=3000`,
      `VITE_USE_FIREBASE_EMULATORS=true`,
      `VITE_FIREBASE_AUTH_EMULATOR_HOST=${authEmulatorHost}`,
      `VITE_FIRESTORE_EMULATOR_HOST=${firestoreEmulatorHost}`,
      `VITE_FIREBASE_STORAGE_EMULATOR_HOST=${storageEmulatorHost}`,
      'npm run start',
    ].join(' ')
  : 'npm run build && PORT=3000 npm run start';

const webServers = useFirebaseEmulator
  ? [
      {
        command: 'npm run emulators:start:test',
        url: emulatorHealthUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
      {
        command: appServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
      },
    ]
  : [
      {
        command: appServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
      },
    ];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially since they share Firebase state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: './e2e/.auth/user.json',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start required test services before running tests */
  webServer: webServers,
});

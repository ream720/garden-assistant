import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'] });

const DEFAULT_PROJECT_ID = 'grospace';
const DEFAULT_AUTH_HOST = '127.0.0.1:9099';
const DEFAULT_FIRESTORE_HOST = '127.0.0.1:8080';
const DEFAULT_STORAGE_HOST = '127.0.0.1:9199';
const DEFAULT_EMAIL = 'e2e@grospace.test';
const DEFAULT_PASSWORD = 'Password123!';
const DEFAULT_DISPLAY_NAME = 'E2E Test User';
const DEFAULT_SPACE_ID = 'seed-space-1';
const DEFAULT_SPACE_NAME = 'Seed Space';

const projectId =
  process.env.PW_FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  DEFAULT_PROJECT_ID;
const authHost =
  process.env.PW_FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ||
  DEFAULT_AUTH_HOST;
const firestoreHost =
  process.env.PW_FIRESTORE_EMULATOR_HOST ||
  process.env.VITE_FIRESTORE_EMULATOR_HOST ||
  DEFAULT_FIRESTORE_HOST;
const storageHost =
  process.env.PW_FIREBASE_STORAGE_EMULATOR_HOST ||
  process.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST ||
  DEFAULT_STORAGE_HOST;
const email =
  process.env.PW_E2E_EMAIL ||
  process.env.VITE_FIREBASE_LOGIN_USER ||
  DEFAULT_EMAIL;
const password =
  process.env.PW_E2E_PASSWORD ||
  process.env.VITE_FIREBASE_LOGIN_PW ||
  DEFAULT_PASSWORD;
const displayName = process.env.PW_E2E_DISPLAY_NAME || DEFAULT_DISPLAY_NAME;
const seedSpaceId = process.env.PW_E2E_SPACE_ID || DEFAULT_SPACE_ID;
const seedSpaceName = process.env.PW_E2E_SPACE_NAME || DEFAULT_SPACE_NAME;

const authBaseUrl = `http://${authHost}`;
const firestoreBaseUrl = `http://${firestoreHost}`;

const toFieldValue = (value) => {
  if (value === null) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFieldValue(item)),
      },
    };
  }

  switch (typeof value) {
    case 'string':
      return { stringValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case 'object': {
      const fields = Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, toFieldValue(child)])
      );
      return { mapValue: { fields } };
    }
    default:
      throw new Error(`Unsupported Firestore field type: ${typeof value}`);
  }
};

const toFirestoreDocument = (data) => ({
  fields: Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, toFieldValue(value)])
  ),
});

const waitForEndpoint = async (url, retries = 30, delayMs = 1000) => {
  let lastStatus = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      // Auth emulator management endpoints can return 405 on GET while still
      // indicating the emulator process is up. Any non-5xx HTTP response is
      // sufficient as a readiness signal.
      if (response.status < 500) {
        return;
      }

      lastStatus = response.status;
    } catch (error) {
      // Retry while emulator is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const statusHint = lastStatus ? ` (last status: ${lastStatus})` : '';
  throw new Error(`Timed out waiting for emulator endpoint: ${url}${statusHint}`);
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) ${url}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const clearEmulatorState = async () => {
  await requestJson(
    `${authBaseUrl}/emulator/v1/projects/${projectId}/accounts`,
    { method: 'DELETE' }
  );

  await requestJson(
    `${firestoreBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
};

const createAuthUser = async () => {
  const signUpResponse = await requestJson(
    `${authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  await requestJson(
    `${authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
    {
      method: 'POST',
      body: JSON.stringify({
        idToken: signUpResponse.idToken,
        displayName,
        returnSecureToken: true,
      }),
    }
  );

  return {
    uid: signUpResponse.localId,
    idToken: signUpResponse.idToken,
  };
};

const createDocument = async (collection, documentId, data, idToken) => {
  await requestJson(
    `${firestoreBaseUrl}/v1/projects/${projectId}/databases/(default)/documents/${collection}?documentId=${documentId}`,
    {
      method: 'POST',
      headers: idToken
        ? {
            Authorization: `Bearer ${idToken}`,
          }
        : undefined,
      body: JSON.stringify(toFirestoreDocument(data)),
    }
  );
};

const seedFirestore = async (uid, idToken) => {
  const now = new Date();

  await createDocument('users', uid, {
    uid,
    email,
    displayName,
    createdAt: now,
    updatedAt: now,
    preferences: {
      defaultUnits: 'metric',
      timezone: 'America/New_York',
      notifications: {
        email: true,
        push: true,
        taskReminders: true,
      },
    },
  }, idToken);

  await createDocument(`users/${uid}/spaces`, seedSpaceId, {
    name: seedSpaceName,
    type: 'indoor-tent',
    description: 'Seeded for emulator-backed Playwright tests',
    plantCount: 0,
    createdAt: now,
    updatedAt: now,
  }, idToken);
};

const run = async () => {
  console.log('[seed] Waiting for Firebase emulators...');

  await waitForEndpoint(
    `${authBaseUrl}/emulator/v1/projects/${projectId}/accounts`
  );
  await waitForEndpoint(
    `${firestoreBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`
  );

  console.log('[seed] Clearing emulator auth/firestore state...');
  await clearEmulatorState();

  console.log('[seed] Creating emulator auth user...');
  const { uid, idToken } = await createAuthUser();

  console.log('[seed] Seeding Firestore baseline data...');
  await seedFirestore(uid, idToken);

  console.log('[seed] Firebase emulator seed complete.');
  console.log(
    `[seed] user=${email} project=${projectId} auth=${authHost} firestore=${firestoreHost} storage=${storageHost}`
  );
};

run().catch((error) => {
  if (error instanceof Error && /Timed out waiting for emulator endpoint/i.test(error.message)) {
    console.error(
      '[seed] Emulators are not reachable. Start them first with `npm run emulators:start:test` and keep that process running.'
    );
  }

  console.error('[seed] Failed to seed Firebase emulator:', error);
  process.exitCode = 1;
});

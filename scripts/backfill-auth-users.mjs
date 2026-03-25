import { config as loadEnv } from 'dotenv';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

loadEnv({ path: ['.env.local', '.env'] });

const DEFAULT_PAGE_SIZE = 1000;

const parseArgs = (argv) => {
  const options = {
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
};

const resolveProjectId = () =>
  process.env.PW_FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  undefined;

const ensureAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = resolveProjectId();
  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
};

const defaultPreferences = () => ({
  defaultUnits: 'metric',
  timezone: 'America/New_York',
  notifications: {
    email: true,
    push: false,
    taskReminders: true,
  },
});

const run = async () => {
  const options = parseArgs(process.argv.slice(2));

  ensureAdminApp();
  const auth = getAuth();
  const db = getFirestore();

  let created = 0;
  let existing = 0;
  let scanned = 0;
  let pageToken;

  console.log(
    `[backfill-auth-users] mode=${options.dryRun ? 'dry-run' : 'write'} project=${resolveProjectId() || '(auto)'}`
  );

  do {
    const page = await auth.listUsers(DEFAULT_PAGE_SIZE, pageToken);
    pageToken = page.pageToken;

    for (const user of page.users) {
      scanned += 1;
      const userRef = db.collection('users').doc(user.uid);
      const snapshot = await userRef.get();

      if (snapshot.exists) {
        existing += 1;
        continue;
      }

      created += 1;
      if (options.dryRun) {
        continue;
      }

      const now = Timestamp.now();
      await userRef.set({
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        preferences: defaultPreferences(),
        createdAt: now,
        updatedAt: now,
      });
    }
  } while (pageToken);

  console.log(
    `[backfill-auth-users] scanned=${scanned} existing=${existing} ${options.dryRun ? 'would_create' : 'created'}=${created}`
  );
};

run().catch((error) => {
  console.error('[backfill-auth-users] failed:', error);
  process.exitCode = 1;
});

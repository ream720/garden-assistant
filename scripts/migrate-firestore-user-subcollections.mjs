import { config as loadEnv } from 'dotenv';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

loadEnv({ path: ['.env.local', '.env'] });

const COLLECTIONS = ['spaces', 'plants', 'notes', 'tasks'];
const BATCH_LIMIT = 400;

const parseArgs = (argv) => {
  const options = {
    dryRun: false,
    verifyOnly: false,
    finalize: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verify-only') {
      options.verifyOnly = true;
    } else if (arg === '--finalize') {
      options.finalize = true;
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

const ensureNestedSet = (container, userId, collectionName) => {
  if (!container.has(userId)) {
    container.set(userId, new Map());
  }

  const byCollection = container.get(userId);
  if (!byCollection.has(collectionName)) {
    byCollection.set(collectionName, new Set());
  }

  return byCollection.get(collectionName);
};

const withBatchedWrites = async (performWrites) => {
  const db = getFirestore();
  let batch = db.batch();
  let pendingWrites = 0;

  const commitIfNeeded = async (force = false) => {
    if (pendingWrites === 0) {
      return;
    }

    if (!force && pendingWrites < BATCH_LIMIT) {
      return;
    }

    await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  };

  const queueWrite = (writer) => {
    writer(batch);
    pendingWrites += 1;
  };

  await performWrites(queueWrite, commitIfNeeded);
  await commitIfNeeded(true);
};

const migrateTopLevelToUserSubcollections = async ({ dryRun }) => {
  const db = getFirestore();

  let migrated = 0;
  let skippedMissingUserId = 0;

  for (const collectionName of COLLECTIONS) {
    const snapshot = await db.collection(collectionName).get();

    if (dryRun) {
      for (const docSnap of snapshot.docs) {
        const userId = docSnap.data().userId;
        if (!userId || typeof userId !== 'string') {
          skippedMissingUserId += 1;
          continue;
        }

        migrated += 1;
      }

      continue;
    }

    await withBatchedWrites(async (queueWrite, commitIfNeeded) => {
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const userId = data.userId;

        if (!userId || typeof userId !== 'string') {
          skippedMissingUserId += 1;
          continue;
        }

        migrated += 1;
        const targetRef = db
          .collection('users')
          .doc(userId)
          .collection(collectionName)
          .doc(docSnap.id);

        queueWrite((batch) => {
          batch.set(targetRef, data, { merge: true });
        });

        await commitIfNeeded();
      }
    });
  }

  return { migrated, skippedMissingUserId };
};

const getTopLevelDocSets = async () => {
  const db = getFirestore();
  const topLevelDocSets = new Map();
  const userIds = new Set();
  let skippedMissingUserId = 0;

  for (const collectionName of COLLECTIONS) {
    const snapshot = await db.collection(collectionName).get();

    for (const docSnap of snapshot.docs) {
      const userId = docSnap.data().userId;
      if (!userId || typeof userId !== 'string') {
        skippedMissingUserId += 1;
        continue;
      }

      userIds.add(userId);
      ensureNestedSet(topLevelDocSets, userId, collectionName).add(docSnap.id);
    }
  }

  return { topLevelDocSets, userIds, skippedMissingUserId };
};

const getAllUserIds = async (seedUserIds = new Set()) => {
  const db = getFirestore();
  const usersSnapshot = await db.collection('users').get();
  const allUserIds = new Set(seedUserIds);

  for (const userDoc of usersSnapshot.docs) {
    allUserIds.add(userDoc.id);
  }

  return allUserIds;
};

const getSubcollectionDocSets = async (userIds) => {
  const db = getFirestore();
  const subcollectionDocSets = new Map();

  for (const userId of userIds) {
    for (const collectionName of COLLECTIONS) {
      const snapshot = await db.collection('users').doc(userId).collection(collectionName).get();
      for (const docSnap of snapshot.docs) {
        ensureNestedSet(subcollectionDocSets, userId, collectionName).add(docSnap.id);
      }
    }
  }

  return subcollectionDocSets;
};

const getDocIds = (docSets, userId, collectionName) =>
  docSets.get(userId)?.get(collectionName) || new Set();

const verifyParity = async () => {
  const {
    topLevelDocSets,
    userIds: topLevelUserIds,
    skippedMissingUserId,
  } = await getTopLevelDocSets();
  const allUserIds = await getAllUserIds(topLevelUserIds);
  const subcollectionDocSets = await getSubcollectionDocSets(allUserIds);
  const mismatches = [];
  const extras = [];

  for (const userId of allUserIds) {
    for (const collectionName of COLLECTIONS) {
      const topLevelIds = getDocIds(topLevelDocSets, userId, collectionName);
      const subcollectionIds = getDocIds(subcollectionDocSets, userId, collectionName);

      const missingInSubcollection = [];
      for (const topLevelId of topLevelIds) {
        if (!subcollectionIds.has(topLevelId)) {
          missingInSubcollection.push(topLevelId);
        }
      }

      if (missingInSubcollection.length > 0) {
        mismatches.push({
          userId,
          collectionName,
          missingCount: missingInSubcollection.length,
          sampleMissingIds: missingInSubcollection.slice(0, 10),
          topLevelCount: topLevelIds.size,
          subcollectionCount: subcollectionIds.size,
        });
      }

      if (subcollectionIds.size > topLevelIds.size) {
        extras.push({
          userId,
          collectionName,
          topLevelCount: topLevelIds.size,
          subcollectionCount: subcollectionIds.size,
        });
      }
    }
  }

  return {
    mismatches,
    extras,
    skippedMissingUserId,
    userCount: allUserIds.size,
  };
};

const finalizeMigration = async ({ dryRun }) => {
  const db = getFirestore();
  const { userIds: topLevelUserIds } = await getTopLevelDocSets();
  const allUserIds = await getAllUserIds(topLevelUserIds);

  let strippedUserIdFields = 0;
  let deletedLegacyDocs = 0;

  for (const userId of allUserIds) {
    for (const collectionName of COLLECTIONS) {
      const subSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection(collectionName)
        .get();

      if (dryRun) {
        strippedUserIdFields += subSnapshot.size;
        continue;
      }

      await withBatchedWrites(async (queueWrite, commitIfNeeded) => {
        for (const docSnap of subSnapshot.docs) {
          strippedUserIdFields += 1;
          queueWrite((batch) => {
            batch.update(docSnap.ref, {
              userId: FieldValue.delete(),
              updatedAt: Timestamp.now(),
            });
          });
          await commitIfNeeded();
        }
      });
    }
  }

  for (const collectionName of COLLECTIONS) {
    const snapshot = await db.collection(collectionName).get();

    if (dryRun) {
      deletedLegacyDocs += snapshot.size;
      continue;
    }

    await withBatchedWrites(async (queueWrite, commitIfNeeded) => {
      for (const docSnap of snapshot.docs) {
        deletedLegacyDocs += 1;
        queueWrite((batch) => {
          batch.delete(docSnap.ref);
        });
        await commitIfNeeded();
      }
    });
  }

  return { strippedUserIdFields, deletedLegacyDocs };
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  ensureAdminApp();

  if (options.verifyOnly && options.finalize) {
    throw new Error('Cannot use --verify-only and --finalize together');
  }

  console.log(
    `[migrate-user-subcollections] mode=${options.verifyOnly ? 'verify' : options.finalize ? 'finalize' : 'migrate'} apply=${options.dryRun ? 'dry-run' : 'write'} project=${resolveProjectId() || '(auto)'}`
  );

  if (!options.verifyOnly && !options.finalize) {
    const migration = await migrateTopLevelToUserSubcollections({
      dryRun: options.dryRun,
    });
    console.log(
      `[migrate-user-subcollections] migrated=${migration.migrated} skipped_missing_userId=${migration.skippedMissingUserId}`
    );
  }

  const verification = await verifyParity();
  console.log(
    `[migrate-user-subcollections] verified_users=${verification.userCount} mismatches=${verification.mismatches.length} extras=${verification.extras.length} skipped_missing_userId=${verification.skippedMissingUserId}`
  );

  if (verification.mismatches.length > 0) {
    verification.mismatches.slice(0, 25).forEach((mismatch) => {
      console.error(
        `[mismatch] user=${mismatch.userId} collection=${mismatch.collectionName} topLevel=${mismatch.topLevelCount} subcollection=${mismatch.subcollectionCount}`
      );
    });

    throw new Error('Verification failed: source/target mismatches found');
  }

  if (verification.extras.length > 0) {
    verification.extras.slice(0, 25).forEach((extra) => {
      console.log(
        `[extra] user=${extra.userId} collection=${extra.collectionName} topLevel=${extra.topLevelCount} subcollection=${extra.subcollectionCount}`
      );
    });
  }

  if (!options.finalize) {
    return;
  }

  const finalizeResult = await finalizeMigration({ dryRun: options.dryRun });
  console.log(
    `[migrate-user-subcollections] finalize stripped_userId=${finalizeResult.strippedUserIdFields} deleted_legacy_docs=${finalizeResult.deletedLegacyDocs}`
  );
};

run().catch((error) => {
  console.error('[migrate-user-subcollections] failed:', error);
  process.exitCode = 1;
});

import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const resolveEmulatorHost = () => {
  const hostAndPort = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const [host = '127.0.0.1', portValue = '8080'] = hostAndPort.split(':');
  const port = Number.parseInt(portValue, 10);

  if (Number.isNaN(port)) {
    throw new Error(`Invalid FIRESTORE_EMULATOR_HOST port: ${hostAndPort}`);
  }

  return { host, port };
};

const run = async () => {
  const { host, port } = resolveEmulatorHost();
  const rules = await readFile('firestore.rules.phase1', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: process.env.PW_FIREBASE_PROJECT_ID || 'grospace-rules-phase1',
    firestore: {
      host,
      port,
      rules,
    },
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await setDoc(doc(db, 'users', 'alice'), { uid: 'alice' });
      await setDoc(doc(db, 'users', 'bob'), { uid: 'bob' });

      await setDoc(doc(db, 'users', 'alice', 'spaces', 'space-alice'), {
        userId: 'alice',
        name: 'Alice Space',
      });
      await setDoc(doc(db, 'users', 'bob', 'spaces', 'space-bob'), {
        userId: 'bob',
        name: 'Bob Space',
      });

      await setDoc(doc(db, 'spaces', 'legacy-alice'), {
        userId: 'alice',
        name: 'Legacy Alice Space',
      });
      await setDoc(doc(db, 'spaces', 'legacy-bob'), {
        userId: 'bob',
        name: 'Legacy Bob Space',
      });
    });

    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();

    await assertSucceeds(getDoc(doc(aliceDb, 'users', 'alice', 'spaces', 'space-alice')));
    await assertFails(getDoc(doc(aliceDb, 'users', 'bob', 'spaces', 'space-bob')));

    await assertSucceeds(getDocs(collection(aliceDb, 'users', 'alice', 'spaces')));
    await assertFails(getDocs(collection(aliceDb, 'users', 'bob', 'spaces')));

    await assertSucceeds(getDoc(doc(aliceDb, 'spaces', 'legacy-alice')));
    await assertFails(getDoc(doc(bobDb, 'spaces', 'legacy-alice')));
    await assertSucceeds(
      getDocs(query(collection(aliceDb, 'spaces'), where('userId', '==', 'alice')))
    );
    await assertFails(
      getDocs(query(collection(bobDb, 'spaces'), where('userId', '==', 'alice')))
    );

    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users', 'alice', 'spaces', 'space-alice'), {
        name: 'Alice Space Updated',
        userId: 'alice',
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice', 'spaces', 'space-alice'), {
        userId: 'bob',
      })
    );

    await assertSucceeds(
      updateDoc(doc(aliceDb, 'spaces', 'legacy-alice'), {
        name: 'Legacy Alice Updated',
        userId: 'alice',
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb, 'spaces', 'legacy-alice'), {
        userId: 'bob',
      })
    );

    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'spaces', 'space-alice-create'), {
        userId: 'alice',
        name: 'Create OK',
      })
    );
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'spaces', 'space-alice-bad'), {
        userId: 'bob',
        name: 'Create Bad',
      })
    );

    console.log('[rules phase1] all assertions passed');
  } finally {
    await testEnv.cleanup();
  }
};

run().catch((error) => {
  console.error('[rules phase1] failed:', error);
  process.exitCode = 1;
});

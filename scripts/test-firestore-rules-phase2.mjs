import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

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
  const rules = await readFile('firestore.rules.phase2', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: process.env.PW_FIREBASE_PROJECT_ID || 'grospace-rules-phase2',
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
        name: 'Alice Space',
      });
      await setDoc(doc(db, 'spaces', 'legacy-alice'), {
        userId: 'alice',
        name: 'Legacy Alice Space',
      });
    });

    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();

    await assertSucceeds(getDoc(doc(aliceDb, 'users', 'alice')));
    await assertFails(getDoc(doc(bobDb, 'users', 'alice')));

    await assertSucceeds(getDoc(doc(aliceDb, 'users', 'alice', 'spaces', 'space-alice')));
    await assertFails(getDoc(doc(bobDb, 'users', 'alice', 'spaces', 'space-alice')));
    await assertSucceeds(getDocs(collection(aliceDb, 'users', 'alice', 'spaces')));
    await assertFails(getDocs(collection(bobDb, 'users', 'alice', 'spaces')));

    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'spaces', 'phase2-space-create'), {
        name: 'Phase2 Create OK',
      })
    );
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users', 'alice', 'spaces', 'space-alice'), {
        name: 'Phase2 Update OK',
      })
    );

    await assertFails(getDoc(doc(aliceDb, 'spaces', 'legacy-alice')));

    console.log('[rules phase2] all assertions passed');
  } finally {
    await testEnv.cleanup();
  }
};

run().catch((error) => {
  console.error('[rules phase2] failed:', error);
  process.exitCode = 1;
});

import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate that all required config values are present
const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.error('Missing Firebase configuration keys:', missingKeys);
  console.error('Please check your .env file and ensure all VITE_FIREBASE_* variables are set');
}

const isTrue = (value: unknown) => value === 'true' || value === true;

const parseEmulatorHost = (
  value: unknown,
  fallbackHost: string,
  fallbackPort: number
) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { host: fallbackHost, port: fallbackPort };
  }

  const normalized = value.trim().replace(/^https?:\/\//, '');
  const [host, portValue] = normalized.split(':');
  const port = Number(portValue);

  if (!host || Number.isNaN(port)) {
    return { host: fallbackHost, port: fallbackPort };
  }

  return { host, port };
};

const isAlreadyConfiguredError = (error: unknown) =>
  error instanceof Error &&
  /already been called|already configured|already initialized/i.test(error.message);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const useEmulators = isTrue(import.meta.env.VITE_USE_FIREBASE_EMULATORS);

if (useEmulators) {
  const authTarget = parseEmulatorHost(
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST,
    '127.0.0.1',
    9099
  );
  const firestoreTarget = parseEmulatorHost(
    import.meta.env.VITE_FIRESTORE_EMULATOR_HOST,
    '127.0.0.1',
    8080
  );
  const storageTarget = parseEmulatorHost(
    import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST,
    '127.0.0.1',
    9199
  );

  try {
    if (!auth.emulatorConfig) {
      connectAuthEmulator(
        auth,
        `http://${authTarget.host}:${authTarget.port}`,
        { disableWarnings: true }
      );
    }
  } catch (error) {
    if (!isAlreadyConfiguredError(error)) {
      console.warn('Failed to connect Firebase Auth emulator:', error);
    }
  }

  try {
    connectFirestoreEmulator(db, firestoreTarget.host, firestoreTarget.port);
  } catch (error) {
    if (!isAlreadyConfiguredError(error)) {
      console.warn('Failed to connect Firestore emulator:', error);
    }
  }

  try {
    connectStorageEmulator(storage, storageTarget.host, storageTarget.port);
  } catch (error) {
    if (!isAlreadyConfiguredError(error)) {
      console.warn('Failed to connect Storage emulator:', error);
    }
  }
}

export default app;

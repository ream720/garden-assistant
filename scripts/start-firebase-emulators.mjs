import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'] });

const DEFAULT_PROJECT_ID = 'grospace';
const projectId =
  process.env.PW_FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  DEFAULT_PROJECT_ID;

const localFirebaseBinary = path.resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'firebase.cmd' : 'firebase'
);
const command = existsSync(localFirebaseBinary) ? localFirebaseBinary : 'firebase';
const args = [
  'emulators:start',
  '--project',
  projectId,
  '--only',
  'auth,firestore,storage',
];

const parsePort = (hostWithPort, fallbackPort) => {
  const segments = hostWithPort?.split(':');
  const maybePort = segments?.at(-1);
  const parsed = Number.parseInt(maybePort || '', 10);
  return Number.isFinite(parsed) ? parsed : fallbackPort;
};

const getListeningPids = (port) => {
  try {
    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    if (!output) {
      return [];
    }

    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const getCommandForPid = (pid) => {
  try {
    return execSync(`ps -p ${pid} -o command=`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return '';
  }
};

const stopStaleFirestoreEmulators = () => {
  const firestorePort = parsePort(
    process.env.PW_FIRESTORE_EMULATOR_HOST ||
      process.env.VITE_FIRESTORE_EMULATOR_HOST ||
      '127.0.0.1:8080',
    8080
  );
  const listeningPids = getListeningPids(firestorePort);

  listeningPids.forEach((pidValue) => {
    const pid = Number.parseInt(pidValue, 10);
    if (!Number.isFinite(pid)) {
      return;
    }

    const commandForPid = getCommandForPid(pid);
    const isFirestoreEmulatorProcess =
      commandForPid.includes('cloud-firestore-emulator') &&
      commandForPid.includes('--port');

    if (!isFirestoreEmulatorProcess) {
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
      console.log(
        `[emulators] Stopped stale Firestore emulator process on port ${firestorePort} (pid=${pid}).`
      );
    } catch {
      // Ignore and let firebase-tools report if port remains unavailable.
    }
  });
};

stopStaleFirestoreEmulators();

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    // Prevent CLI update-check failures in restricted/home-directory-limited runners.
    FIREBASE_SKIP_UPDATE_CHECK:
      process.env.FIREBASE_SKIP_UPDATE_CHECK || 'true',
    NO_UPDATE_NOTIFIER: process.env.NO_UPDATE_NOTIFIER || '1',
    npm_config_update_notifier:
      process.env.npm_config_update_notifier || 'false',
    CI: process.env.CI || 'true',
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  if ('code' in error && error.code === 'ENOENT') {
    console.error(
      '[emulators] Firebase CLI not found. Install it once with `npm i -D firebase-tools` (preferred) or `npm i -g firebase-tools`.'
    );
  } else {
    console.error('[emulators] Failed to start Firebase emulators:', error);
  }

  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

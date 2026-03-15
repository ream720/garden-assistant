import { spawn } from 'node:child_process';
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

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
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

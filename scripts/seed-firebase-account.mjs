import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'] });

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEED_SOURCE = 'scripts/seed-firebase-account.mjs';
const DEFAULT_SIZE = 'medium';
const DEFAULT_BATCH_PREFIX = 'seed';

const DATASET_SIZES = {
  light: {
    spaces: 2,
    plants: 8,
    notes: 20,
    tasks: 15,
  },
  medium: {
    spaces: 4,
    plants: 20,
    notes: 60,
    tasks: 40,
  },
  heavy: {
    spaces: 8,
    plants: 60,
    notes: 180,
    tasks: 120,
  },
};

const SPACE_NAMES = [
  'Propagation Tent',
  'Main Veg Room',
  'Bloom Canopy',
  'Drying Corner',
  'Outdoor Raised Bed',
  'Greenhouse Bay',
  'Garage Hydro Rail',
  'Balcony Pots',
  'Clone Shelf',
  'Mothers Area',
];

const SPACE_TYPES = [
  'indoor-tent',
  'outdoor-bed',
  'greenhouse',
  'hydroponic',
  'container',
];

const PLANT_NAMES = [
  'Blue Dream',
  'Northern Lights',
  'Strawberry Cough',
  'Jack Herer',
  'Pineapple Express',
  'White Widow',
  'Sour Diesel',
  'Amnesia Haze',
  'Gorilla Glue',
  'Purple Haze',
  'Sun Gold',
  'Early Girl',
  'Sweet Basil',
  'Cilantro',
  'Thai Chili',
  'Lavender',
  'Rosemary',
  'Lemon Balm',
];

const VARIETIES = [
  'Hybrid',
  'Indica',
  'Sativa',
  'Autoflower Hybrid',
  'Heirloom',
  'Bush',
  'Compact',
  'Dwarf',
];

const SEED_SOURCES = [
  'Local nursery',
  'Trusted cuttings',
  'Online seed bank',
  'Saved from prior run',
  'Friend trade',
  'Garden center',
];

const NOTE_CONTENTS = {
  observation: [
    'Steady vertical growth and healthy leaf color today.',
    'Internodal spacing tightened after light adjustment.',
    'Canopy recovery looks strong after topping session.',
    'Leaf posture improved after yesterday watering cycle.',
  ],
  feeding: [
    'Applied balanced nutrient feed at reduced strength.',
    'Fed bloom nutrients with added calcium-magnesium support.',
    'Completed plain-water flush to reset medium.',
    'Adjusted EC target after runoff reading.',
  ],
  pruning: [
    'Removed lower growth to improve airflow and focus energy.',
    'Light defoliation completed to open interior canopy.',
    'Pruned weak side shoots before next training cycle.',
    'Completed tidy-up pass ahead of flower transition.',
  ],
  issue: [
    'Found minor tip burn and reduced nutrient strength.',
    'Detected early pest pressure; treated with preventive spray.',
    'Humidity spiked overnight; increased exhaust schedule.',
    'Observed pH drift and recalibrated dosing routine.',
  ],
  milestone: [
    'First true leaves formed and growth is stable.',
    'Transitioned to flowering light schedule this week.',
    'Reached full canopy fill target for this space.',
    'Harvested and moved batch to controlled dry area.',
  ],
  general: [
    'Cleaned the space and reorganized equipment layout.',
    'Recalibrated meters and logged baseline readings.',
    'Adjusted circulation fan angles for even movement.',
    'Updated schedule for upcoming maintenance cycle.',
  ],
};

const TASK_TITLES = [
  'Water and inspect root zone',
  'Check pH and EC',
  'Top-dress nutrients',
  'Inspect canopy for pests',
  'Rotate plant positions',
  'Prune lower growth',
  'Check runoff values',
  'Clean reservoir and lines',
  'Record growth measurements',
  'Prepare next feeding mix',
];

const parseArgs = (argv) => {
  const parsed = {
    dryRun: false,
    size: process.env.SEED_DATASET_SIZE || DEFAULT_SIZE,
    randomSeed: process.env.SEED_RANDOM_SEED || null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg.startsWith('--size=')) {
      parsed.size = arg.slice('--size='.length).trim();
      continue;
    }

    if (arg.startsWith('--seed=')) {
      parsed.randomSeed = arg.slice('--seed='.length).trim();
    }
  }

  return parsed;
};

const printUsage = () => {
  console.log(`
Append-only Firebase account seeding for realistic UI datasets.

Usage:
  node scripts/seed-firebase-account.mjs [--dry-run] [--size=light|medium|heavy] [--seed=<value>]

Examples:
  npm run seed:account
  npm run seed:account:dry
  node scripts/seed-firebase-account.mjs --size=heavy --seed=qa-pass-1

Environment:
  Required:
    VITE_FIREBASE_API_KEY
    VITE_FIREBASE_PROJECT_ID
    VITE_FIREBASE_LOGIN_USER
    VITE_FIREBASE_LOGIN_PW
`);
};

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

const stripUndefined = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item));
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefined(entryValue)]);

    return Object.fromEntries(entries);
  }

  return value;
};

const toFirestoreDocument = (data) => ({
  fields: Object.fromEntries(
    Object.entries(stripUndefined(data)).map(([key, value]) => [
      key,
      toFieldValue(value),
    ])
  ),
});

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRng = (seedInput) => {
  let state = hashString(seedInput);

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randomInt = (rng, min, max) =>
  Math.floor(rng() * (max - min + 1)) + min;

const randomItem = (rng, items) => items[Math.floor(rng() * items.length)];

const addDays = (date, days) => new Date(date.getTime() + days * MS_PER_DAY);

const minDate = (a, b) => (a.getTime() <= b.getTime() ? a : b);

const randomDateBetween = (rng, start, end) => {
  const startTime = start.getTime();
  const endTime = end.getTime();

  if (endTime <= startTime) {
    return new Date(startTime);
  }

  return new Date(startTime + rng() * (endTime - startTime));
};

const weightedPlantStatus = (rng) => {
  const roll = rng();

  if (roll < 0.12) return 'seedling';
  if (roll < 0.45) return 'vegetative';
  if (roll < 0.74) return 'flowering';
  if (roll < 0.92) return 'harvested';
  return 'removed';
};

const weightedTaskPriority = (rng) => {
  const roll = rng();

  if (roll < 0.25) return 'high';
  if (roll < 0.7) return 'medium';
  return 'low';
};

const buildBatchToken = (rng, now) => {
  const ts = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = randomInt(rng, 100000, 999999);
  return `${DEFAULT_BATCH_PREFIX}-${ts}-${rand}`;
};

const buildDocId = (prefix, batchToken, index) =>
  `${prefix}-${batchToken}-${String(index + 1).padStart(3, '0')}`;

const buildSeedMeta = (batchToken, seededAt) => ({
  seedBatchId: batchToken,
  seedRecordSource: SEED_SOURCE,
  seededAt,
});

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const bodyText = await response.text();
  const body = bodyText ? (() => {
    try {
      return JSON.parse(bodyText);
    } catch {
      return bodyText;
    }
  })() : null;

  if (!response.ok) {
    const error = new Error(
      `Request failed (${response.status}) ${url}`
    );
    error.status = response.status;
    error.responseBody = body;
    throw error;
  }

  return body;
};

const buildFirestoreBaseUrl = (projectId) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

const signInWithPassword = async ({ apiKey, email, password }) => {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;

  const response = await requestJson(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  if (!response?.idToken || !response?.localId) {
    throw new Error('Auth response missing idToken/localId');
  }

  return {
    uid: response.localId,
    idToken: response.idToken,
    displayName: response.displayName || 'E2E Test User',
  };
};

const getDocumentIfExists = async ({
  firestoreBaseUrl,
  collection,
  documentId,
  idToken,
}) => {
  const docUrl = `${firestoreBaseUrl}/${collection}/${encodeURIComponent(documentId)}`;

  try {
    return await requestJson(docUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
};

const createDocument = async ({
  firestoreBaseUrl,
  collection,
  documentId,
  data,
  idToken,
}) => {
  const suffix = documentId
    ? `?documentId=${encodeURIComponent(documentId)}`
    : '';

  return requestJson(`${firestoreBaseUrl}/${collection}${suffix}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(toFirestoreDocument(data)),
  });
};

const upsertUserDocIfMissing = async ({
  firestoreBaseUrl,
  uid,
  email,
  displayName,
  idToken,
  batchToken,
  now,
}) => {
  const existing = await getDocumentIfExists({
    firestoreBaseUrl,
    collection: 'users',
    documentId: uid,
    idToken,
  });

  if (existing) {
    return false;
  }

  const seedMeta = buildSeedMeta(batchToken, now);

  await createDocument({
    firestoreBaseUrl,
    collection: 'users',
    documentId: uid,
    idToken,
    data: {
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
          push: false,
          taskReminders: true,
        },
      },
      ...seedMeta,
    },
  });

  return true;
};

const buildDataset = ({
  rng,
  sizeConfig,
  batchToken,
  now,
}) => {
  const spaces = [];
  const plants = [];
  const notes = [];
  const tasks = [];
  const seedMeta = buildSeedMeta(batchToken, now);

  for (let i = 0; i < sizeConfig.spaces; i += 1) {
    const createdAt = randomDateBetween(rng, addDays(now, -260), addDays(now, -45));
    const id = buildDocId('space', batchToken, i);

    spaces.push({
      id,
      name:
        i < SPACE_NAMES.length
          ? SPACE_NAMES[i]
          : `Grow Space ${i + 1}`,
      type: randomItem(rng, SPACE_TYPES),
      description: 'Seeded realistic data for UI testing',
      plantCount: 0,
      createdAt,
      updatedAt: createdAt,
      ...seedMeta,
    });
  }

  for (let i = 0; i < sizeConfig.plants; i += 1) {
    const chosenSpace = randomItem(rng, spaces);
    const status = weightedPlantStatus(rng);
    const plantedDate = randomDateBetween(rng, addDays(now, -320), addDays(now, -8));
    const expectedHarvestDate = addDays(plantedDate, randomInt(rng, 70, 130));
    let actualHarvestDate;

    if (status === 'harvested') {
      const candidateHarvestDate = addDays(expectedHarvestDate, randomInt(rng, -5, 10));
      actualHarvestDate = minDate(candidateHarvestDate, now);
    }

    const updatedAt = actualHarvestDate
      ? actualHarvestDate
      : randomDateBetween(rng, plantedDate, now);
    const id = buildDocId('plant', batchToken, i);

    plants.push({
      id,
      spaceId: chosenSpace.id,
      name: `${randomItem(rng, PLANT_NAMES)} ${randomInt(rng, 1, 99)}`,
      variety: randomItem(rng, VARIETIES),
      seedSource: randomItem(rng, SEED_SOURCES),
      plantedDate,
      expectedHarvestDate,
      actualHarvestDate,
      status,
      notes:
        status === 'harvested'
          ? 'Harvest completed and drying workflow started.'
          : undefined,
      createdAt: plantedDate,
      updatedAt,
      ...seedMeta,
    });

    chosenSpace.plantCount += 1;
  }

  const noteCategories = Object.keys(NOTE_CONTENTS);

  for (let i = 0; i < sizeConfig.notes; i += 1) {
    const category = randomItem(rng, noteCategories);
    const withPlant = rng() < 0.85;
    const chosenPlant = withPlant ? randomItem(rng, plants) : null;
    const chosenSpace = chosenPlant
      ? spaces.find((space) => space.id === chosenPlant.spaceId) || randomItem(rng, spaces)
      : randomItem(rng, spaces);
    const timestamp = randomDateBetween(rng, addDays(now, -260), now);
    const contentBase = randomItem(rng, NOTE_CONTENTS[category]);
    const content = chosenPlant
      ? `${contentBase} (${chosenPlant.name})`
      : contentBase;

    notes.push({
      id: buildDocId('note', batchToken, i),
      plantId: chosenPlant?.id,
      spaceId: chosenSpace?.id,
      content,
      category,
      photos: [],
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...seedMeta,
    });
  }

  for (let i = 0; i < sizeConfig.tasks; i += 1) {
    const withPlant = rng() < 0.8;
    const chosenPlant = withPlant ? randomItem(rng, plants) : null;
    const chosenSpace = chosenPlant
      ? spaces.find((space) => space.id === chosenPlant.spaceId) || randomItem(rng, spaces)
      : randomItem(rng, spaces);
    const status = rng() < 0.35 ? 'completed' : 'pending';
    const priority = weightedTaskPriority(rng);

    let dueDate;
    let completedAt;

    if (status === 'completed') {
      dueDate = randomDateBetween(rng, addDays(now, -140), addDays(now, -1));
      completedAt = minDate(addDays(dueDate, randomInt(rng, 0, 3)), now);
    } else {
      const bucket = rng();
      if (bucket < 0.2) {
        dueDate = randomDateBetween(rng, addDays(now, -14), addDays(now, -1));
      } else if (bucket < 0.6) {
        dueDate = randomDateBetween(rng, now, addDays(now, 7));
      } else {
        dueDate = randomDateBetween(rng, addDays(now, 8), addDays(now, 45));
      }
    }

    const createdAtUpperBound = minDate(dueDate, now);
    const createdAt = randomDateBetween(rng, addDays(now, -180), createdAtUpperBound);

    tasks.push({
      id: buildDocId('task', batchToken, i),
      plantId: chosenPlant?.id,
      spaceId: chosenSpace?.id,
      title: randomItem(rng, TASK_TITLES),
      description: chosenPlant
        ? `Care follow-up for ${chosenPlant.name}.`
        : 'General maintenance task for this grow cycle.',
      dueDate,
      priority,
      status,
      completedAt,
      createdAt,
      updatedAt: completedAt || createdAt,
      ...seedMeta,
    });
  }

  return { spaces, plants, notes, tasks };
};

const summarizePlan = (sizeKey, sizeConfig, targetEmail, projectId, batchToken, dryRun) => {
  console.log('[seed-account] Configuration');
  console.log(`[seed-account] mode=${dryRun ? 'dry-run' : 'append-only write'}`);
  console.log(`[seed-account] project=${projectId}`);
  console.log(`[seed-account] account=${targetEmail}`);
  console.log(`[seed-account] dataset=${sizeKey}`);
  console.log(`[seed-account] seedBatchId=${batchToken}`);
  console.log(
    `[seed-account] planned writes: spaces=${sizeConfig.spaces}, plants=${sizeConfig.plants}, notes=${sizeConfig.notes}, tasks=${sizeConfig.tasks}`
  );
};

const validateRequiredEnv = (required) => {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const sizeKey = String(args.size || DEFAULT_SIZE).toLowerCase();
  const sizeConfig = DATASET_SIZES[sizeKey];

  if (!sizeConfig) {
    throw new Error(
      `Unsupported dataset size "${args.size}". Use one of: ${Object.keys(DATASET_SIZES).join(', ')}`
    );
  }

  const targetEmail = process.env.VITE_FIREBASE_LOGIN_USER || '';
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || '';
  const now = new Date();

  const randomSeed = args.randomSeed || String(now.getTime());
  const rng = createRng(randomSeed);
  const batchToken = buildBatchToken(rng, now);

  summarizePlan(
    sizeKey,
    sizeConfig,
    targetEmail || '(missing VITE_FIREBASE_LOGIN_USER)',
    projectId || '(missing VITE_FIREBASE_PROJECT_ID)',
    batchToken,
    args.dryRun
  );

  if (args.dryRun) {
    console.log('[seed-account] Dry run only. No network calls or writes were made.');
    return;
  }

  validateRequiredEnv([
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_LOGIN_USER',
    'VITE_FIREBASE_LOGIN_PW',
  ]);

  const credentials = await signInWithPassword({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    email: process.env.VITE_FIREBASE_LOGIN_USER,
    password: process.env.VITE_FIREBASE_LOGIN_PW,
  });
  const firestoreBaseUrl = buildFirestoreBaseUrl(process.env.VITE_FIREBASE_PROJECT_ID);

  console.log(`[seed-account] Authenticated uid=${credentials.uid}`);

  const userDocCreated = await upsertUserDocIfMissing({
    firestoreBaseUrl,
    uid: credentials.uid,
    email: process.env.VITE_FIREBASE_LOGIN_USER,
    displayName: credentials.displayName,
    idToken: credentials.idToken,
    batchToken,
    now,
  });

  if (userDocCreated) {
    console.log('[seed-account] Created missing users/{uid} document.');
  }

  const dataset = buildDataset({
    rng,
    sizeConfig,
    batchToken,
    now,
  });

  for (const space of dataset.spaces) {
    const { id, ...spaceData } = space;
    await createDocument({
      firestoreBaseUrl,
      collection: `users/${credentials.uid}/spaces`,
      documentId: id,
      data: spaceData,
      idToken: credentials.idToken,
    });
  }

  for (const plant of dataset.plants) {
    const { id, ...plantData } = plant;
    await createDocument({
      firestoreBaseUrl,
      collection: `users/${credentials.uid}/plants`,
      documentId: id,
      data: plantData,
      idToken: credentials.idToken,
    });
  }

  for (const note of dataset.notes) {
    const { id, ...noteData } = note;
    await createDocument({
      firestoreBaseUrl,
      collection: `users/${credentials.uid}/notes`,
      documentId: id,
      data: noteData,
      idToken: credentials.idToken,
    });
  }

  for (const task of dataset.tasks) {
    const { id, ...taskData } = task;
    await createDocument({
      firestoreBaseUrl,
      collection: `users/${credentials.uid}/tasks`,
      documentId: id,
      data: taskData,
      idToken: credentials.idToken,
    });
  }

  console.log('[seed-account] Seed completed successfully.');
  console.log(
    `[seed-account] created: spaces=${dataset.spaces.length}, plants=${dataset.plants.length}, notes=${dataset.notes.length}, tasks=${dataset.tasks.length}`
  );
  console.log(`[seed-account] seedBatchId=${batchToken}`);
};

run().catch((error) => {
  const status = error?.status ? ` status=${error.status}` : '';
  const details = error?.responseBody ? ` response=${JSON.stringify(error.responseBody)}` : '';
  console.error(`[seed-account] Failed:${status} ${error instanceof Error ? error.message : String(error)}${details}`);
  process.exitCode = 1;
});

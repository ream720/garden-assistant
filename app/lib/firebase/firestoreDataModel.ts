export type FirestoreDataModelMode = 'dual' | 'subcollections';

const DEFAULT_DATA_MODEL_MODE: FirestoreDataModelMode = 'dual';

const normalizeMode = (value: unknown): FirestoreDataModelMode => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'subcollections' ? 'subcollections' : DEFAULT_DATA_MODEL_MODE;
};

export const FIRESTORE_DATA_MODEL_MODE: FirestoreDataModelMode = normalizeMode(
  import.meta.env.VITE_FIRESTORE_DATA_MODEL_MODE
);

export const isDualFirestoreDataModel = (): boolean =>
  FIRESTORE_DATA_MODEL_MODE === 'dual';

export const isSubcollectionFirestoreDataModel = (): boolean =>
  FIRESTORE_DATA_MODEL_MODE === 'subcollections';

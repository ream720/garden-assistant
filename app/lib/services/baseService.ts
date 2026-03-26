import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryConstraint,
} from 'firebase/firestore';
import type { FirestoreDocument } from '../firebase/firestore';
import {
  getTopLevelCollectionRef,
  getTopLevelDocumentRef,
  getUserScopedCollectionRefs,
  getUserScopedDocumentRefs,
} from '../firebase/firestorePaths';
import { cleanFirestoreData } from '../utils/firestoreUtils';

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

export interface ServiceResult<T> {
  data?: T;
  error?: ServiceError;
  loading?: boolean;
}

export interface QueryFilters {
  where?: Array<{ field: string; operator: any; value: any }>;
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
}

export interface BaseServiceOptions {
  userScoped?: boolean;
}

export abstract class BaseService<T extends FirestoreDocument> {
  protected collectionName: string;
  protected userScoped: boolean;

  constructor(collectionName: string, options: BaseServiceOptions = {}) {
    this.collectionName = collectionName;
    this.userScoped = Boolean(options.userScoped);
  }

  /**
   * Recursively convert Firestore timestamp-like values into Date objects.
   */
  private convertFirestoreDates(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
      try {
        return (value as { toDate: () => Date }).toDate();
      } catch {
        return value;
      }
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.convertFirestoreDates(item));
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
          key,
          this.convertFirestoreDates(nestedValue),
        ])
      );
    }

    return value;
  }

  private mapDocument(id: string, data: DocumentData): T {
    return {
      ...(this.convertFirestoreDates(data) as Record<string, unknown>),
      id,
    } as T;
  }

  private missingUserIdError(): ServiceError {
    return {
      code: 'VALIDATION_ERROR',
      message: 'User ID is required',
    };
  }

  private sanitizeUserScopedPayload(
    payload: Record<string, unknown>
  ): Record<string, unknown> {
    if (!this.userScoped) {
      return payload;
    }

    const { userId: _ignoredUserId, ...sanitized } = payload;
    return sanitized;
  }

  private hydrateUserScopedDocument(document: T, userId?: string): T {
    if (!this.userScoped || !userId) {
      return document;
    }

    const currentUserId = (document as Record<string, unknown>).userId;
    if (typeof currentUserId === 'string' && currentUserId.length > 0) {
      return document;
    }

    return {
      ...(document as Record<string, unknown>),
      userId,
    } as unknown as T;
  }

  private normalizeComparable(value: unknown): unknown {
    if (value instanceof Date) {
      return value.getTime();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
      try {
        return (value as { toDate: () => Date }).toDate().getTime();
      } catch {
        return value;
      }
    }

    if (typeof value === 'string') {
      const dateValue = Date.parse(value);
      if (!Number.isNaN(dateValue)) {
        return dateValue;
      }
    }

    return value;
  }

  private sortDocuments(documents: T[], filters?: QueryFilters): T[] {
    if (!filters?.orderBy?.length) {
      return documents;
    }

    const sorted = [...documents];

    sorted.sort((left, right) => {
      for (const { field, direction } of filters.orderBy || []) {
        const leftValue = this.normalizeComparable((left as Record<string, unknown>)[field]);
        const rightValue = this.normalizeComparable((right as Record<string, unknown>)[field]);

        if (leftValue === rightValue) {
          continue;
        }

        if (leftValue === undefined || leftValue === null) {
          return direction === 'asc' ? -1 : 1;
        }

        if (rightValue === undefined || rightValue === null) {
          return direction === 'asc' ? 1 : -1;
        }

        const comparison = leftValue < rightValue ? -1 : 1;
        return direction === 'asc' ? comparison : comparison * -1;
      }

      return 0;
    });

    return sorted;
  }

  private finalizeDocuments(documents: T[], filters?: QueryFilters): T[] {
    const ordered = this.sortDocuments(documents, filters);
    if (!filters?.limit || filters.limit <= 0) {
      return ordered;
    }

    return ordered.slice(0, filters.limit);
  }

  private buildQueryConstraints(
    filters?: QueryFilters,
    options?: {
      stripUserIdFilter?: boolean;
    }
  ): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];

    if (filters?.where) {
      filters.where.forEach(({ field, operator, value }) => {
        if (field === 'userId' && options?.stripUserIdFilter) {
          return;
        }

        constraints.push(where(field, operator, value));
      });
    }

    if (filters?.orderBy) {
      filters.orderBy.forEach(({ field, direction }) => {
        constraints.push(orderBy(field, direction));
      });
    }

    return constraints;
  }

  /**
   * Create a new document in the collection
   */
  async create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    userId?: string
  ): Promise<ServiceResult<T>> {
    try {
      if (this.userScoped && !userId) {
        return { error: this.missingUserIdError() };
      }

      const now = Timestamp.now();
      const basePayload = this.sanitizeUserScopedPayload(
        data as Record<string, unknown>
      );
      const cleanData = cleanFirestoreData({
        ...basePayload,
        createdAt: now,
        updatedAt: now,
      });

      if (!this.userScoped) {
        const docRef = await addDoc(getTopLevelCollectionRef(this.collectionName), cleanData);
        const createdDoc = await this.getById(docRef.id);
        return { data: createdDoc.data };
      }

      const { primary } = getUserScopedCollectionRefs(this.collectionName, userId!);
      const primaryDocRef = doc(primary);

      await setDoc(primaryDocRef, cleanData);

      const createdDoc = await this.getById(primaryDocRef.id, userId);
      return { data: createdDoc.data };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * Get a document by ID
   */
  async getById(id: string, userId?: string): Promise<ServiceResult<T>> {
    try {
      if (!this.userScoped) {
        const topLevelRef = getTopLevelDocumentRef(this.collectionName, id);
        const topLevelSnapshot = await getDoc(topLevelRef);

        if (topLevelSnapshot.exists()) {
          const document = this.mapDocument(topLevelSnapshot.id, topLevelSnapshot.data());
          return { data: document };
        }

        return { error: { code: 'NOT_FOUND', message: 'Document not found' } };
      }

      if (!userId) {
        return { error: this.missingUserIdError() };
      }

      const { primary } = getUserScopedDocumentRefs(
        this.collectionName,
        userId,
        id
      );

      const primarySnapshot = await getDoc(primary);
      if (primarySnapshot.exists()) {
        const document = this.hydrateUserScopedDocument(
          this.mapDocument(primarySnapshot.id, primarySnapshot.data()),
          userId
        );
        return { data: document };
      }

      return { error: { code: 'NOT_FOUND', message: 'Document not found' } };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * Update a document by ID
   */
  async update(
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
    userId?: string
  ): Promise<ServiceResult<T>> {
    try {
      const sanitizedUpdates = this.sanitizeUserScopedPayload(
        updates as Record<string, unknown>
      );
      const cleanUpdates = cleanFirestoreData({
        ...sanitizedUpdates,
        updatedAt: Timestamp.now(),
      });

      if (!this.userScoped) {
        const topLevelRef = getTopLevelDocumentRef(this.collectionName, id);
        await updateDoc(topLevelRef, cleanUpdates);

        const updatedDoc = await this.getById(id);
        return { data: updatedDoc.data };
      }

      if (!userId) {
        return { error: this.missingUserIdError() };
      }

      const existingDocument = await this.getById(id, userId);
      if (existingDocument.error) {
        return { error: existingDocument.error };
      }

      const { primary } = getUserScopedDocumentRefs(
        this.collectionName,
        userId,
        id
      );

      await setDoc(primary, cleanUpdates, { merge: true });

      const updatedDoc = await this.getById(id, userId);
      return { data: updatedDoc.data };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(id: string, userId?: string): Promise<ServiceResult<void>> {
    try {
      if (!this.userScoped) {
        await deleteDoc(getTopLevelDocumentRef(this.collectionName, id));
        return { data: undefined };
      }

      if (!userId) {
        return { error: this.missingUserIdError() };
      }

      const { primary } = getUserScopedDocumentRefs(
        this.collectionName,
        userId,
        id
      );

      await deleteDoc(primary);

      return { data: undefined };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * List documents with optional filters
   */
  async list(filters?: QueryFilters, userId?: string): Promise<ServiceResult<T[]>> {
    try {
      if (!this.userScoped) {
        const constraints = this.buildQueryConstraints(filters);
        const q = query(getTopLevelCollectionRef(this.collectionName), ...constraints);
        const querySnapshot = await getDocs(q);

        const documents = querySnapshot.docs.map((snapshotDoc) =>
          this.mapDocument(snapshotDoc.id, snapshotDoc.data())
        );

        return { data: this.finalizeDocuments(documents, filters) };
      }

      if (!userId) {
        return { error: this.missingUserIdError() };
      }

      const { primary } = getUserScopedCollectionRefs(this.collectionName, userId);

      const primaryConstraints = this.buildQueryConstraints(filters, {
        stripUserIdFilter: true,
      });

      const primaryQuery = query(primary, ...primaryConstraints);
      const primarySnapshot = await getDocs(primaryQuery);

      const primaryDocuments = primarySnapshot.docs.map((snapshotDoc) =>
        this.hydrateUserScopedDocument(
          this.mapDocument(snapshotDoc.id, snapshotDoc.data()),
          userId
        )
      );

      return { data: this.finalizeDocuments(primaryDocuments, filters) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * Subscribe to real-time updates for a collection
   */
  subscribe(
    callback: (result: ServiceResult<T[]>) => void,
    filters?: QueryFilters,
    userId?: string
  ): () => void {
    try {
      if (!this.userScoped) {
        const constraints = this.buildQueryConstraints(filters);
        const q = query(getTopLevelCollectionRef(this.collectionName), ...constraints);

        return onSnapshot(
          q,
          (querySnapshot) => {
            const documents = querySnapshot.docs.map((snapshotDoc) =>
              this.mapDocument(snapshotDoc.id, snapshotDoc.data())
            );

            callback({ data: this.finalizeDocuments(documents, filters) });
          },
          (error) => {
            callback({ error: this.handleError(error) });
          }
        );
      }

      if (!userId) {
        callback({ error: this.missingUserIdError() });
        return () => {};
      }

      const { primary } = getUserScopedCollectionRefs(this.collectionName, userId);

      const primaryConstraints = this.buildQueryConstraints(filters, {
        stripUserIdFilter: true,
      });
      const primaryQuery = query(primary, ...primaryConstraints);

      return onSnapshot(
        primaryQuery,
        (querySnapshot) => {
          const primaryDocuments = querySnapshot.docs.map((snapshotDoc) =>
            this.hydrateUserScopedDocument(
              this.mapDocument(snapshotDoc.id, snapshotDoc.data()),
              userId
            )
          );
          callback({ data: this.finalizeDocuments(primaryDocuments, filters) });
        },
        (error) => {
          callback({ error: this.handleError(error) });
        }
      );
    } catch (error) {
      callback({ error: this.handleError(error) });
      return () => {};
    }
  }

  /**
   * Subscribe to real-time updates for a single document
   */
  subscribeToDocument(
    id: string,
    callback: (result: ServiceResult<T>) => void,
    userId?: string
  ): () => void {
    try {
      if (!this.userScoped) {
        const topLevelRef = getTopLevelDocumentRef(this.collectionName, id);

        return onSnapshot(
          topLevelRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const document = this.mapDocument(docSnap.id, docSnap.data());
              callback({ data: document });
            } else {
              callback({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
            }
          },
          (error) => {
            callback({ error: this.handleError(error) });
          }
        );
      }

      if (!userId) {
        callback({ error: this.missingUserIdError() });
        return () => {};
      }

      const { primary } = getUserScopedDocumentRefs(this.collectionName, userId, id);

      return onSnapshot(
        primary,
        (docSnap) => {
          if (docSnap.exists()) {
            const hydratedDocument = this.hydrateUserScopedDocument(
              this.mapDocument(docSnap.id, docSnap.data()),
              userId
            );
            callback({ data: hydratedDocument });
            return;
          }

          callback({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
        },
        (error) => {
          callback({ error: this.handleError(error) });
        }
      );
    } catch (error) {
      callback({ error: this.handleError(error) });
      return () => {};
    }
  }

  /**
   * Handle Firebase errors and convert them to ServiceError format
   */
  protected handleError(error: any): ServiceError {
    if (error.code) {
      // Firebase error
      const firebaseError = error as FirestoreError;
      switch (firebaseError.code) {
        case 'permission-denied':
          return {
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to perform this action',
            details: firebaseError,
          };
        case 'not-found':
          return {
            code: 'NOT_FOUND',
            message: 'The requested document was not found',
            details: firebaseError,
          };
        case 'already-exists':
          return {
            code: 'ALREADY_EXISTS',
            message: 'A document with this ID already exists',
            details: firebaseError,
          };
        case 'failed-precondition':
          return {
            code: 'FAILED_PRECONDITION',
            message:
              'The operation failed due to a precondition failure. This might be due to missing Firestore indexes or security rules.',
            details: firebaseError,
          };
        case 'aborted':
          return {
            code: 'ABORTED',
            message: 'The operation was aborted due to a conflict',
            details: firebaseError,
          };
        case 'out-of-range':
          return {
            code: 'OUT_OF_RANGE',
            message: 'The specified range is invalid',
            details: firebaseError,
          };
        case 'unimplemented':
          return {
            code: 'UNIMPLEMENTED',
            message: 'This operation is not implemented',
            details: firebaseError,
          };
        case 'internal':
          return {
            code: 'INTERNAL_ERROR',
            message: 'An internal error occurred',
            details: firebaseError,
          };
        case 'unavailable':
          return {
            code: 'UNAVAILABLE',
            message: 'The service is currently unavailable',
            details: firebaseError,
          };
        case 'data-loss':
          return {
            code: 'DATA_LOSS',
            message: 'Unrecoverable data loss or corruption',
            details: firebaseError,
          };
        case 'unauthenticated':
          return {
            code: 'UNAUTHENTICATED',
            message: 'You must be authenticated to perform this action',
            details: firebaseError,
          };
        default:
          return {
            code: 'UNKNOWN_FIREBASE_ERROR',
            message: firebaseError.message || 'An unknown Firebase error occurred',
            details: firebaseError,
          };
      }
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error,
    };
  }
}

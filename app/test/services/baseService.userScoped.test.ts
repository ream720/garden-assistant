import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseService } from '../../lib/services/baseService';
import type { FirestoreDocument } from '../../lib/firebase/firestore';

const mockState = vi.hoisted(() => ({
  generatedDocId: 0,
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn((ref: unknown, ...constraints: unknown[]) => ({ ref, constraints })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: mockState.addDoc,
  collection: mockState.collection,
  deleteDoc: mockState.deleteDoc,
  doc: mockState.doc,
  getDoc: mockState.getDoc,
  getDocs: mockState.getDocs,
  onSnapshot: mockState.onSnapshot,
  orderBy: mockState.orderBy,
  query: mockState.query,
  setDoc: mockState.setDoc,
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2024-01-01T00:00:00.000Z'),
    })),
  },
  updateDoc: mockState.updateDoc,
  where: mockState.where,
}));

vi.mock('../../lib/firebase/config', () => ({
  db: {},
}));

interface UserScopedDoc extends FirestoreDocument {
  userId: string;
  name: string;
  value: number;
}

class UserScopedTestService extends BaseService<UserScopedDoc> {
  constructor() {
    super('things', { userScoped: true });
  }
}

const makeTimestamp = (iso: string) => ({
  toDate: () => new Date(iso),
});

describe('BaseService (user scoped, subcollections)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.generatedDocId = 0;

    mockState.collection.mockImplementation((...args: unknown[]) => ({
      path: args.slice(1).map(String).join('/'),
    }));

    mockState.doc.mockImplementation((...args: unknown[]) => {
      if (
        args.length === 1 &&
        typeof args[0] === 'object' &&
        args[0] !== null &&
        'path' in (args[0] as Record<string, unknown>)
      ) {
        mockState.generatedDocId += 1;
        const id = `generated-${mockState.generatedDocId}`;
        const collectionRef = args[0] as { path: string };
        return { id, path: `${collectionRef.path}/${id}` };
      }

      if (
        args.length === 2 &&
        typeof args[0] === 'object' &&
        args[0] !== null &&
        'path' in (args[0] as Record<string, unknown>)
      ) {
        const collectionRef = args[0] as { path: string };
        const id = String(args[1]);
        return { id, path: `${collectionRef.path}/${id}` };
      }

      const id = String(args[args.length - 1]);
      const segments = args.slice(1).map(String);
      return { id, path: segments.join('/') };
    });
  });

  it('rejects user-scoped operations when user context is missing', async () => {
    const service = new UserScopedTestService();

    const getResult = await service.getById('doc-1');
    const listResult = await service.list();
    const updateResult = await service.update('doc-1', { name: 'Updated' });
    const deleteResult = await service.delete('doc-1');

    expect(getResult.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'User ID is required',
    });
    expect(listResult.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'User ID is required',
    });
    expect(updateResult.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'User ID is required',
    });
    expect(deleteResult.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'User ID is required',
    });
  });

  it('creates only in user subcollection and strips transitional userId field', async () => {
    const service = new UserScopedTestService();
    const createdDocument: UserScopedDoc = {
      id: 'generated-1',
      userId: 'user-1',
      name: 'Created',
      value: 5,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    vi.spyOn(service, 'getById').mockResolvedValue({ data: createdDocument });

    const result = await service.create(
      {
        userId: 'user-1',
        name: 'Created',
        value: 5,
      },
      'user-1'
    );

    expect(result.data).toEqual(createdDocument);
    expect(mockState.setDoc).toHaveBeenCalledTimes(1);
    expect(mockState.setDoc.mock.calls[0][0]).toMatchObject({
      path: 'users/user-1/things/generated-1',
    });
    expect(mockState.setDoc.mock.calls[0][1]).not.toHaveProperty('userId');
  });

  it('hydrates userId from path context when missing in stored subcollection docs', async () => {
    const service = new UserScopedTestService();

    mockState.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'sub-only',
          data: () => ({
            name: 'Subcollection Only',
            value: 2,
            createdAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
            updatedAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
          }),
        },
      ],
    });

    const result = await service.list(undefined, 'user-1');

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('sub-only');
    expect(result.data?.[0].userId).toBe('user-1');
  });

  it('updates subcollection document only and strips userId from update payload', async () => {
    const service = new UserScopedTestService();

    const existingDocument: UserScopedDoc = {
      id: 'doc-1',
      userId: 'user-1',
      name: 'Before',
      value: 2,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    const updatedDocument: UserScopedDoc = {
      ...existingDocument,
      name: 'After',
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    };

    vi.spyOn(service, 'getById')
      .mockResolvedValueOnce({ data: existingDocument })
      .mockResolvedValueOnce({ data: updatedDocument });

    const result = await service.update(
      'doc-1',
      { name: 'After', userId: 'different-user' } as unknown as Partial<
        Omit<UserScopedDoc, 'id' | 'createdAt' | 'updatedAt'>
      >,
      'user-1'
    );

    expect(result.data).toEqual(updatedDocument);
    expect(mockState.setDoc).toHaveBeenCalledTimes(1);
    expect(mockState.setDoc.mock.calls[0][0]).toMatchObject({
      path: 'users/user-1/things/doc-1',
    });
    expect(mockState.setDoc.mock.calls[0][1]).not.toHaveProperty('userId');
    expect(mockState.setDoc.mock.calls[0][2]).toEqual({ merge: true });
  });
});

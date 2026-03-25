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
  isDualMode: vi.fn(() => true),
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

vi.mock('../../lib/firebase/firestoreDataModel', () => ({
  isDualFirestoreDataModel: mockState.isDualMode,
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

describe('BaseService (user scoped, dual mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.generatedDocId = 0;
    mockState.isDualMode.mockReturnValue(true);

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

  it('creates in subcollection and mirrors to legacy collection with identical id', async () => {
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
    expect(mockState.setDoc).toHaveBeenCalledTimes(2);

    const [primaryWrite, secondaryWrite] = mockState.setDoc.mock.calls;
    expect(primaryWrite[0]).toMatchObject({ path: 'users/user-1/things/generated-1' });
    expect(secondaryWrite[0]).toMatchObject({ path: 'things/generated-1' });
    expect(secondaryWrite[1]).toEqual(primaryWrite[1]);
  });

  it('merges dual-read results by id with subcollection precedence', async () => {
    const service = new UserScopedTestService();

    mockState.getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'shared',
            data: () => ({
              userId: 'user-1',
              name: 'Primary Shared',
              value: 1,
              createdAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
              updatedAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
            }),
          },
          {
            id: 'primary-only',
            data: () => ({
              userId: 'user-1',
              name: 'Primary Only',
              value: 2,
              createdAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
              updatedAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'shared',
            data: () => ({
              userId: 'user-1',
              name: 'Legacy Shared',
              value: 999,
              createdAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
              updatedAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
            }),
          },
          {
            id: 'legacy-only',
            data: () => ({
              userId: 'user-1',
              name: 'Legacy Only',
              value: 3,
              createdAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
              updatedAt: makeTimestamp('2024-01-01T00:00:00.000Z'),
            }),
          },
        ],
      });

    const result = await service.list(undefined, 'user-1');

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(3);

    const byId = Object.fromEntries((result.data || []).map((docItem) => [docItem.id, docItem]));
    expect(byId.shared.name).toBe('Primary Shared');
    expect(byId['primary-only'].name).toBe('Primary Only');
    expect(byId['legacy-only'].name).toBe('Legacy Only');
  });

  it('updates both models in dual mode with merge writes', async () => {
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

    const result = await service.update('doc-1', { name: 'After' }, 'user-1');

    expect(result.data).toEqual(updatedDocument);
    expect(mockState.setDoc).toHaveBeenCalledTimes(2);

    const [primaryWrite, secondaryWrite] = mockState.setDoc.mock.calls;
    expect(primaryWrite[0]).toMatchObject({ path: 'users/user-1/things/doc-1' });
    expect(primaryWrite[2]).toEqual({ merge: true });
    expect(secondaryWrite[0]).toMatchObject({ path: 'things/doc-1' });
    expect(secondaryWrite[2]).toEqual({ merge: true });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/firebase/firestorePaths', () => ({
  getUserDocumentRef: vi.fn(() => ({ id: 'users/test-user' })),
}));

vi.mock('firebase/firestore', () => ({
  Timestamp: {
    now: vi.fn(() => 'mock-now-timestamp'),
  },
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

import { getDoc, setDoc } from 'firebase/firestore';
import { ensureUserProfileDocument } from '../../lib/firebase/userProfile';

describe('ensureUserProfileDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates users/{uid} when the document does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
    } as any);

    await ensureUserProfileDocument({
      uid: 'test-user',
      email: 'test@example.com',
      displayName: 'Test User',
    });

    expect(setDoc).toHaveBeenCalledWith(
      { id: 'users/test-user' },
      expect.objectContaining({
        uid: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User',
        preferences: expect.objectContaining({
          defaultUnits: 'metric',
          timezone: 'America/New_York',
        }),
        createdAt: 'mock-now-timestamp',
        updatedAt: 'mock-now-timestamp',
      })
    );
  });

  it('merges profile updates when users/{uid} already exists', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
    } as any);

    await ensureUserProfileDocument({
      uid: 'test-user',
      email: 'updated@example.com',
      displayName: 'Updated Name',
    });

    expect(setDoc).toHaveBeenCalledWith(
      { id: 'users/test-user' },
      {
        uid: 'test-user',
        email: 'updated@example.com',
        displayName: 'Updated Name',
        updatedAt: 'mock-now-timestamp',
      },
      { merge: true }
    );
  });
});

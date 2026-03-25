import { Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { getUserDocumentRef } from './firestorePaths';

export interface UserProfileIdentity {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

const defaultPreferences = () => ({
  defaultUnits: 'metric',
  timezone: 'America/New_York',
  notifications: {
    email: true,
    push: false,
    taskReminders: true,
  },
});

export const ensureUserProfileDocument = async (
  identity: UserProfileIdentity
): Promise<void> => {
  if (!identity.uid) {
    throw new Error('User UID is required to ensure user profile');
  }

  const userRef = getUserDocumentRef(identity.uid);
  const snapshot = await getDoc(userRef);
  const now = Timestamp.now();

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: identity.uid,
      email: identity.email ?? null,
      displayName: identity.displayName ?? null,
      preferences: defaultPreferences(),
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await setDoc(
    userRef,
    {
      uid: identity.uid,
      email: identity.email ?? null,
      displayName: identity.displayName ?? null,
      updatedAt: now,
    },
    { merge: true }
  );
};

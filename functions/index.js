const { auth } = require('firebase-functions/v1');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

initializeApp();

const defaultPreferences = () => ({
  defaultUnits: 'metric',
  timezone: 'America/New_York',
  notifications: {
    email: true,
    push: false,
    taskReminders: true,
  },
});

exports.ensureUserProfileOnCreate = auth.user().onCreate(async (user) => {
  if (!user || !user.uid) {
    logger.warn('Auth create event missing user payload.');
    return;
  }

  const db = getFirestore();
  const userRef = db.collection('users').doc(user.uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    await userRef.set({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      preferences: defaultPreferences(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('Created users/{uid} profile via Auth trigger.', { uid: user.uid });
    return;
  }

  await userRef.set(
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logger.info('Updated existing users/{uid} profile via Auth trigger.', { uid: user.uid });
});

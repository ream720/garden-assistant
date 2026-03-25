import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './config';
import { ensureUserProfileDocument } from './userProfile';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export const createUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<AuthUser> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });
  await ensureUserProfileDocument({
    uid: userCredential.user.uid,
    email: userCredential.user.email,
    displayName,
  });

  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email,
    displayName: displayName,
  };
};

export const signIn = async (email: string, password: string, rememberMe: boolean = false): Promise<AuthUser> => {
  // Set persistence based on rememberMe preference
  // SESSION: logout when browser closes (default)
  // LOCAL: stay logged in across browser restarts (when rememberMe is true)
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfileDocument({
    uid: userCredential.user.uid,
    email: userCredential.user.email,
    displayName: userCredential.user.displayName,
  });

  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email,
    displayName: userCredential.user.displayName,
  };
};

export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const updateUserProfile = async (displayName: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('No user logged in');
  await updateProfile(auth.currentUser, { displayName });
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const formatAuthUser = (user: FirebaseUser): AuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
});

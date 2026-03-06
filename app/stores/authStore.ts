import { create } from 'zustand';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase/config';
import {
  createUser,
  signIn as firebaseSignIn,
  signOutUser,
  resetPassword as firebaseResetPassword,
  updateUserProfile,
  formatAuthUser
} from '../lib/firebase/auth';
import type { AuthUser, AuthState } from '../lib/types/auth';
import { getFriendlyAuthErrorMessage } from '../lib/firebase/authErrors';

interface AuthStore extends AuthState {
  // Additional loading states for specific operations
  signingIn: boolean;
  signingUp: boolean;
  resettingPassword: boolean;

  // Actions
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { displayName?: string; email?: string }) => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  loading: true,
  error: null,
  signingIn: false,
  signingUp: false,
  resettingPassword: false,

  // Actions
  signUp: async (email: string, password: string, displayName: string) => {
    try {
      set({ signingUp: true, error: null });
      const user = await createUser(email, password, displayName);
      set({ user, signingUp: false });
    } catch (error) {
      const errorMessage = getFriendlyAuthErrorMessage(error, 'signUp');
      set({ error: errorMessage, signingUp: false });
      throw error;
    }
  },

  signIn: async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      set({ signingIn: true, error: null });
      const user = await firebaseSignIn(email, password, rememberMe);
      set({ user, signingIn: false });
    } catch (error) {
      const errorMessage = getFriendlyAuthErrorMessage(error, 'signIn');
      set({ error: errorMessage, signingIn: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });
      await signOutUser();
      set({ user: null, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ resettingPassword: true, error: null });
      await firebaseResetPassword(email);
      set({ resettingPassword: false });
    } catch (error) {
      const errorMessage = getFriendlyAuthErrorMessage(error, 'resetPassword');
      set({ error: errorMessage, resettingPassword: false });
      throw error;
    }
  },

  updateProfile: async (updates: { displayName?: string; email?: string }) => {
    try {
      set({ loading: true, error: null });

      if (updates.displayName) {
        await updateUserProfile(updates.displayName);
      }

      // Update local state
      const currentUser = get().user;
      if (currentUser) {
        set({
          user: {
            ...currentUser,
            displayName: updates.displayName || currentUser.displayName,
          },
          loading: false
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user: AuthUser | null) => set({ user }),

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: string | null) => set({ error }),
}));

// Initialize auth state listener outside of the store
let authInitialized = false;
const AUTH_INIT_TIMEOUT_MS = 10000;

export const initializeAuth = () => {
  if (authInitialized) return;

  authInitialized = true;
  const initialStore = useAuthStore.getState();
  initialStore.setLoading(true);
  initialStore.setError(null);

  const initTimeoutId = setTimeout(() => {
    const store = useAuthStore.getState();
    if (store.loading) {
      store.setError('Authentication initialization timed out. Please refresh and try again.');
      store.setLoading(false);
    }
  }, AUTH_INIT_TIMEOUT_MS);

  onAuthStateChanged(
    auth,
    (firebaseUser: FirebaseUser | null) => {
      clearTimeout(initTimeoutId);
      const store = useAuthStore.getState();

      if (firebaseUser) {
        const user = formatAuthUser(firebaseUser);
        store.setUser(user);
      } else {
        store.setUser(null);
      }

      store.setError(null);
      store.setLoading(false);
    },
    (error) => {
      clearTimeout(initTimeoutId);
      const store = useAuthStore.getState();
      store.setUser(null);
      store.setError(error instanceof Error ? error.message : 'Failed to initialize authentication');
      store.setLoading(false);
    }
  );
};


# Firebase Authentication Integration

This directory contains the Firebase authentication integration for GROSPACE, providing secure user authentication and session management.

## Overview

The authentication system is built using:
- **Firebase Authentication** for secure user management
- **Zustand** for global authentication state
- **React Context** for component-level auth access
- **Custom hooks** for convenient auth operations

## Architecture

```
app/lib/firebase/
├── config.ts          # Firebase configuration and initialization
├── auth.ts            # Authentication utilities and functions
└── firestore.ts       # Firestore database utilities

app/stores/
└── authStore.ts       # Zustand store for auth state management

app/lib/contexts/
└── AuthContext.tsx    # React context provider for auth

app/lib/hooks/
└── useAuth.ts         # Custom hooks for auth operations

app/lib/types/
└── auth.ts           # TypeScript interfaces for auth
```

## Usage

### 1. Setup AuthProvider

Wrap your app with the `AuthProvider` to enable authentication:

```tsx
import { AuthProvider } from './lib/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <YourAppComponents />
    </AuthProvider>
  );
}
```

### 2. Using Authentication Hooks

```tsx
import { useAuth, useIsAuthenticated } from './lib/hooks/useAuth';

function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();
  const isAuthenticated = useIsAuthenticated();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.displayName}!</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => signIn('email@example.com', 'password')}>
          Sign In
        </button>
      )}
    </div>
  );
}
```

### 3. Direct Store Access

For more advanced use cases, you can access the store directly:

```tsx
import { useAuthStore } from './stores/authStore';

function AdvancedComponent() {
  const { user, setError, clearError } = useAuthStore();
  
  // Direct store manipulation
  const handleCustomError = () => {
    setError('Custom error message');
  };
}
```

## Available Methods

### Authentication Actions
- `signUp(email, password, displayName)` - Create new user account
- `signIn(email, password)` - Sign in existing user
- `signOut()` - Sign out current user
- `resetPassword(email)` - Send password reset email
- `updateProfile(updates)` - Update user profile (placeholder)

### State Management
- `user` - Current authenticated user or null
- `loading` - Authentication loading state
- `error` - Current error message or null
- `clearError()` - Clear current error

### Utility Hooks
- `useAuth()` - Full authentication context
- `useAuthUser()` - Current user only
- `useAuthLoading()` - Loading state only
- `useAuthError()` - Error state only
- `useIsAuthenticated()` - Boolean authentication status
- `useRequireAuth()` - Throws if not authenticated

## Firebase Configuration

The Firebase configuration is loaded from environment variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIRESTORE_DATA_MODEL_MODE=dual # dual | subcollections
```

## Security Features

- **Automatic session management** - Firebase handles token refresh
- **Real-time auth state** - Immediate updates across components
- **Error handling** - Comprehensive error messages and recovery
- **Type safety** - Full TypeScript support
- **Testing support** - Mockable for unit tests

## Testing

The authentication system includes comprehensive tests:

```bash
npm run test:run app/test/auth.test.tsx
npm run test:run app/test/authStore.test.ts
```

Tests cover:
- Context provider functionality
- Store state management
- Authentication flows
- Error handling
- Hook behavior

## Next Steps

This foundation supports the requirements for:
- User registration and login (Requirements 5.1, 5.2)
- Session management (Requirement 5.5)
- Firebase integration (Requirement 6.7)

Future enhancements will include:
- Profile management UI
- Password reset flow
- Email verification
- Social authentication

type AuthFlow = 'signIn' | 'signUp' | 'resetPassword' | 'generic';

const commonAuthErrorMessages: Record<string, string> = {
  'auth/network-request-failed': 'Network issue detected. Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a minute before trying again.',
  'auth/quota-exceeded': 'Login is temporarily unavailable due to service limits. Please try again shortly.',
  'auth/internal-error': 'Something went wrong. Please try again.',
};

const signInErrorMessages: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/invalid-login-credentials': 'Incorrect email or password. Please try again.',
  'auth/wrong-password': 'Incorrect email or password. Please try again.',
  'auth/user-not-found': 'Incorrect email or password. Please try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support for help.',
};

const signUpErrorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/operation-not-allowed': 'Sign up is currently unavailable. Please try again later.',
};

const resetPasswordErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found for this email.',
};

const defaultFlowMessage: Record<AuthFlow, string> = {
  signIn: 'Unable to sign in right now. Please try again.',
  signUp: 'Unable to create your account right now. Please try again.',
  resetPassword: 'Unable to send reset email right now. Please try again.',
  generic: 'Authentication failed. Please try again.',
};

const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  if ('code' in error && typeof error.code === 'string') {
    return error.code;
  }

  return null;
};

export const getFriendlyAuthErrorMessage = (
  error: unknown,
  flow: AuthFlow = 'generic'
): string => {
  const code = getErrorCode(error);

  if (code) {
    if (flow === 'signIn' && signInErrorMessages[code]) {
      return signInErrorMessages[code];
    }

    if (flow === 'signUp' && signUpErrorMessages[code]) {
      return signUpErrorMessages[code];
    }

    if (flow === 'resetPassword' && resetPasswordErrorMessages[code]) {
      return resetPasswordErrorMessages[code];
    }

    if (commonAuthErrorMessages[code]) {
      return commonAuthErrorMessages[code];
    }
  }

  return defaultFlowMessage[flow];
};


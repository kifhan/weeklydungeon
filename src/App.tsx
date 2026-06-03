import { useCallback, useState } from 'react';
import { GoogleAuthProvider, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/firebase';
import { AppRoutes } from '@/routes/AppRoutes';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const onSignIn = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  }, []);

  const onSignInAnon = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Anonymous sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  }, []);

  const onLogOut = useCallback(async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign out failed.');
    }
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-200">
        <p className="text-sm font-medium">Loading Weekly Dungeon...</p>
      </main>
    );
  }

  return (
    <AppRoutes
      user={user}
      onSignIn={onSignIn}
      onSignInAnon={onSignInAnon}
      onLogOut={onLogOut}
      authError={authError}
      signingIn={signingIn}
    />
  );
}

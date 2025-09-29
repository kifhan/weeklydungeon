
import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';

import { Header } from './components/Header';
import { MainContent } from './components/MainContent';
import { IntroSection } from './components/IntroSection';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const signInWithGoogle = async () => {
    try {
      setSigningIn(true);
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setAuthError(error.message || 'Failed to sign in with Google');
    } finally {
      setSigningIn(false);
    }
  };

  const signInAsGuest = async () => {
    try {
      setSigningIn(true);
      setAuthError(null);
      await signInAnonymously(auth);
    } catch (error: any) {
      setAuthError(error.message || 'Failed to sign in anonymously');
    } finally {
      setSigningIn(false);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      setAuthError(error.message || 'Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-xl text-gray-800 dark:text-white">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <IntroSection 
        onSignIn={signInWithGoogle}
        onSignInAnon={signInAsGuest}
        authError={authError}
        signingIn={signingIn}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <Header 
          user={user}
          onLogOut={logOut}
          authError={authError}
        />
        <MainContent user={user} />
      </div>
    </div>
  );
}

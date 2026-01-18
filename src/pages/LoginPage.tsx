import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { IntroSection } from '@/components/IntroSection';

interface LoginPageProps {
  user: FirebaseUser | null | undefined;
  onSignIn: () => void;
  onSignInAnon: () => void;
  authError: string | null;
  signingIn: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ user, onSignIn, onSignInAnon, authError, signingIn }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from;
  const fromPath =
    (from?.pathname || '') + (from?.search || '') + (from?.hash || '') || '/quests';

  useEffect(() => {
    if (!user) return;
    navigate(fromPath, { replace: true });
  }, [fromPath, navigate, user]);

  if (user) return null;

  return (
    <IntroSection
      onSignIn={onSignIn}
      onSignInAnon={onSignInAnon}
      authError={authError}
      signingIn={signingIn}
    />
  );
};

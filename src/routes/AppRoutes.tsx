import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { RequireAuth } from './RequireAuth';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { LoginPage } from '@/pages/LoginPage';
import { QuestsPage } from '@/pages/QuestsPage';
import { JournalPage } from '@/pages/JournalPage';
import { CharacterPage } from '@/pages/CharacterPage';
import { LifePage } from '@/pages/LifePage';
import { LifeAnswerDeliveryPage } from '@/pages/LifeAnswerDeliveryPage';
import { LifeAnswerQuestionPage } from '@/pages/LifeAnswerQuestionPage';
import { LifeAnswerDetailPage } from '@/pages/LifeAnswerDetailPage';

interface AppRoutesProps {
  user: FirebaseUser | null | undefined;
  onSignIn: () => void;
  onSignInAnon: () => void;
  onLogOut: () => void;
  authError: string | null;
  signingIn: boolean;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  user,
  onSignIn,
  onSignInAnon,
  onLogOut,
  authError,
  signingIn,
}) => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage
            user={user}
            onSignIn={onSignIn}
            onSignInAnon={onSignInAnon}
            authError={authError}
            signingIn={signingIn}
          />
        }
      />
      <Route
        element={
          <RequireAuth authedUser={user}>
            {user && (
              <AuthenticatedLayout
                authedUser={user}
                onLogOut={onLogOut}
                authError={authError}
              />
            )}
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/quests" replace />} />
        <Route path="quests" element={<QuestsPage uid={user!.uid} />} />
        <Route path="journal" element={<JournalPage uid={user!.uid} />} />
        <Route path="character" element={<CharacterPage uid={user!.uid} />} />
        <Route path="life" element={<Navigate to="/life/inbox" replace />} />
        <Route path="life/answer/delivery/:deliveryId" element={<LifeAnswerDeliveryPage uid={user!.uid} />} />
        <Route path="life/answer/question/:questionId" element={<LifeAnswerQuestionPage uid={user!.uid} />} />
        <Route path="life/answers/:answerId" element={<LifeAnswerDetailPage uid={user!.uid} />} />
        <Route path="life/:tab" element={<LifePage uid={user!.uid} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

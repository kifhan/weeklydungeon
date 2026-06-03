import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { RequireAuth } from './RequireAuth';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { LoginPage } from '@/pages/LoginPage';
import { CommandCenterPage } from '@/pages/CommandCenterPage';
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
  const uid = user?.uid;

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
        <Route index element={uid ? <CommandCenterPage uid={uid} /> : <Navigate to="/login" replace />} />
        <Route path="quests" element={uid ? <QuestsPage uid={uid} /> : <Navigate to="/login" replace />} />
        <Route path="habits" element={uid ? <JournalPage uid={uid} /> : <Navigate to="/login" replace />} />
        <Route path="journal" element={<Navigate to="/habits" replace />} />
        <Route path="character" element={uid ? <CharacterPage uid={uid} /> : <Navigate to="/login" replace />} />
        <Route path="reflections" element={<Navigate to="/reflections/inbox" replace />} />
        <Route path="life" element={<Navigate to="/reflections/inbox" replace />} />
        <Route
          path="life/answer/delivery/:deliveryId"
          element={<Navigate to="/reflections/inbox" replace />}
        />
        <Route
          path="life/answer/question/:questionId"
          element={<Navigate to="/reflections/questions" replace />}
        />
        <Route path="life/answers/:answerId" element={<Navigate to="/reflections/history" replace />} />
        <Route path="life/:tab" element={<Navigate to="/reflections/inbox" replace />} />
        <Route
          path="reflections/answer/delivery/:deliveryId"
          element={uid ? <LifeAnswerDeliveryPage uid={uid} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="reflections/answer/question/:questionId"
          element={uid ? <LifeAnswerQuestionPage uid={uid} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="reflections/answers/:answerId"
          element={uid ? <LifeAnswerDetailPage uid={uid} /> : <Navigate to="/login" replace />}
        />
        <Route path="reflections/:tab" element={uid ? <LifePage uid={uid} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

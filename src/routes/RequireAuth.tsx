import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';

interface RequireAuthProps {
  authedUser: FirebaseUser | null | undefined;
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ authedUser, children }) => {
  const location = useLocation();
  if (!authedUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
};

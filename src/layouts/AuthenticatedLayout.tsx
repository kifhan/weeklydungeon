import React from 'react';
import { Outlet } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { Header } from '@/components/Header';
import { NavigatorPanel } from '@/components/NavigatorPanel';

interface AuthenticatedLayoutProps {
  authedUser: FirebaseUser;
  onLogOut: () => void;
  authError: string | null;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ authedUser, onLogOut, authError }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-7xl">
        <Header user={authedUser} onLogOut={onLogOut} authError={authError} />

        <div className="flex gap-6 items-start">
          <NavigatorPanel />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

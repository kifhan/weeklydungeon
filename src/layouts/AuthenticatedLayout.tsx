import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { Header } from '@/components/Header';
import { MobileNavigationCabinet, NavigatorPanel } from '@/components/NavigatorPanel';

interface AuthenticatedLayoutProps {
  authedUser: FirebaseUser;
  onLogOut: () => void;
  authError: string | null;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ authedUser, onLogOut, authError }) => {
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    if (!navigationOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNavigationOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navigationOpen]);

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-7xl">
        <Header
          user={authedUser}
          onLogOut={onLogOut}
          authError={authError}
          onOpenNavigation={() => setNavigationOpen(true)}
        />
        <MobileNavigationCabinet open={navigationOpen} onClose={() => setNavigationOpen(false)} />

        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <NavigatorPanel />
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

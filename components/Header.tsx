import React from 'react';
import { User } from 'firebase/auth';
import { Button } from './ui/Button';

interface HeaderProps {
  user: User;
  onLogOut: () => void;
  authError: string | null;
}

export function Header({ user, onLogOut, authError }: HeaderProps) {
  return (
    <header className="text-center mb-8">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1"></div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            🗺️ Personal Management System
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            RPG-Style Scheduling & Daily Habit Tracking
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Welcome, {user?.isAnonymous ? 'Guest' : (user?.displayName || user?.email)}
            </p>
            <Button onClick={onLogOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
      {authError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {authError}
        </div>
      )}
    </header>
  );
}
import React from 'react';
import { User } from 'firebase/auth';
import { Menu } from 'lucide-react';
import { Button } from './ui/Button';

interface HeaderProps {
  user: User;
  onLogOut: () => void;
  authError: string | null;
  onOpenNavigation: () => void;
}

export function Header({ user, onLogOut, authError, onOpenNavigation }: HeaderProps) {
  return (
    <header className="mb-5 sm:mb-8">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenNavigation}
            aria-label="Open navigation"
            className="shrink-0 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white sm:text-3xl lg:text-4xl">Weekly Dungeon</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 sm:text-base">Weekly command center</p>
          </div>
        </div>
        <div className="min-w-0 sm:text-right">
          <p className="mb-2 truncate text-sm text-gray-600 dark:text-gray-400">
            Welcome, {user.isAnonymous ? 'Guest' : user.displayName || user.email}
          </p>
          <Button onClick={onLogOut} variant="outline" size="sm">
            Sign Out
          </Button>
        </div>
      </div>
      {authError && (
        <div className="mt-4 rounded border border-red-400 bg-red-100 p-3 text-sm text-red-700">
          {authError}
        </div>
      )}
    </header>
  );
}

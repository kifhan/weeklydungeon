import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Compass, Flame, History, ListChecks, MapPin, Settings, Sparkles, User as UserIcon, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Command', Icon: Compass },
  { to: '/quests', label: 'Quests', Icon: MapPin },
  { to: '/habits', label: 'Habits', Icon: BookOpen },
  { to: '/reflections', label: 'Reflections', Icon: Sparkles },
  { to: '/practice', label: 'Practice', Icon: Flame },
  { to: '/history', label: 'History', Icon: History },
  { to: '/character', label: 'Character', Icon: UserIcon },
  { to: '/walkthrough', label: 'Walkthrough', Icon: ListChecks },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

interface NavigationLinksProps {
  onNavigate?: () => void;
}

function NavigationLinks({ onNavigate }: NavigationLinksProps) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
              isActive
                ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100'
                : 'border-transparent bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
            ].join(' ')
          }
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}

export function NavigatorPanel() {
  return (
    <aside className="hidden min-w-0 lg:block lg:w-64 lg:shrink-0">
      <Card className="lg:sticky lg:top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Navigate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <NavigationLinks />
        </CardContent>
      </Card>
    </aside>
  );
}

interface MobileNavigationCabinetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavigationCabinet({ open, onClose }: MobileNavigationCabinetProps) {
  return (
    <div
      className={[
        'fixed inset-0 z-50 transition lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={[
          'absolute inset-0 bg-gray-950/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          'relative flex h-full w-[min(20rem,86vw)] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 dark:border-gray-700 dark:bg-gray-900',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <p className="text-sm font-semibold text-gray-950 dark:text-white">Weekly Dungeon</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Navigate</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <NavigationLinks onNavigate={onClose} />
        </nav>
      </aside>
    </div>
  );
}

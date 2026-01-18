import React from 'react';
import { NavLink } from 'react-router-dom';
import { MapPin, BookOpen, User as UserIcon, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/quests', label: 'Daily Quests', Icon: MapPin },
  { to: '/journal', label: 'Forest Journal', Icon: BookOpen },
  { to: '/character', label: 'Character', Icon: UserIcon },
  { to: '/life', label: 'Life Questions', Icon: Sparkles },
];

export function NavigatorPanel() {
  return (
    <aside className="w-64 shrink-0">
      <Card className="sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Navigate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  'border',
                  isActive
                    ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100'
                    : 'bg-transparent border-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
                ].join(' ')
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}


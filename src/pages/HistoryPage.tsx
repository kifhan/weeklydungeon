import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  History as HistoryIcon,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { filterHistoryItems, groupHistoryItemsByDate, historyFilters, type HistoryCategory, type HistoryFilter, type HistoryItem } from '@/weekly-dungeon/history/model';
import { useHistoryData } from '@/weekly-dungeon/history/useHistoryData';

interface HistoryPageProps {
  uid: string;
}

const categoryIcons: Record<HistoryCategory, React.ComponentType<{ className?: string }>> = {
  quests: Trophy,
  habits: CheckCircle2,
  reflections: Sparkles,
  practice: Flame,
};

function formatHistoryTime(date: Date | null) {
  if (!date) return 'No time';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getCategoryCount(items: HistoryItem[], filter: HistoryFilter) {
  if (filter === 'all') return items.length;
  return items.filter((item) => item.category === filter).length;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ uid }) => {
  const { items, loading, error } = useHistoryData(uid);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const visibleItems = useMemo(() => filterHistoryItems(items, filter), [filter, items]);
  const groups = useMemo(() => groupHistoryItemsByDate(visibleItems), [visibleItems]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{items.length} total</Badge>
              {loading && <Badge variant="outline">Syncing</Badge>}
            </div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">
              <HistoryIcon className="h-7 w-7 text-blue-600" />
              History
            </h2>
          </div>

          <div className="flex max-w-full gap-2 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
            {historyFilters.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant={filter === option.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(option.id)}
                className="min-w-24 shrink-0 gap-2"
              >
                <span>{option.label}</span>
                <span className="rounded-full bg-white/20 px-1.5 text-xs">{getCategoryCount(items, option.id)}</span>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{error.message}</CardContent>
        </Card>
      )}

      {!loading && groups.length === 0 && (
        <Card>
          <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
            <CalendarDays className="h-10 w-10 text-gray-400" />
            <div>
              <p className="font-semibold text-gray-950 dark:text-white">No history yet.</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Completed quests, habit checks, reflection answers, and practice completions will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{group.label}</h3>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="space-y-3">
              {group.items.map((item) => {
                const Icon = categoryIcons[item.category];

                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="group block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
                  >
                    <article className="grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-start">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{item.badge}</Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatHistoryTime(item.occurredAt)}
                          </span>
                        </div>
                        <h4 className="mt-2 font-semibold text-gray-950 dark:text-white">{item.title}</h4>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {item.summary}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300 sm:pt-2">
                        Open
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

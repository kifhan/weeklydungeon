import React, { useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { Header } from '@/components/Header';
import { NavigatorPanel } from '@/components/NavigatorPanel';
import { ForestVisualizer } from '@/components/ForestVisualizer';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { migrateLocalIfNeeded, getWeekKey } from '@/services/firestore';
import type { DungeonLog, HabitEntry, Tree, WeekData } from '@/types';

interface AuthenticatedLayoutProps {
  authedUser: FirebaseUser;
  onLogOut: () => void;
  authError: string | null;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ authedUser, onLogOut, authError }) => {
  // One-time migration: if Firestore is empty, push local cached data
  const [weekData] = useLocalStorage<WeekData>('dungeonMapData', {} as any);
  const [dungeonLogs] = useLocalStorage<DungeonLog[]>('dungeonLogs', []);
  const [habitEntries] = useLocalStorage<HabitEntry[]>('habitTrackerData', []);

  useEffect(() => {
    const run = async () => {
      if (!authedUser?.uid) return;
      try {
        const weekKey = getWeekKey(new Date());
        await migrateLocalIfNeeded(authedUser.uid, {
          weekKey,
          weekData: weekData && Object.keys(weekData).length > 0 ? weekData : undefined,
          habits: habitEntries?.length ? habitEntries : undefined,
          logs: dungeonLogs?.length ? dungeonLogs : undefined,
        });
      } catch (e) {
        console.warn('Local migration skipped/failed:', e);
      }
    };
    run();
  }, [authedUser?.uid, dungeonLogs, habitEntries, weekData]);

  const trees: Tree[] = useMemo(() => {
    return [
      ...(dungeonLogs || []).map(
        (log, i) =>
          ({
            id: `tree-log-${log.id}`,
            type: i % 3 === 0 ? 'pine' : i % 3 === 1 ? 'oak' : 'cherry',
            stage: 'mature',
            plantedAt: log.completedAt,
            linkedQuestId: log.blockId,
          }) as Tree
      ),
      ...(habitEntries || []).map(
        (entry) =>
          ({
            id: `tree-habit-${entry.id}`,
            type: 'shrub',
            stage: 'sprout',
            plantedAt: entry.date + 'T' + entry.time,
            linkedHabitId: entry.id,
          }) as Tree
      ),
    ].sort((a, b) => new Date(a.plantedAt).getTime() - new Date(b.plantedAt).getTime());
  }, [dungeonLogs, habitEntries]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <Header user={authedUser} onLogOut={onLogOut} authError={authError} />

        <div className="space-y-8">
          <ForestVisualizer trees={trees} />

          <div className="flex gap-6 items-start">
            <NavigatorPanel />
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

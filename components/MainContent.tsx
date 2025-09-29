import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { DungeonMap } from './DungeonMap';
import { HabitTracker } from './HabitTracker';
import { MapPin, Coffee } from 'lucide-react';
import { User } from 'firebase/auth';
import { migrateLocalIfNeeded, getWeekKey } from '../services/firestore';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { WeekData, DungeonLog, HabitEntry } from '../types';

interface MainContentProps {
  user: User;
}

export function MainContent({ user }: MainContentProps) {
  const [mainTab, setMainTab] = useState<'dungeon' | 'tracker'>('dungeon');

  // One-time migration: if Firestore is empty, push local cached data
  const [weekData] = useLocalStorage<WeekData>('dungeonMapData', {} as any);
  const [dungeonLogs] = useLocalStorage<DungeonLog[]>('dungeonLogs', []);
  const [habitEntries] = useLocalStorage<HabitEntry[]>('habitTrackerData', []);

  useEffect(() => {
    const run = async () => {
      if (!user?.uid) return;
      try {
        const weekKey = getWeekKey(new Date());
        await migrateLocalIfNeeded(user.uid, {
          weekKey,
          weekData: weekData && Object.keys(weekData).length > 0 ? weekData : undefined,
          habits: habitEntries?.length ? habitEntries : undefined,
          logs: dungeonLogs?.length ? dungeonLogs : undefined,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Local migration skipped/failed:', e);
      }
    };
    run();
    // run only once at mount for current user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'dungeon' | 'tracker')} className="mb-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dungeon" className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Weekly Dungeon Map
        </TabsTrigger>
        <TabsTrigger value="tracker" className="flex items-center gap-2">
          <Coffee className="w-4 h-4" />
          Slaking Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dungeon">
        <DungeonMap uid={user.uid} />
      </TabsContent>

      <TabsContent value="tracker">
        <HabitTracker uid={user.uid} />
      </TabsContent>
    </Tabs>
  );
}
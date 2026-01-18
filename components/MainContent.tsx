import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { DailyQuestBoard } from './DailyQuestBoard';
import { HabitTracker } from './HabitTracker';
import { ForestVisualizer } from './ForestVisualizer';
import { CharacterScreen } from './CharacterScreen';
import { MapPin, BookOpen, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';
import { migrateLocalIfNeeded, getWeekKey } from '../services/firestore';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { WeekData, DungeonLog, HabitEntry, Tree } from '../types';

interface MainContentProps {
  user: User;
}

export function MainContent({ user }: MainContentProps) {
  const [mainTab, setMainTab] = useState<'quests' | 'journal' | 'character'>('quests');

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
        console.warn('Local migration skipped/failed:', e);
      }
    };
    run();
  }, [user?.uid]);

  // Derive trees from logs and habits
  // For now, every completed quest (log) is a tree, and every habit entry is a shrub/flower.
  const trees: Tree[] = [
    ...(dungeonLogs || []).map((log, i) => ({
      id: `tree-log-${log.id}`,
      type: i % 3 === 0 ? 'pine' : i % 3 === 1 ? 'oak' : 'cherry',
      stage: 'mature',
      plantedAt: log.completedAt,
      linkedQuestId: log.blockId
    } as Tree)),
    ...(habitEntries || []).map((entry, i) => ({
      id: `tree-habit-${entry.id}`,
      type: 'shrub',
      stage: 'sprout',
      plantedAt: entry.date + 'T' + entry.time,
      linkedHabitId: entry.id
    } as Tree))
  ].sort((a, b) => new Date(a.plantedAt).getTime() - new Date(b.plantedAt).getTime());

  return (
    <div className="space-y-8">
      <ForestVisualizer trees={trees} />

      <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'quests' | 'journal' | 'character')} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quests" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Daily Quests
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Forest Journal
          </TabsTrigger>
          <TabsTrigger value="character" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Character
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quests">
          <DailyQuestBoard uid={user.uid} />
        </TabsContent>

        <TabsContent value="journal">
          <HabitTracker uid={user.uid} />
        </TabsContent>

        <TabsContent value="character">
          <CharacterScreen uid={user.uid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
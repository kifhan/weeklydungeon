
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/Tabs';
import { DungeonMap } from './components/DungeonMap';
import { HabitTracker } from './components/HabitTracker';
import { MapPin, Brain } from 'lucide-react';

export default function App() {
  const [mainTab, setMainTab] = useState<'dungeon' | 'tracker'>('dungeon');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">🗺️ Personal Management System</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">RPG-Style Scheduling & Daily Habit Tracking</p>
        </header>

        <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'dungeon' | 'tracker')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dungeon" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Weekly Dungeon Map
            </TabsTrigger>
            <TabsTrigger value="tracker" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Daily State & Habit Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dungeon">
            <DungeonMap />
          </TabsContent>

          <TabsContent value="tracker">
            <HabitTracker />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

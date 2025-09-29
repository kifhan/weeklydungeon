
import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { Button } from './components/ui/Button';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/Tabs';
import { DungeonMap } from './components/DungeonMap';
import { HabitTracker } from './components/HabitTracker';
import { MapPin, Brain } from 'lucide-react';

export default function App() {
  const [user, loading] = useAuthState(auth);

  const [mainTab, setMainTab] = useState<'dungeon' | 'tracker'>('dungeon');

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const logOut = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <h1>Welcome</h1>
        <p>Please sign in to continue.</p>
        <Button onClick={signInWithGoogle}>Sign in with Google</Button>
      </div>
    );
  }

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

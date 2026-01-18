import React from 'react';
import { HabitTracker } from '@/components/HabitTracker';

interface JournalPageProps {
  uid: string;
}

export const JournalPage: React.FC<JournalPageProps> = ({ uid }) => {
  return <HabitTracker uid={uid} />;
};

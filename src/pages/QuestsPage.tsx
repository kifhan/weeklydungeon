import React from 'react';
import { KanbanQuestBoard } from '@/components/KanbanQuestBoard';

interface QuestsPageProps {
  uid: string;
}

export const QuestsPage: React.FC<QuestsPageProps> = ({ uid }) => {
  return <KanbanQuestBoard uid={uid} />;
};

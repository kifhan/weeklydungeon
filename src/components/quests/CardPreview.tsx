import React from 'react';
import { Card as KanbanCard } from '@/services/firestore';

interface CardPreviewProps {
  card: KanbanCard;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ card }) => {
  return (
    <div className="p-3 rounded-lg border bg-white dark:bg-gray-800 border-purple-300 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-lg">{card.emoji}</span>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{card.title}</h3>
      </div>
    </div>
  );
};

import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Sparkles } from 'lucide-react';
import { Column, Card as KanbanCard } from '@/services/firestore';
import { SortableCard } from './SortableCard';

interface KanbanColumnProps {
  column: Column;
  cards: KanbanCard[];
  onToggleDone: (card: KanbanCard) => void;
  onEdit: (card: KanbanCard) => void;
  onDelete: (cardId: string) => void;
  onAddCard: () => void;
  onAIGenerate: () => void;
  loadingAI: boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  cards,
  onToggleDone,
  onEdit,
  onDelete,
  onAddCard,
  onAIGenerate,
  loadingAI,
}) => {
  const cardIds = cards.map((c) => c.id);

  return (
    <Card className="flex flex-col h-full min-h-[500px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{column.title || column.name}</CardTitle>
        <div className="flex gap-1 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCard}
            className="text-xs h-7"
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
          {column.id !== 'done' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAIGenerate}
              disabled={loadingAI}
              className="text-xs h-7"
            >
              <Sparkles className={`w-3 h-3 mr-1 ${loadingAI ? 'animate-spin' : ''}`} /> AI
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                onToggleDone={() => onToggleDone(card)}
                onEdit={() => onEdit(card)}
                onDelete={() => onDelete(card.id)}
              />
            ))}
          </div>
        </SortableContext>
        {cards.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No quests here yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

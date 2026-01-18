import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { Edit, Trash2, GripVertical } from 'lucide-react';
import { Card as KanbanCard } from '@/services/firestore';

interface SortableCardProps {
  card: KanbanCard;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const SortableCard: React.FC<SortableCardProps> = ({ card, onToggleDone, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 p-3 rounded-lg border transition-all ${
        card.done
          ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900'
          : 'bg-white border-gray-200 hover:border-purple-300 dark:bg-gray-800 dark:border-gray-700'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <Checkbox
        checked={card.done}
        onCheckedChange={onToggleDone}
        className="mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">{card.emoji}</span>
            <h3
              className={`font-semibold truncate ${
                card.done
                  ? 'line-through text-gray-500'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {card.title}
            </h3>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="w-4 h-4 text-gray-400 hover:text-purple-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
            </Button>
          </div>
        </div>
        {card.note && (
          <p
            className={`mt-1 text-xs ${
              card.done
                ? 'text-gray-400'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {card.note}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {card.blockType && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {card.blockType}
            </Badge>
          )}
          {card.energyLevel && (
            <Badge variant="outline" className="text-[10px] h-5">
              {card.energyLevel}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

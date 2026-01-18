import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { Sparkles, CheckCircle2, Wand2, BookOpen } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import {
  moveCard,
  addCardToColumn,
  deleteCard,
  updateCard,
  updateColumn,
  addDungeonLog,
} from '@/services/firestore';
import { Card as KanbanCard } from '@/services/firestore';
import { EditCardDialog } from './EditCardDialog';
import { DungeonLog } from '@/types';
import { Button } from './ui/Button';
import { KanbanColumn } from './quests/KanbanColumn';
import { CardPreview } from './quests/CardPreview';
import { useQuestsBoard } from '@/hooks/useQuestsBoard';
import { useCharacterPrompt } from '@/hooks/useCharacterPrompt';

interface KanbanQuestBoardProps {
  uid: string;
}

export const KanbanQuestBoard: React.FC<KanbanQuestBoardProps> = ({ uid }) => {
  const { columns, cards, cardsByColumn } = useQuestsBoard(uid);
  const characterPrompt = useCharacterPrompt(uid);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const cardId = active.id as string;
    const overId = over.id as string;

    // Find source column
    const sourceColumn = columns.find((col) => col.cardOrder?.includes(cardId));
    if (!sourceColumn) return;

    // Check if dropped on a column or another card
    const targetColumn = columns.find((col) => col.id === overId) || 
                        columns.find((col) => col.cardOrder?.includes(overId as string));
    
    if (!targetColumn) return;

    const sourceIndex = sourceColumn.cardOrder?.indexOf(cardId) ?? -1;
    let targetIndex = targetColumn.cardOrder?.indexOf(overId as string) ?? -1;
    
    // If dropped on column (not a card), append to end
    if (targetColumn.id === overId) {
      targetIndex = targetColumn.cardOrder?.length ?? 0;
    } else if (targetIndex === -1) {
      targetIndex = targetColumn.cardOrder?.length ?? 0;
    }

    // If same column, just reorder
    if (sourceColumn.id === targetColumn.id) {
      if (sourceIndex === targetIndex) return;
      // Reorder within same column
      const newOrder = [...(sourceColumn.cardOrder || [])];
      newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, cardId);
      // Update column order
      await updateColumn(uid, 'quests', sourceColumn.id, { cardOrder: newOrder });
    } else {
      // Move between columns
      await moveCard(uid, 'quests', cardId, sourceColumn.id, targetColumn.id, targetIndex);
    }
  };

  const handleToggleDone = async (card: KanbanCard) => {
    const currentColumn = columns.find((col) => col.cardOrder?.includes(card.id));
    if (!currentColumn) return;

    const newDone = !card.done;
    const targetColumnId = newDone ? 'done' : 'backlog';
    
    if (currentColumn.id === targetColumnId) {
      // Just update the card
      await updateCard(uid, 'quests', card.id, { done: newDone });
    } else {
      // Move to done/backlog and update
      const targetColumn = columns.find((col) => col.id === targetColumnId);
      if (targetColumn) {
        await moveCard(uid, 'quests', card.id, currentColumn.id, targetColumnId, targetColumn.cardOrder?.length ?? 0);
        await updateCard(uid, 'quests', card.id, { done: newDone });
      }
    }

    // Log completion
    if (newDone) {
      const log: DungeonLog = {
        id: `log-${Date.now()}`,
        blockId: card.id,
        blockName: card.title,
        day: currentColumn.name,
        completedAt: new Date().toISOString(),
        energyLevel: 3,
        blockType: (card.blockType as any) || 'Focus',
      };
      addDungeonLog(uid, log).catch((e) => console.error('Failed to add log:', e));
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this quest?')) return;
    
    const column = columns.find((col) => col.cardOrder?.includes(cardId));
    if (column) {
      const newOrder = (column.cardOrder || []).filter((id) => id !== cardId);
      await updateColumn(uid, 'quests', column.id, { cardOrder: newOrder });
    }
    await deleteCard(uid, 'quests', cardId);
  };

  const handleAddCard = async (columnId: string) => {
    const newCard: Omit<KanbanCard, 'id'> = {
      title: 'New Quest',
      emoji: '📜',
      note: '',
      blockType: 'Focus',
      energyLevel: 'Moderate',
      done: false,
    };
    await addCardToColumn(uid, 'quests', columnId, newCard, 'top');
  };

  const generateAICards = async (count: number = 1, targetColumn: string = 'backlog') => {
    try {
      setLoadingAI(true);
      
      const systemInstruction = characterPrompt
        ? `You are acting as a specific character. ${characterPrompt} You are a Dungeon Master for a productivity RPG.`
        : `You are a Dungeon Master for a productivity RPG.`;

      const prompt = `${systemInstruction}
      Generate ${count} quest card(s) (tasks) for a user.
      
      Return ONLY a JSON array of objects with the following fields:
      - title: string (creative quest name)
      - emoji: string (single emoji)
      - note: string (short flavor text description)
      - blockType: "Focus" | "Flow" | "Admin" | "Social" | "Rest"
      - energyLevel: "High" | "Moderate" | "Low" | "Recharge"
      
      Do not include markdown formatting or code blocks. Just the raw JSON string.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = result.text.trim().replace(/```json/g, '').replace(/```/g, '');
      let questDataArray = JSON.parse(text);

      if (!Array.isArray(questDataArray)) {
        questDataArray = [questDataArray];
      }

      for (const questData of questDataArray) {
        const newCard: Omit<KanbanCard, 'id'> = {
          title: questData.title || "Mysterious Quest",
          emoji: questData.emoji || "📜",
          note: questData.note || "A quest from the ether...",
          blockType: questData.blockType || "Focus",
          energyLevel: questData.energyLevel || "Moderate",
          done: false,
        };
        await addCardToColumn(uid, 'quests', targetColumn, newCard, 'top');
      }
    } catch (error) {
      console.error('Failed to generate AI quest:', error);
      alert('The spirits are silent... (AI generation failed)');
    } finally {
      setLoadingAI(false);
    }
  };

  const planDay = async () => {
    try {
      setLoadingAI(true);
      
      const backlogCards = cardsByColumn['backlog'] || [];
      const todayCards = cardsByColumn['today'] || [];
      const inProgressCards = cardsByColumn['in_progress'] || [];
      
      if (backlogCards.length === 0 && todayCards.length === 0 && inProgressCards.length === 0) {
        alert('No quests to plan! Add some quests first.');
        return;
      }

      const systemInstruction = characterPrompt
        ? `You are acting as a specific character. ${characterPrompt} You are a Dungeon Master for a productivity RPG.`
        : `You are a Dungeon Master for a productivity RPG.`;

      const allCards = [...backlogCards, ...todayCards, ...inProgressCards];
      const cardsDescription = allCards.map((c, i) => 
        `${i + 1}. ${c.emoji} ${c.title} (${c.blockType}, ${c.energyLevel})${c.note ? ` - ${c.note}` : ''}`
      ).join('\n');

      const prompt = `${systemInstruction}
      The user wants to plan their day. Here are available quests:
      
      ${cardsDescription}
      
      Select 3-5 quests that should be moved to "Today" and suggest an optimal order.
      Consider energy levels, block types, and logical flow.
      
      Return ONLY a JSON object with:
      - selectedIds: array of card titles (exact matches) to move to Today
      - order: array of those same titles in recommended order
      
      Do not include markdown formatting or code blocks. Just the raw JSON string.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = result.text.trim().replace(/```json/g, '').replace(/```/g, '');
      const planData = JSON.parse(text);

      const selectedTitles = planData.selectedIds || planData.order || [];
      const orderedTitles = planData.order || selectedTitles;

      // Find cards by title and move to today
      const todayColumn = columns.find((c) => c.id === 'today');
      if (!todayColumn) return;

      const cardsToMove = selectedTitles
        .map((title: string) => allCards.find((c) => c.title === title))
        .filter((c): c is KanbanCard => c !== undefined);

      // Remove from current columns and add to today
      for (const card of cardsToMove) {
        const currentColumn = columns.find((col) => col.cardOrder?.includes(card.id));
        if (currentColumn && currentColumn.id !== 'today') {
          await moveCard(uid, 'quests', card.id, currentColumn.id, 'today', todayColumn.cardOrder?.length ?? 0);
        }
      }

      // Reorder today column based on AI suggestion
      const todayCardIds = todayColumn.cardOrder || [];
      const orderedIds = orderedTitles
        .map((title: string) => cards.find((c) => c.title === title)?.id)
        .filter((id): id is string => id !== undefined);
      
      const remainingIds = todayCardIds.filter((id) => !orderedIds.includes(id));
      const newOrder = [...orderedIds, ...remainingIds];

      if (newOrder.length > 0) {
        await updateColumn(uid, 'quests', 'today', { cardOrder: newOrder });
      }

      alert(`Day planned! ${cardsToMove.length} quest(s) moved to Today.`);
    } catch (error) {
      console.error('Failed to plan day:', error);
      alert('The spirits are confused... (AI planning failed)');
    } finally {
      setLoadingAI(false);
    }
  };

  const generateReflection = async () => {
    try {
      setLoadingAI(true);
      
      const doneCards = cardsByColumn['done'] || [];
      
      // Filter cards completed today (or recently)
      const recentDone = doneCards.filter((card) => {
        // Check if card was completed recently (within last 24h)
        // Since we don't have completedAt on cards, we'll use all done cards
        return card.done;
      });

      if (recentDone.length === 0) {
        alert('No completed quests to reflect on yet!');
        return;
      }

      const systemInstruction = characterPrompt
        ? `You are acting as a specific character. ${characterPrompt} You are a Dungeon Master for a productivity RPG.`
        : `You are a Dungeon Master for a productivity RPG.`;

      const completedList = recentDone.map((c) => 
        `- ${c.emoji} ${c.title}${c.note ? `: ${c.note}` : ''}`
      ).join('\n');

      const prompt = `${systemInstruction}
      The user has completed these quests today:
      
      ${completedList}
      
      Write a brief, encouraging daily recap (2-3 sentences) celebrating their accomplishments and offering insight or motivation.
      Keep it concise and in character.
      
      Return ONLY a JSON object with:
      - summary: string (the recap text)
      
      Do not include markdown formatting or code blocks. Just the raw JSON string.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = result.text.trim().replace(/```json/g, '').replace(/```/g, '');
      const reflectionData = JSON.parse(text);

      const summary = reflectionData.summary || 'Great work today!';
      
      // Save reflection (simple approach: save to first done card's reflectionNote, or create a new doc)
      // For now, we'll save it to the most recent done card
      if (recentDone.length > 0) {
        const mostRecent = recentDone[0];
        await updateCard(uid, 'quests', mostRecent.id, { 
          reflectionNote: summary 
        });
      }

      alert(`Daily Recap:\n\n${summary}`);
    } catch (error) {
      console.error('Failed to generate reflection:', error);
      alert('The spirits are silent... (AI reflection failed)');
    } finally {
      setLoadingAI(false);
    }
  };

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-purple-600" />
            Quest Board
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Organize your quests with AI assistance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generateAICards(1, 'backlog')}
            variant="outline"
            size="sm"
            disabled={loadingAI}
            className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Summoning...' : 'AI Generate'}
          </Button>
          <Button
            onClick={planDay}
            variant="outline"
            size="sm"
            disabled={loadingAI}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20"
          >
            <Wand2 className={`w-4 h-4 mr-2 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Planning...' : 'Plan My Day'}
          </Button>
          <Button
            onClick={generateReflection}
            variant="outline"
            size="sm"
            disabled={loadingAI}
            className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
          >
            <BookOpen className={`w-4 h-4 mr-2 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Reflecting...' : 'Daily Recap'}
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cardsByColumn[column.id] || []}
              onToggleDone={handleToggleDone}
              onEdit={(card) => {
                setEditingCard(card);
                setIsEditDialogOpen(true);
              }}
              onDelete={handleDeleteCard}
              onAddCard={() => handleAddCard(column.id)}
              onAIGenerate={() => generateAICards(1, column.id)}
              loadingAI={loadingAI}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <CardPreview card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {editingCard && (
        <EditCardDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          card={editingCard}
          onSave={async (updatedCard) => {
            await updateCard(uid, 'quests', updatedCard.id, updatedCard);
            setIsEditDialogOpen(false);
            setEditingCard(null);
          }}
          onCancel={() => {
            setIsEditDialogOpen(false);
            setEditingCard(null);
          }}
        />
      )}
    </div>
  );
};

import { useState, useEffect, useMemo } from 'react';
import {
  ensureQuestsBoardExists,
  listenColumns,
  listenCards,
  migrateWeekDataToQuestsBoard,
  listenWeek,
  getWeekKey,
} from '@/services/firestore';
import { Column, Card as KanbanCard } from '@/services/firestore';

export function useQuestsBoard(uid: string) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [migrated, setMigrated] = useState(false);

  // Ensure board exists and migrate if needed
  useEffect(() => {
    if (!uid || migrated) return;
    
    const initBoard = async () => {
      try {
        await ensureQuestsBoardExists(uid);
        
        // Try to migrate from week data (migrateWeekDataToQuestsBoard checks if board has cards)
        const weekKey = getWeekKey(new Date());
        let unsubWeek: (() => void) | null = null;
        
        unsubWeek = listenWeek(uid, weekKey, async (doc) => {
          if (doc?.data) {
            await migrateWeekDataToQuestsBoard(uid, weekKey, doc.data);
          }
          setMigrated(true);
          if (unsubWeek) unsubWeek();
        });
        
        // Timeout fallback in case week doc doesn't exist
        setTimeout(() => {
          if (!migrated) {
            setMigrated(true);
            if (unsubWeek) unsubWeek();
          }
        }, 2000);
      } catch (error) {
        console.error('Failed to initialize board:', error);
        setMigrated(true); // Mark as migrated to avoid retry loops
      }
    };
    
    initBoard();
  }, [uid, migrated]);

  // Listen to columns
  useEffect(() => {
    if (!uid) return;
    const boardId = 'quests';
    const unsub = listenColumns(uid, boardId, (cols) => {
      setColumns(cols.sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    return unsub;
  }, [uid]);

  // Listen to cards
  useEffect(() => {
    if (!uid) return;
    const boardId = 'quests';
    const unsub = listenCards(uid, boardId, (cardsList) => {
      setCards(cardsList);
    });
    return unsub;
  }, [uid]);

  const cardsByColumn = useMemo(() => {
    const map: Record<string, KanbanCard[]> = {};
    columns.forEach((col) => {
      map[col.id] = [];
    });
    cards.forEach((card) => {
      // Find which column contains this card
      const column = columns.find((col) => col.cardOrder?.includes(card.id));
      if (column) {
        if (!map[column.id]) map[column.id] = [];
        map[column.id].push(card);
      }
    });
    // Sort cards by column order
    columns.forEach((col) => {
      if (map[col.id]) {
        map[col.id].sort((a, b) => {
          const aIdx = col.cardOrder?.indexOf(a.id) ?? -1;
          const bIdx = col.cardOrder?.indexOf(b.id) ?? -1;
          return aIdx - bIdx;
        });
      }
    });
    return map;
  }, [columns, cards]);

  return { columns, cards, cardsByColumn };
}

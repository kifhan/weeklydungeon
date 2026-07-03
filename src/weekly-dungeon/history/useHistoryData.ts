import { useEffect, useMemo, useState } from 'react';
import {
  listenHabitLogs,
  listenHabits,
  listenPracticeReviews,
  listenPracticeSessions,
  listenQuestHistory,
  listenReflectionAnswers,
} from '@/weekly-dungeon/data/firestore';
import type { Habit, HabitLog, Quest, ReflectionAnswer } from '@/weekly-dungeon/domain/types';
import type { PracticeReview, PracticeSession } from '@/weekly-dungeon/practice/model';
import { buildHistoryItems, type HistoryItem } from './model';

interface HistoryData {
  quests: Quest[];
  habits: Habit[];
  habitLogs: HabitLog[];
  reflectionAnswers: ReflectionAnswer[];
  practiceSessions: PracticeSession[];
  practiceReviews: PracticeReview[];
}

export interface HistoryDataState {
  items: HistoryItem[];
  loading: boolean;
  error: Error | null;
}

const emptyHistoryData: HistoryData = {
  quests: [],
  habits: [],
  habitLogs: [],
  reflectionAnswers: [],
  practiceSessions: [],
  practiceReviews: [],
};

export function useHistoryData(uid: string | null | undefined): HistoryDataState {
  const [data, setData] = useState<HistoryData>(emptyHistoryData);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setData(emptyHistoryData);
      setPending(0);
      setError(null);
      return;
    }

    setData(emptyHistoryData);
    setPending(6);
    setError(null);

    const markReady = () => setPending((count) => Math.max(0, count - 1));
    const onError = (nextError: Error) => {
      setError(nextError);
      markReady();
    };

    const unsubs = [
      listenQuestHistory(uid, (quests) => {
        setData((current) => ({ ...current, quests }));
        markReady();
      }, onError),
      listenHabits(uid, (habits) => {
        setData((current) => ({ ...current, habits }));
        markReady();
      }, onError),
      listenHabitLogs(uid, (habitLogs) => {
        setData((current) => ({ ...current, habitLogs }));
        markReady();
      }, onError),
      listenReflectionAnswers(uid, (reflectionAnswers) => {
        setData((current) => ({ ...current, reflectionAnswers }));
        markReady();
      }, onError),
      listenPracticeSessions(uid, (practiceSessions) => {
        setData((current) => ({ ...current, practiceSessions }));
        markReady();
      }, onError),
      listenPracticeReviews(uid, (practiceReviews) => {
        setData((current) => ({ ...current, practiceReviews }));
        markReady();
      }, onError),
    ];

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid]);

  const items = useMemo(() => buildHistoryItems(data), [data]);

  return useMemo(
    () => ({
      items,
      loading: pending > 0,
      error,
    }),
    [error, items, pending]
  );
}

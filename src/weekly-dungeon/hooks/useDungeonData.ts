import { useEffect, useMemo, useState } from 'react';
import {
  listenCurrentWeekQuests,
  listenDungeonProfile,
  listenHabitLogs,
  listenHabits,
  listenMemoryContexts,
  listenReflectionAnswers,
  listenReflectionDeliveries,
  listenReflections,
} from '../data/firestore';
import { emptyDungeonData, type DungeonData } from '../domain/types';

export interface DungeonDataState extends DungeonData {
  loading: boolean;
  error: Error | null;
}

export function useDungeonData(uid: string | null | undefined): DungeonDataState {
  const [data, setData] = useState<DungeonData>(emptyDungeonData);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setData(emptyDungeonData);
      setPending(0);
      setError(null);
      return;
    }

    setPending(8);
    setError(null);

    const markReady = () => setPending((count) => Math.max(0, count - 1));
    const onError = (nextError: Error) => {
      setError(nextError);
      markReady();
    };

    const unsubs = [
      listenCurrentWeekQuests(uid, (quests) => {
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
      listenReflections(uid, (reflections) => {
        setData((current) => ({ ...current, reflections }));
        markReady();
      }, onError),
      listenReflectionDeliveries(uid, (reflectionDeliveries) => {
        setData((current) => ({ ...current, reflectionDeliveries }));
        markReady();
      }, onError),
      listenReflectionAnswers(uid, (reflectionAnswers) => {
        setData((current) => ({ ...current, reflectionAnswers }));
        markReady();
      }, onError),
      listenMemoryContexts(uid, (memoryContexts) => {
        setData((current) => ({ ...current, memoryContexts }));
        markReady();
      }, onError),
      listenDungeonProfile(uid, (profile) => {
        setData((current) => ({ ...current, profile }));
        markReady();
      }, onError),
    ];

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid]);

  return useMemo(
    () => ({
      ...data,
      loading: pending > 0,
      error,
    }),
    [data, error, pending]
  );
}

import { useCallback, useMemo } from 'react';
import {
  acknowledgeReflectionDelivery,
  answerReflection,
  createHabit,
  createQuest,
  createReflection,
  cycleQuestStatus,
  deleteHabit,
  deleteQuest,
  saveDungeonProfile,
  setHabitLog,
  updateHabit,
  updateQuest,
} from '../data/firestore';
import type { DungeonProfile, Habit, HabitLog, Quest, Reflection } from '../domain/types';

function requireUid(uid: string | null | undefined) {
  if (!uid) throw new Error('Weekly Dungeon actions require an authenticated user.');
  return uid;
}

export function useDungeonActions(uid: string | null | undefined) {
  const addQuest = useCallback(
    (quest: Parameters<typeof createQuest>[1]) => createQuest(requireUid(uid), quest),
    [uid]
  );

  const patchQuest = useCallback(
    (questId: string, patch: Partial<Quest>) => updateQuest(requireUid(uid), questId, patch),
    [uid]
  );

  const advanceQuest = useCallback((quest: Quest) => cycleQuestStatus(requireUid(uid), quest), [uid]);

  const removeQuest = useCallback((questId: string) => deleteQuest(requireUid(uid), questId), [uid]);

  const addHabit = useCallback(
    (habit: Pick<Habit, 'name' | 'target'> & Partial<Habit>) => createHabit(requireUid(uid), habit),
    [uid]
  );

  const patchHabit = useCallback(
    (habitId: string, patch: Partial<Habit>) => updateHabit(requireUid(uid), habitId, patch),
    [uid]
  );

  const removeHabit = useCallback((habitId: string) => deleteHabit(requireUid(uid), habitId), [uid]);

  const checkHabit = useCallback(
    (log: Pick<HabitLog, 'habitId' | 'date' | 'checked'> & Partial<Pick<HabitLog, 'note'>>) =>
      setHabitLog(requireUid(uid), log),
    [uid]
  );

  const queueReflection = useCallback(
    (reflection: Pick<Reflection, 'question'> & Partial<Reflection>) =>
      createReflection(requireUid(uid), reflection),
    [uid]
  );

  const submitReflectionAnswer = useCallback(
    (input: Parameters<typeof answerReflection>[1]) => answerReflection(requireUid(uid), input),
    [uid]
  );

  const acknowledgeDelivery = useCallback(
    (deliveryId: string) => acknowledgeReflectionDelivery(requireUid(uid), deliveryId),
    [uid]
  );

  const updateProfile = useCallback(
    (profile: Partial<DungeonProfile>) => saveDungeonProfile(requireUid(uid), profile),
    [uid]
  );

  return useMemo(
    () => ({
      addQuest,
      patchQuest,
      advanceQuest,
      removeQuest,
      addHabit,
      patchHabit,
      removeHabit,
      checkHabit,
      queueReflection,
      submitReflectionAnswer,
      acknowledgeDelivery,
      updateProfile,
    }),
    [
      acknowledgeDelivery,
      addHabit,
      addQuest,
      advanceQuest,
      checkHabit,
      patchHabit,
      patchQuest,
      queueReflection,
      removeHabit,
      removeQuest,
      submitReflectionAnswer,
      updateProfile,
    ]
  );
}

import { useCallback, useMemo } from 'react';
import {
  savePracticeReview,
  savePracticeSession,
  savePracticeSettings,
} from '@/weekly-dungeon/data/firestore';
import {
  formatPracticeDateKey,
  getPracticeDayTheme,
  getPracticeProgramPosition,
  getPracticeReviewId,
  getPracticeSessionId,
  getSessionStatus,
  PRACTICE_PROGRAM,
  type PracticeReview,
  type PracticeSession,
  type PracticeSettings,
} from '@/weekly-dungeon/practice/model';

function requireUid(uid: string | null | undefined) {
  if (!uid) throw new Error('Practice actions require an authenticated user.');
  return uid;
}

export function buildPracticeSession(
  input: Omit<PracticeSession, 'status'> & { status?: PracticeSession['status'] }
): PracticeSession {
  return {
    ...input,
    completedBlockIds: input.completedBlockIds,
    evidenceLinks: input.evidenceLinks,
    status: input.status || getSessionStatus(input.completedBlockIds),
  };
}

export function usePracticeActions(uid: string | null | undefined) {
  const startProgram = useCallback(
    (dateKey = formatPracticeDateKey()) => {
      const settings: PracticeSettings = {
        activeProgramId: PRACTICE_PROGRAM.id,
        startDate: dateKey,
      };
      return savePracticeSettings(requireUid(uid), settings);
    },
    [uid]
  );

  const saveSession = useCallback(
    (session: PracticeSession) => savePracticeSession(requireUid(uid), buildPracticeSession(session)),
    [uid]
  );

  const saveReview = useCallback(
    (review: PracticeReview) => savePracticeReview(requireUid(uid), review),
    [uid]
  );

  const createSessionForDate = useCallback((startDate: string, completedBlockIds: string[] = []): PracticeSession => {
    const position = getPracticeProgramPosition(startDate);
    const programId = PRACTICE_PROGRAM.id;
    return buildPracticeSession({
      id: getPracticeSessionId(programId, position.date),
      programId,
      date: position.date,
      weekNumber: position.weekNumber,
      dayTheme: position.dayTheme,
      completedBlockIds,
      notes: '',
      evidenceLinks: [],
    });
  }, []);

  const createReviewForWeek = useCallback((weekNumber: number): PracticeReview => {
    const programId = PRACTICE_PROGRAM.id;
    return {
      id: getPracticeReviewId(programId, weekNumber),
      programId,
      weekNumber,
      uglyCode: '',
      whyUgly: '',
      pattern: '',
      preventionRule: '',
      nextWeekFocus: '',
      status: 'not-started',
    };
  }, []);

  const createSessionForProgramDay = useCallback(
    (startDate: string, dateKey: string, completedBlockIds: string[] = []): PracticeSession => {
      const position = getPracticeProgramPosition(startDate, new Date(`${dateKey}T12:00:00`));
      const programId = PRACTICE_PROGRAM.id;
      return buildPracticeSession({
        id: getPracticeSessionId(programId, dateKey),
        programId,
        date: dateKey,
        weekNumber: position.weekNumber,
        dayTheme: getPracticeDayTheme(position.dayIndex),
        completedBlockIds,
        notes: '',
        evidenceLinks: [],
      });
    },
    []
  );

  return useMemo(
    () => ({
      startProgram,
      saveSession,
      saveReview,
      createSessionForDate,
      createSessionForProgramDay,
      createReviewForWeek,
    }),
    [createReviewForWeek, createSessionForDate, createSessionForProgramDay, saveReview, saveSession, startProgram]
  );
}

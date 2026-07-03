import { useEffect, useMemo, useState } from 'react';
import {
  listenPracticeReview,
  listenPracticeSession,
  listenPracticeSettings,
} from '@/weekly-dungeon/data/firestore';
import {
  getPracticeProgramPosition,
  getPracticeReviewId,
  getPracticeSessionId,
  PRACTICE_PROGRAM,
  type PracticeProgramPosition,
  type PracticeReview,
  type PracticeSession,
  type PracticeSettings,
} from '@/weekly-dungeon/practice/model';

export interface PracticeDataState {
  settings: PracticeSettings | null;
  todaySession: PracticeSession | null;
  currentReview: PracticeReview | null;
  position: PracticeProgramPosition | null;
  loading: boolean;
  error: Error | null;
}

export function usePracticeData(uid: string | null | undefined): PracticeDataState {
  const [settings, setSettings] = useState<PracticeSettings | null>(null);
  const [todaySession, setTodaySession] = useState<PracticeSession | null>(null);
  const [currentReview, setCurrentReview] = useState<PracticeReview | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setSettings(null);
      setTodaySession(null);
      setCurrentReview(null);
      setLoadingSettings(false);
      setLoadingSession(false);
      setLoadingReview(false);
      setError(null);
      return;
    }

    setLoadingSettings(true);
    setError(null);

    return listenPracticeSettings(
      uid,
      (nextSettings) => {
        setSettings(nextSettings);
        setLoadingSettings(false);
      },
      (nextError) => {
        setError(nextError);
        setLoadingSettings(false);
      }
    );
  }, [uid]);

  const position = useMemo(
    () => (settings?.startDate ? getPracticeProgramPosition(settings.startDate) : null),
    [settings?.startDate]
  );

  useEffect(() => {
    if (!uid || !settings || !position) {
      setTodaySession(null);
      setCurrentReview(null);
      setLoadingSession(false);
      setLoadingReview(false);
      return;
    }

    const sessionId = getPracticeSessionId(settings.activeProgramId || PRACTICE_PROGRAM.id, position.date);
    const reviewId = getPracticeReviewId(settings.activeProgramId || PRACTICE_PROGRAM.id, position.weekNumber);

    setLoadingSession(true);
    setLoadingReview(true);
    setError(null);

    const unsubscribeSession = listenPracticeSession(
      uid,
      sessionId,
      (session) => {
        setTodaySession(session);
        setLoadingSession(false);
      },
      (nextError) => {
        setError(nextError);
        setLoadingSession(false);
      }
    );
    const unsubscribeReview = listenPracticeReview(
      uid,
      reviewId,
      (review) => {
        setCurrentReview(review);
        setLoadingReview(false);
      },
      (nextError) => {
        setError(nextError);
        setLoadingReview(false);
      }
    );

    return () => {
      unsubscribeSession();
      unsubscribeReview();
    };
  }, [uid, settings, position]);

  return useMemo(
    () => ({
      settings,
      todaySession,
      currentReview,
      position,
      loading: loadingSettings || loadingSession || loadingReview,
      error,
    }),
    [currentReview, error, loadingReview, loadingSession, loadingSettings, position, settings, todaySession]
  );
}

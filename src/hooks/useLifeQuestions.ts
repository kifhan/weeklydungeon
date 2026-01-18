import { useState, useEffect, useMemo } from 'react';
import {
  Answer,
  Delivery,
  LifeQuestionSettings,
  MetaQuestion,
  Question,
  QuestionContext,
  QuestionReservation,
} from '@/types';
import {
  listenAnswers,
  listenDeliveries,
  listenLifeQuestionSettings,
  listenMetaQuestions,
  listenQuestionContexts,
  listenQuestionReservations,
  listenQuestions,
} from '@/services/firestore';

export function useLifeQuestions(uid: string) {
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [metaQuestions, setMetaQuestions] = useState<MetaQuestion[]>([]);
  const [reservations, setReservations] = useState<QuestionReservation[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [contexts, setContexts] = useState<QuestionContext[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [settings, setSettings] = useState<LifeQuestionSettings>({ timezone: defaultTimezone });

  useEffect(() => {
    if (!uid) return;
    const unsubQuestions = listenQuestions(uid, setQuestions);
    const unsubMeta = listenMetaQuestions(uid, setMetaQuestions);
    const unsubReservations = listenQuestionReservations(uid, setReservations);
    const unsubDeliveries = listenDeliveries(uid, setDeliveries);
    const unsubAnswers = listenAnswers(uid, setAnswers);
    const unsubContexts = listenQuestionContexts(uid, setContexts);
    const unsubSettings = listenLifeQuestionSettings(uid, (data) => {
      if (data?.timezone) {
        setSettings(data);
      } else {
        setSettings({ timezone: defaultTimezone });
      }
    });

    // Check notification permission
    if ('Notification' in window) {
      setNotificationEnabled(Notification.permission === 'granted');
    }

    return () => {
      unsubQuestions();
      unsubMeta();
      unsubReservations();
      unsubDeliveries();
      unsubAnswers();
      unsubContexts();
      unsubSettings();
    };
  }, [uid, defaultTimezone]);

  const questionLookup = useMemo(() => {
    return new Map(questions.map((q) => [q.id, q]));
  }, [questions]);

  const metaLookup = useMemo(() => {
    return new Map(metaQuestions.map((q) => [q.id, q]));
  }, [metaQuestions]);

  const pendingDeliveries = useMemo(() => {
    return deliveries
      .filter((delivery) => delivery.status === 'SENT' && !answers.find((a) => a.deliveryId === delivery.id))
      .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());
  }, [deliveries, answers]);

  const upcomingReservations = useMemo(() => {
    const now = Date.now();
    return reservations
      .filter((res) => !res.isProcessed && res.nextRunAt)
      .filter((res) => {
        const nextRun = res.nextRunAt?.toMillis?.() || new Date(res.nextRunAt as any).getTime();
        return nextRun > now;
      })
      .sort((a, b) => {
        const aTime = a.nextRunAt?.toMillis?.() || new Date(a.nextRunAt as any).getTime();
        const bTime = b.nextRunAt?.toMillis?.() || new Date(b.nextRunAt as any).getTime();
        return aTime - bTime;
      })
      .slice(0, 10);
  }, [reservations]);

  return {
    questions,
    metaQuestions,
    reservations,
    deliveries,
    answers,
    contexts,
    settings,
    notificationEnabled,
    questionLookup,
    metaLookup,
    pendingDeliveries,
    upcomingReservations,
  };
}

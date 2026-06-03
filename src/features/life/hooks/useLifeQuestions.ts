import { useEffect, useMemo, useState } from "react";
import type {
  Answer,
  Delivery,
  LifeQuestionSettings,
  MetaQuestion,
  Question,
  QuestionContext,
  QuestionReservation,
} from "../types";
import {
  listenAnswers,
  listenDeliveries,
  listenLifeQuestionSettings,
  listenMetaQuestions,
  listenQuestionContexts,
  listenQuestionReservations,
  listenQuestions,
} from "../api";

export function useLifeQuestions(uid: string) {
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [metaQuestions, setMetaQuestions] = useState<MetaQuestion[]>([]);
  const [reservations, setReservations] = useState<QuestionReservation[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [contexts, setContexts] = useState<QuestionContext[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [settings, setSettings] = useState<LifeQuestionSettings>({
    timezone: defaultTimezone,
    notificationChannel: null,
    updatedAt: null,
  });

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubQuestions = listenQuestions(uid, setQuestions);
    const unsubMetaQuestions = listenMetaQuestions(uid, setMetaQuestions);
    const unsubReservations = listenQuestionReservations(uid, setReservations);
    const unsubDeliveries = listenDeliveries(uid, setDeliveries);
    const unsubAnswers = listenAnswers(uid, setAnswers);
    const unsubContexts = listenQuestionContexts(uid, setContexts);
    const unsubSettings = listenLifeQuestionSettings(uid, (data) => {
      setSettings(data || {
        timezone: defaultTimezone,
        notificationChannel: null,
        updatedAt: null,
      });
    });

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationEnabled(Notification.permission === "granted");
    }

    return () => {
      unsubQuestions();
      unsubMetaQuestions();
      unsubReservations();
      unsubDeliveries();
      unsubAnswers();
      unsubContexts();
      unsubSettings();
    };
  }, [uid, defaultTimezone]);

  const questionLookup = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );
  const metaLookup = useMemo(
    () => new Map(metaQuestions.map((metaQuestion) => [metaQuestion.id, metaQuestion])),
    [metaQuestions],
  );

  const pendingDeliveries = useMemo(() => (
    deliveries
      .filter((delivery) => delivery.status === "SENT" && !answers.some((answer) => answer.deliveryId === delivery.id))
      .sort((left, right) => new Date(right.scheduledFor).getTime() - new Date(left.scheduledFor).getTime())
  ), [answers, deliveries]);

  const upcomingReservations = useMemo(() => {
    const now = Date.now();
    return reservations
      .filter((reservation) => !reservation.isProcessed && Boolean(reservation.nextRunAt))
      .filter((reservation) => {
        const nextRun = reservation.nextRunAt ? new Date(reservation.nextRunAt).getTime() : NaN;
        return !Number.isNaN(nextRun) && nextRun > now;
      })
      .sort((left, right) => {
        const leftTime = left.nextRunAt ? new Date(left.nextRunAt).getTime() : 0;
        const rightTime = right.nextRunAt ? new Date(right.nextRunAt).getTime() : 0;
        return leftTime - rightTime;
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

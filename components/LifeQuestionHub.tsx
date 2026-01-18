import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Badge } from './ui/Badge';
import { Label } from './ui/Label';
import { Sparkles, Clock, Inbox, BookOpen, Settings, Calendar, Trash2, Bell } from 'lucide-react';
import {
  Answer,
  Delivery,
  LifeQuestionSettings,
  MetaQuestion,
  Question,
  QuestionContext,
  QuestionReservation,
  QuestionStatus,
  ReservationType,
} from '../types';
import {
  addAnswer,
  addMetaQuestion,
  addQuestion,
  addQuestionReservation,
  deleteMetaQuestion,
  deleteQuestion,
  deleteQuestionReservation,
  listenAnswers,
  listenDeliveries,
  listenLifeQuestionSettings,
  listenMetaQuestions,
  listenQuestionContexts,
  listenQuestionReservations,
  listenQuestions,
  saveLifeQuestionSettings,
  updateDelivery,
  updateMetaQuestion,
  updateQuestion,
  updateQuestionReservation,
} from '../services/firestore';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { requestNotificationPermission } from '../services/fcm';

interface LifeQuestionHubProps {
  uid: string;
}

type ScheduleTargetKind = 'question' | 'meta';

const QUESTION_STATUSES: QuestionStatus[] = ['DRAFT', 'PUBLISH', 'DONE', 'ARCHIVE'];
const META_STATUSES: MetaQuestion['status'][] = ['DRAFT', 'PUBLISH', 'ARCHIVE'];
const RESERVATION_TYPES: ReservationType[] = ['FIXED', 'RECURRING', 'AI_GENERATED'];

const roundToFiveMinutes = (date: Date) => {
  const step = 5 * 60 * 1000;
  return new Date(Math.round(date.getTime() / step) * step);
};

const formatLocalDateTime = (iso?: string | null) => {
  if (!iso) return 'No time';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
};

const generateRandomSlots = (start: Date, end: Date, count: number) => {
  if (count <= 0) return [] as string[];
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (endMs <= startMs) return [] as string[];

  const slots = new Set<number>();
  const attempts = Math.max(20, count * 10);
  for (let i = 0; i < attempts && slots.size < count; i += 1) {
    const rand = startMs + Math.random() * (endMs - startMs);
    const rounded = roundToFiveMinutes(new Date(rand)).getTime();
    slots.add(Math.min(Math.max(rounded, startMs), endMs));
  }

  if (slots.size < count) {
    const step = (endMs - startMs) / count;
    for (let i = 0; i < count && slots.size < count; i += 1) {
      const ms = startMs + step * (i + 0.5);
      const rounded = roundToFiveMinutes(new Date(ms)).getTime();
      slots.add(Math.min(Math.max(rounded, startMs), endMs));
    }
  }

  return Array.from(slots)
    .sort((a, b) => a - b)
    .slice(0, count)
    .map((ms) => new Date(ms).toISOString());
};

export const LifeQuestionHub: React.FC<LifeQuestionHubProps> = ({ uid }) => {
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [activeTab, setActiveTab] = useState('questions');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [metaQuestions, setMetaQuestions] = useState<MetaQuestion[]>([]);
  const [reservations, setReservations] = useState<QuestionReservation[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [contexts, setContexts] = useState<QuestionContext[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  const [settings, setSettings] = useState<LifeQuestionSettings>({ timezone: defaultTimezone });
  const [settingsDraft, setSettingsDraft] = useState(defaultTimezone);

  const [questionContent, setQuestionContent] = useState('');
  const [questionStatus, setQuestionStatus] = useState<QuestionStatus>('DRAFT');

  const [metaPrompt, setMetaPrompt] = useState('');
  const [metaTags, setMetaTags] = useState('');
  const [metaStatus, setMetaStatus] = useState<MetaQuestion['status']>('DRAFT');

  const [scheduleTargetKind, setScheduleTargetKind] = useState<ScheduleTargetKind>('question');
  const [scheduleTargetId, setScheduleTargetId] = useState('');
  const [scheduleType, setScheduleType] = useState<ReservationType>('FIXED');
  const [fixedDateTime, setFixedDateTime] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSlots, setAiSlots] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerBusy, setAnswerBusy] = useState<Record<string, boolean>>({});

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
        setSettingsDraft(data.timezone);
      } else {
        setSettings({ timezone: defaultTimezone });
        setSettingsDraft(defaultTimezone);
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

  const handleCreateQuestion = async () => {
    if (!questionContent.trim()) return;
    const question: Question = {
      id: `q-${crypto.randomUUID()}`,
      content: questionContent.trim(),
      status: questionStatus,
    };
    await addQuestion(uid, question);
    setQuestionContent('');
    setQuestionStatus('DRAFT');
  };

  const handleCreateMetaQuestion = async () => {
    if (!metaPrompt.trim()) return;
    const tags = metaTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const metaQuestion: MetaQuestion = {
      id: `mq-${crypto.randomUUID()}`,
      basePrompt: metaPrompt.trim(),
      topicTags: tags,
      status: metaStatus,
    };
    await addMetaQuestion(uid, metaQuestion);
    setMetaPrompt('');
    setMetaTags('');
    setMetaStatus('DRAFT');
  };

  const resetScheduleForm = () => {
    setScheduleTargetKind('question');
    setScheduleTargetId('');
    setScheduleType('FIXED');
    setFixedDateTime('');
    setCronExpression('');
    setAiPrompt('');
    setAiSlots([]);
    setScheduleError(null);
  };

  const handleCreateSchedule = async () => {
    setScheduleError(null);
    if (!scheduleTargetId) {
      setScheduleError('Select a question or meta question.');
      return;
    }
    if (scheduleType === 'FIXED') {
      if (!fixedDateTime) {
        setScheduleError('Pick a date and time.');
        return;
      }
      const targetTime = new Date(fixedDateTime).toISOString();
      const reservation: QuestionReservation = {
        id: `res-${crypto.randomUUID()}`,
        type: 'FIXED',
        targetTime,
        nextRunAt: null as any, // Will be set by scheduler
        questionId: scheduleTargetKind === 'question' ? scheduleTargetId : null,
        metaQuestionId: scheduleTargetKind === 'meta' ? scheduleTargetId : null,
        isProcessed: false,
        timezone: settings.timezone,
      };
      // Set nextRunAt to targetTime for immediate scheduling
      const targetDate = new Date(fixedDateTime);
      reservation.nextRunAt = targetDate as any;
      await addQuestionReservation(uid, reservation);
      resetScheduleForm();
      return;
    }

    if (scheduleType === 'RECURRING') {
      if (!cronExpression.trim()) {
        setScheduleError('Enter a cron expression.');
        return;
      }
      // Compute initial nextRunAt (simplified - scheduler will handle properly)
      const now = new Date();
      const reservation: QuestionReservation = {
        id: `res-${crypto.randomUUID()}`,
        type: 'RECURRING',
        cronExpression: cronExpression.trim(),
        nextRunAt: now as any, // Scheduler will compute properly
        questionId: scheduleTargetKind === 'question' ? scheduleTargetId : null,
        metaQuestionId: scheduleTargetKind === 'meta' ? scheduleTargetId : null,
        isProcessed: false,
        timezone: settings.timezone,
      };
      await addQuestionReservation(uid, reservation);
      resetScheduleForm();
      return;
    }

    if (!aiSlots.length) {
      setScheduleError('Generate slots first.');
      return;
    }
    // Use callable to confirm schedule
    try {
      const confirmSchedule = httpsCallable(functions, 'confirmGeneratedSchedule');
      const reservationBase = {
        questionId: scheduleTargetKind === 'question' ? scheduleTargetId : null,
        metaQuestionId: scheduleTargetKind === 'meta' ? scheduleTargetId : null,
        aiSchedulePrompt: aiPrompt.trim(),
      };
      await confirmSchedule({ uid, reservationBase, slots: aiSlots });
      resetScheduleForm();
    } catch (error: any) {
      setScheduleError(error?.message || 'Failed to create schedule.');
    }
  };

  const parseAiSchedulePrompt = async () => {
    if (!aiPrompt.trim()) {
      setScheduleError('Enter an AI schedule prompt.');
      return;
    }
    try {
      setAiLoading(true);
      setScheduleError(null);
      const parseSchedule = httpsCallable(functions, 'parseSchedulePrompt');
      const result = await parseSchedule({ uid, prompt: aiPrompt.trim(), timezone: settings.timezone });
      const data = result.data as { slots: string[]; start_iso: string; end_iso: string; count: number };
      if (!data?.slots || data.slots.length === 0) {
        throw new Error('No slots generated for the given range.');
      }
      setAiSlots(data.slots);
    } catch (error: any) {
      setScheduleError(error?.message || 'Failed to parse schedule prompt.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitAnswer = async (delivery: Delivery) => {
    const draft = answerDrafts[delivery.id];
    if (!draft?.trim()) return;
    setAnswerBusy((prev) => ({ ...prev, [delivery.id]: true }));
    try {
      const answer: Answer = {
        id: `ans-${crypto.randomUUID()}`,
        deliveryId: delivery.id,
        reservationId: delivery.reservationId,
        sourceQuestionText: delivery.questionText,
        answerContent: draft.trim(),
        answeredAt: new Date().toISOString(),
      };
      await addAnswer(uid, answer);
      await updateDelivery(uid, delivery.id, { status: 'ACKED' });

      setAnswerDrafts((prev) => ({ ...prev, [delivery.id]: '' }));
    } finally {
      setAnswerBusy((prev) => ({ ...prev, [delivery.id]: false }));
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setNotificationEnabled(true);
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft.trim()) return;
    const updated = { ...settings, timezone: settingsDraft.trim() };
    await saveLifeQuestionSettings(uid, updated);
  };

  return (
    <Card className="border-2 border-blue-100 dark:border-blue-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          Life Question Bot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="meta">Meta</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>New Question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Write a question you want to receive later..."
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                />
                <div className="flex flex-wrap gap-3 items-center">
                  <Select value={questionStatus} onValueChange={(value) => setQuestionStatus(value as QuestionStatus)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateQuestion} disabled={!questionContent.trim()}>
                    Save Question
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Question List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions.length === 0 && <p className="text-sm text-gray-500">No questions yet.</p>}
                {questions.map((question) => (
                  <div key={question.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-800 dark:text-gray-100">{question.content}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQuestion(uid, question.id)}
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{question.status}</Badge>
                      <Select
                        value={question.status}
                        onValueChange={(value) => updateQuestion(uid, question.id, { status: value as QuestionStatus })}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meta" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>New Meta Question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe how the AI should generate questions..."
                  value={metaPrompt}
                  onChange={(e) => setMetaPrompt(e.target.value)}
                />
                <Input
                  placeholder="Topic tags (comma separated)"
                  value={metaTags}
                  onChange={(e) => setMetaTags(e.target.value)}
                />
                <div className="flex flex-wrap gap-3 items-center">
                  <Select value={metaStatus} onValueChange={(value) => setMetaStatus(value as MetaQuestion['status'])}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {META_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateMetaQuestion} disabled={!metaPrompt.trim()}>
                    Save Meta Question
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meta Question List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metaQuestions.length === 0 && <p className="text-sm text-gray-500">No meta questions yet.</p>}
                {metaQuestions.map((meta) => (
                  <div key={meta.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-800 dark:text-gray-100">{meta.basePrompt}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMetaQuestion(uid, meta.id)}
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {meta.topicTags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{meta.status}</Badge>
                      <Select
                        value={meta.status}
                        onValueChange={(value) => updateMetaQuestion(uid, meta.id, { status: value as MetaQuestion['status'] })}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {META_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Type</Label>
                    <Select
                      value={scheduleTargetKind}
                      onValueChange={(value) => {
                        setScheduleTargetKind(value as ScheduleTargetKind);
                        setScheduleTargetId('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Target type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="meta">Meta Question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Item</Label>
                    <Select value={scheduleTargetId} onValueChange={setScheduleTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        {(scheduleTargetKind === 'question' ? questions : metaQuestions)
                          .filter((item) => item.status === 'PUBLISH')
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {scheduleTargetKind === 'question'
                                ? (item as Question).content.slice(0, 40)
                                : (item as MetaQuestion).basePrompt.slice(0, 40)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Schedule Type</Label>
                    <Select value={scheduleType} onValueChange={(value) => setScheduleType(value as ReservationType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Schedule type" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESERVATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {scheduleType === 'FIXED' && (
                    <div className="space-y-2">
                      <Label>Target Time</Label>
                      <Input
                        type="datetime-local"
                        value={fixedDateTime}
                        onChange={(e) => setFixedDateTime(e.target.value)}
                      />
                    </div>
                  )}
                  {scheduleType === 'RECURRING' && (
                    <div className="space-y-2">
                      <Label>Cron Expression</Label>
                      <Input
                        placeholder="0 9 * * 1"
                        value={cronExpression}
                        onChange={(e) => setCronExpression(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {scheduleType === 'AI_GENERATED' && (
                  <div className="space-y-3">
                    <Label>AI Schedule Prompt</Label>
                    <Textarea
                      placeholder="Example: This week on weekdays, ask me 3 random times between 09:00 and 18:00."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={parseAiSchedulePrompt} disabled={aiLoading}>
                        <Sparkles className={`w-4 h-4 mr-2 ${aiLoading ? 'animate-spin' : ''}`} />
                        {aiLoading ? 'Parsing...' : 'Generate Slots'}
                      </Button>
                      {aiSlots.length > 0 && (
                        <Badge variant="secondary">{aiSlots.length} slots generated</Badge>
                      )}
                    </div>
                    {aiSlots.length > 0 && (
                      <div className="rounded-lg border p-3 space-y-2 text-sm">
                        {aiSlots.map((slot) => (
                          <div key={slot} className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            {formatLocalDateTime(slot)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {scheduleError && <p className="text-sm text-red-500">{scheduleError}</p>}
                <Button onClick={handleCreateSchedule}>Save Schedule</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Reservations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reservations.length === 0 && <p className="text-sm text-gray-500">No reservations yet.</p>}
                {reservations.map((res) => {
                  const targetQuestion = res.questionId ? questionLookup.get(res.questionId) : null;
                  const targetMeta = res.metaQuestionId ? metaLookup.get(res.metaQuestionId) : null;
                  return (
                    <div key={res.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {targetQuestion?.content || targetMeta?.basePrompt || 'Unknown target'}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                            <Badge variant="outline">{res.type}</Badge>
                            {res.targetTime && <span><Calendar className="inline w-3 h-3 mr-1" />{formatLocalDateTime(res.targetTime)}</span>}
                            {res.cronExpression && <span>cron: {res.cronExpression}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuestionReservation(uid, res.id)}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </Button>
                      </div>
                      {res.aiSchedulePrompt && (
                        <p className="text-xs text-gray-500">AI Prompt: {res.aiSchedulePrompt}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inbox" className="mt-6 space-y-6">
            {!notificationEnabled && (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Push Notifications</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Get notified when questions are sent to you
                      </p>
                    </div>
                    <Button onClick={handleEnableNotifications} variant="outline">
                      <Bell className="w-4 h-4 mr-2" />
                      Enable
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-blue-500" />
                  Pending Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingDeliveries.length === 0 && (
                  <p className="text-sm text-gray-500">No pending questions. You're all caught up.</p>
                )}
                {pendingDeliveries.map((delivery) => (
                  <div key={delivery.id} className="rounded-lg border p-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{delivery.questionText}</p>
                      <p className="text-xs text-gray-500">Sent: {formatLocalDateTime(delivery.scheduledFor)}</p>
                    </div>
                    <Textarea
                      placeholder="Write your answer..."
                      value={answerDrafts[delivery.id] || ''}
                      onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [delivery.id]: e.target.value }))}
                    />
                    <Button
                      onClick={() => handleSubmitAnswer(delivery)}
                      disabled={answerBusy[delivery.id] || !(answerDrafts[delivery.id] || '').trim()}
                    >
                      {answerBusy[delivery.id] ? 'Saving...' : 'Submit Answer'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingReservations.length === 0 && <p className="text-sm text-gray-500">No upcoming reservations.</p>}
                {upcomingReservations.map((res) => {
                  const question = res.questionId ? questionLookup.get(res.questionId) : null;
                  const meta = res.metaQuestionId ? metaLookup.get(res.metaQuestionId) : null;
                  const nextRun = res.nextRunAt?.toMillis?.() 
                    ? new Date(res.nextRunAt.toMillis()).toISOString()
                    : res.targetTime || '';
                  return (
                    <div key={res.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm">{question?.content || meta?.basePrompt || 'Question'}</p>
                        <p className="text-xs text-gray-500">{formatLocalDateTime(nextRun)}</p>
                      </div>
                      <Badge variant="outline">{res.type}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Answer History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {answers.length === 0 && <p className="text-sm text-gray-500">No answers yet.</p>}
                {answers.map((answer) => (
                  <div key={answer.id} className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{answer.sourceQuestionText}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{answer.answerContent}</p>
                    <p className="text-xs text-gray-500">Answered: {formatLocalDateTime(answer.answeredAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-500" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={settingsDraft}
                    onChange={(e) => setSettingsDraft(e.target.value)}
                    placeholder="Asia/Seoul"
                  />
                  <p className="text-xs text-gray-500">
                    Current: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Notifications</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {notificationEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {!notificationEnabled && (
                      <Button onClick={handleEnableNotifications} variant="outline" size="sm">
                        <Bell className="w-4 h-4 mr-2" />
                        Enable
                      </Button>
                    )}
                  </div>
                </div>
                <Button onClick={handleSaveSettings}>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

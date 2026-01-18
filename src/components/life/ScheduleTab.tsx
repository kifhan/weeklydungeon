import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Sparkles, Clock, Calendar, Trash2 } from 'lucide-react';
import { Question, MetaQuestion, QuestionReservation, ReservationType } from '@/types';
import {
  addQuestionReservation,
  deleteQuestionReservation,
} from '@/services/firestore';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';

type ScheduleTargetKind = 'question' | 'meta';
const RESERVATION_TYPES: ReservationType[] = ['FIXED', 'RECURRING', 'AI_GENERATED'];

const formatLocalDateTime = (iso?: string | null) => {
  if (!iso) return 'No time';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
};

interface ScheduleTabProps {
  uid: string;
  questions: Question[];
  metaQuestions: MetaQuestion[];
  reservations: QuestionReservation[];
  questionLookup: Map<string, Question>;
  metaLookup: Map<string, MetaQuestion>;
  settings: { timezone: string };
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  uid,
  questions,
  metaQuestions,
  reservations,
  questionLookup,
  metaLookup,
  settings,
}) => {
  const [scheduleTargetKind, setScheduleTargetKind] = useState<ScheduleTargetKind>('question');
  const [scheduleTargetId, setScheduleTargetId] = useState('');
  const [scheduleType, setScheduleType] = useState<ReservationType>('FIXED');
  const [fixedDateTime, setFixedDateTime] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSlots, setAiSlots] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

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
        nextRunAt: null as any,
        questionId: scheduleTargetKind === 'question' ? scheduleTargetId : null,
        metaQuestionId: scheduleTargetKind === 'meta' ? scheduleTargetId : null,
        isProcessed: false,
        timezone: settings.timezone,
      };
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
      const now = new Date();
      const reservation: QuestionReservation = {
        id: `res-${crypto.randomUUID()}`,
        type: 'RECURRING',
        cronExpression: cronExpression.trim(),
        nextRunAt: now as any,
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

  return (
    <>
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
    </>
  );
};

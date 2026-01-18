import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { Inbox, Clock, Bell, ExternalLink } from 'lucide-react';
import { Delivery, QuestionReservation, Question, MetaQuestion } from '@/types';
import { addAnswer, addDelivery, updateDelivery } from '@/services/firestore';
import { requestNotificationPermission } from '@/services/fcm';

interface InboxTabProps {
  uid: string;
  pendingDeliveries: Delivery[];
  upcomingReservations: QuestionReservation[];
  questionLookup: Map<string, Question>;
  metaLookup: Map<string, MetaQuestion>;
  notificationEnabled: boolean;
  onNotificationEnabledChange: (enabled: boolean) => void;
  questions: Question[];
}

const formatLocalDateTime = (iso?: string | null) => {
  if (!iso) return 'No time';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
};

export const InboxTab: React.FC<InboxTabProps> = ({
  uid,
  pendingDeliveries,
  upcomingReservations,
  questionLookup,
  metaLookup,
  notificationEnabled,
  onNotificationEnabledChange,
  questions,
}) => {
  const navigate = useNavigate();
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerBusy, setAnswerBusy] = useState<Record<string, boolean>>({});

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        onNotificationEnabledChange(true);
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  };

  const handleSubmitAnswer = async (delivery: Delivery) => {
    const draft = answerDrafts[delivery.id];
    if (!draft?.trim()) return;
    setAnswerBusy((prev) => ({ ...prev, [delivery.id]: true }));
    try {
      const answer = {
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

  const handleCreatePendingDelivery = async () => {
    const sourceQuestion = questions.find((q) => q.status === 'PUBLISH') || questions[0];
    const questionText = sourceQuestion?.content || 'New question';
    const nowIso = new Date().toISOString();
    const delivery: Delivery = {
      id: `manual-delivery-${crypto.randomUUID()}`,
      reservationId: sourceQuestion ? `manual-${sourceQuestion.id}` : `manual-${Date.now()}`,
      questionText,
      channel: 'IN_APP',
      status: 'SENT',
      scheduledFor: nowIso,
    };
    await addDelivery(uid, delivery);
  };

  return (
    <>
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
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-blue-500" />
            Pending Questions
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleCreatePendingDelivery}>
            Create Pending
          </Button>
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
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSubmitAnswer(delivery)}
                  disabled={answerBusy[delivery.id] || !(answerDrafts[delivery.id] || '').trim()}
                >
                  {answerBusy[delivery.id] ? 'Saving...' : 'Submit Answer'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/life/answer/delivery/${delivery.id}`)}
                  disabled={answerBusy[delivery.id]}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Answer Page
                </Button>
              </div>
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
    </>
  );
};

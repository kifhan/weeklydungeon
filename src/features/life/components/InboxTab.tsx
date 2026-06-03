import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Inbox, Clock, Bell, ExternalLink } from "lucide-react";
import { addAnswer, updateDelivery } from "../api";
import type { Delivery, MetaQuestion, Question, QuestionReservation } from "../types";
import { formatLocalDateTime } from "../utils";
import { requestNotificationPermission } from "@/services/fcm";

interface InboxTabProps {
  uid: string;
  pendingDeliveries: Delivery[];
  upcomingReservations: QuestionReservation[];
  questionLookup: Map<string, Question>;
  metaLookup: Map<string, MetaQuestion>;
  notificationEnabled: boolean;
  onNotificationEnabledChange: (enabled: boolean) => void;
}

export function InboxTab({
  uid,
  pendingDeliveries,
  upcomingReservations,
  questionLookup,
  metaLookup,
  notificationEnabled,
  onNotificationEnabledChange,
}: InboxTabProps) {
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
      console.error("Failed to enable notifications:", error);
    }
  };

  const handleSubmitAnswer = async (delivery: Delivery) => {
    const draft = answerDrafts[delivery.id];
    if (!draft?.trim()) {
      return;
    }

    setAnswerBusy((current) => ({ ...current, [delivery.id]: true }));
    try {
      await addAnswer(uid, {
        id: `ans-${crypto.randomUUID()}`,
        deliveryId: delivery.id,
        reservationId: delivery.reservationId,
        sourceQuestionText: delivery.questionText,
        answerContent: draft.trim(),
        answeredAt: new Date().toISOString(),
      });
      await updateDelivery(uid, delivery.id, { status: "ACKED" });
      setAnswerDrafts((current) => ({ ...current, [delivery.id]: "" }));
    } finally {
      setAnswerBusy((current) => ({ ...current, [delivery.id]: false }));
    }
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-blue-500" />
            Pending Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingDeliveries.length === 0 && (
            <p className="text-sm text-gray-500">No pending questions. You&apos;re all caught up.</p>
          )}
          {pendingDeliveries.map((delivery) => (
            <div key={delivery.id} className="rounded-lg border p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{delivery.questionText}</p>
                <p className="text-xs text-gray-500">Sent: {formatLocalDateTime(delivery.scheduledFor)}</p>
              </div>
              <Textarea
                placeholder="Write your answer..."
                value={answerDrafts[delivery.id] || ""}
                onChange={(event) => {
                  setAnswerDrafts((current) => ({
                    ...current,
                    [delivery.id]: event.target.value,
                  }));
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSubmitAnswer(delivery)}
                  disabled={answerBusy[delivery.id] || !(answerDrafts[delivery.id] || "").trim()}
                >
                  {answerBusy[delivery.id] ? "Saving..." : "Submit Answer"}
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
          {upcomingReservations.length === 0 && (
            <p className="text-sm text-gray-500">No upcoming reservations.</p>
          )}
          {upcomingReservations.map((reservation) => {
            const question = reservation.questionId ? questionLookup.get(reservation.questionId) : null;
            const meta = reservation.metaQuestionId ? metaLookup.get(reservation.metaQuestionId) : null;
            const nextRun = reservation.nextRunAt || reservation.targetTime;

            return (
              <div key={reservation.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm">{question?.content || meta?.basePrompt || "Question"}</p>
                  <p className="text-xs text-gray-500">{formatLocalDateTime(nextRun)}</p>
                </div>
                <Badge variant="outline">{reservation.type}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowLeft } from 'lucide-react';
import { useLifeQuestions } from '@/hooks/useLifeQuestions';
import { addAnswer, updateDelivery } from '@/services/firestore';

const formatLocalDateTime = (iso?: string | null) => {
  if (!iso) return 'No time';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
};

interface LifeAnswerDeliveryPageProps {
  uid: string;
}

export const LifeAnswerDeliveryPage: React.FC<LifeAnswerDeliveryPageProps> = ({ uid }) => {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const { deliveries } = useLifeQuestions(uid);
  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const delivery = deliveryId ? deliveries.find((d) => d.id === deliveryId) : null;

  useEffect(() => {
    if (deliveryId && deliveries.length > 0 && !delivery) {
      // Delivery not found or already answered
      navigate('/life/inbox', { replace: true });
    }
  }, [deliveryId, deliveries, delivery, navigate]);

  const handleSubmit = async () => {
    if (!delivery || !answerContent.trim()) return;
    setIsSubmitting(true);
    try {
      const answer = {
        id: `ans-${crypto.randomUUID()}`,
        deliveryId: delivery.id,
        reservationId: delivery.reservationId,
        sourceQuestionText: delivery.questionText,
        answerContent: answerContent.trim(),
        answeredAt: new Date().toISOString(),
      };
      await addAnswer(uid, answer);
      await updateDelivery(uid, delivery.id, { status: 'ACKED' });
      navigate('/life/history');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!delivery) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500">Delivery not found or already answered.</p>
            <Button onClick={() => navigate('/life/inbox')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inbox
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/life/inbox')}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle>Answer Question</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Question:</p>
            <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
              <p className="text-base text-gray-900 dark:text-gray-100">{delivery.questionText}</p>
              <p className="text-xs text-gray-500 mt-2">Sent: {formatLocalDateTime(delivery.scheduledFor)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Answer:</p>
            <Textarea
              placeholder="Write your answer..."
              value={answerContent}
              onChange={(e) => setAnswerContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !answerContent.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Submit Answer'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/life/inbox')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

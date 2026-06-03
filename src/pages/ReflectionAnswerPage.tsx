import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';

interface ReflectionAnswerPageProps {
  uid: string;
}

export const ReflectionAnswerPage: React.FC<ReflectionAnswerPageProps> = ({ uid }) => {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const { reflectionDeliveries, loading } = useDungeonData(uid);
  const actions = useDungeonActions(uid);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const delivery = deliveryId ? reflectionDeliveries.find((item) => item.id === deliveryId) : null;

  useEffect(() => {
    if (!loading && deliveryId && !delivery) {
      navigate('/reflections', { replace: true });
    }
  }, [delivery, deliveryId, loading, navigate]);

  const handleSubmit = async () => {
    if (!delivery || !answer.trim()) return;
    setSubmitting(true);
    try {
      await actions.submitReflectionAnswer({
        deliveryId: delivery.id,
        question: delivery.question,
        answer: answer.trim(),
      });
      navigate('/reflections');
    } finally {
      setSubmitting(false);
    }
  };

  if (!delivery) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-gray-500">
          {loading ? 'Loading reflection...' : 'Reflection delivery not found.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reflections')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Answer reflection</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="font-medium">{delivery.question}</p>
        </div>
        <Textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Write your answer"
          className="min-h-[220px]"
        />
        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={submitting || !answer.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            Save answer
          </Button>
          <Button variant="outline" onClick={() => navigate('/reflections')} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

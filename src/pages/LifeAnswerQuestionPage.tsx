import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowLeft } from 'lucide-react';
import { useLifeQuestions } from '@/hooks/useLifeQuestions';
import { addAnswer } from '@/services/firestore';

interface LifeAnswerQuestionPageProps {
  uid: string;
}

export const LifeAnswerQuestionPage: React.FC<LifeAnswerQuestionPageProps> = ({ uid }) => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { questions } = useLifeQuestions(uid);
  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = questionId ? questions.find((q) => q.id === questionId) : null;

  useEffect(() => {
    if (questionId && questions.length > 0 && !question) {
      // Question not found
      navigate('/life/questions', { replace: true });
    }
  }, [questionId, questions, question, navigate]);

  const handleSubmit = async () => {
    if (!question || !answerContent.trim()) return;
    setIsSubmitting(true);
    try {
      const answer = {
        id: `ans-${crypto.randomUUID()}`,
        deliveryId: null,
        reservationId: null,
        sourceQuestionText: question.content,
        answerContent: answerContent.trim(),
        answeredAt: new Date().toISOString(),
      };
      await addAnswer(uid, answer);
      navigate('/life/history');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!question) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500">Question not found.</p>
            <Button onClick={() => navigate('/life/questions')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Questions
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
              onClick={() => navigate('/life/questions')}
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
              <p className="text-base text-gray-900 dark:text-gray-100">{question.content}</p>
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
              onClick={() => navigate('/life/questions')}
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

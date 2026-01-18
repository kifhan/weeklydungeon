import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useLifeQuestions } from '@/hooks/useLifeQuestions';

const formatLocalDateTime = (iso?: string | null) => {
  if (!iso) return 'No time';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
};

interface LifeAnswerDetailPageProps {
  uid: string;
}

export const LifeAnswerDetailPage: React.FC<LifeAnswerDetailPageProps> = ({ uid }) => {
  const { answerId } = useParams<{ answerId: string }>();
  const navigate = useNavigate();
  const { answers } = useLifeQuestions(uid);

  const answer = answerId ? answers.find((a) => a.id === answerId) : null;

  useEffect(() => {
    if (answerId && answers.length > 0 && !answer) {
      // Answer not found
      navigate('/life/history', { replace: true });
    }
  }, [answerId, answers, answer, navigate]);

  if (!answer) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500">Answer not found.</p>
            <Button onClick={() => navigate('/life/history')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
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
              onClick={() => navigate('/life/history')}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle>Answer Detail</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Question:</p>
            <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
              <p className="text-base text-gray-900 dark:text-gray-100">{answer.sourceQuestionText}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Answer:</p>
            <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
              <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {answer.answerContent}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Answered: {formatLocalDateTime(answer.answeredAt)}
          </div>

          <div>
            <Button
              variant="outline"
              onClick={() => navigate('/life/history')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

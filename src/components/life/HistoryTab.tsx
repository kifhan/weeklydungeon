import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { BookOpen, Eye } from 'lucide-react';
import { Answer } from '@/types';

interface HistoryTabProps {
  answers: Answer[];
}

const formatLocalDateTime = (iso?: string | null) => {
  if (!iso) return 'No time';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
};

export const HistoryTab: React.FC<HistoryTabProps> = ({ answers }) => {
  const navigate = useNavigate();
  
  return (
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
          <div
            key={answer.id}
            className="rounded-lg border p-4 space-y-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => navigate(`/life/answers/${answer.id}`)}
          >
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{answer.sourceQuestionText}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{answer.answerContent}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Answered: {formatLocalDateTime(answer.answeredAt)}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/life/answers/${answer.id}`);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

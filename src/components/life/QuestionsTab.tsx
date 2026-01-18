import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Trash2, MessageSquare } from 'lucide-react';
import { Question, QuestionStatus } from '@/types';
import { addQuestion, deleteQuestion, updateQuestion } from '@/services/firestore';

const QUESTION_STATUSES: QuestionStatus[] = ['DRAFT', 'PUBLISH', 'DONE', 'ARCHIVE'];

interface QuestionsTabProps {
  uid: string;
  questions: Question[];
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({ uid, questions }) => {
  const navigate = useNavigate();
  const [questionContent, setQuestionContent] = useState('');
  const [questionStatus, setQuestionStatus] = useState<QuestionStatus>('DRAFT');

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

  return (
    <>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/life/answer/question/${question.id}`)}
                  className="ml-auto"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Answer
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};

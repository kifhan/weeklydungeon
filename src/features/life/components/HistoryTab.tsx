import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookOpen, Eye } from "lucide-react";
import type { Answer } from "../types";
import { formatLocalDateTime } from "../utils";

interface HistoryTabProps {
  answers: Answer[];
}

export function HistoryTab({ answers }: HistoryTabProps) {
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
                onClick={(event) => {
                  event.stopPropagation();
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
}

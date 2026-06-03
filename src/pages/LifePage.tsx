import React, { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, CheckCircle2, Plus, Send } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';

interface LifePageProps {
  uid: string;
}

export const LifePage: React.FC<LifePageProps> = ({ uid }) => {
  const navigate = useNavigate();
  const { reflections, reflectionDeliveries, reflectionAnswers, memoryContexts, loading, error } = useDungeonData(uid);
  const actions = useDungeonActions(uid);
  const [question, setQuestion] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const queuedReflections = reflections.filter((reflection) => reflection.status === 'queued');
  const pendingDeliveries = reflectionDeliveries.filter((delivery) =>
    ['pending', 'sent', 'acked'].includes(delivery.status)
  );
  const answeredReflectionIds = useMemo(() => {
    return new Set(reflectionAnswers.map((answer) => answer.reflectionId).filter(Boolean));
  }, [reflectionAnswers]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setBusy('create');
    try {
      await actions.queueReflection({ question: trimmedQuestion });
      setQuestion('');
    } finally {
      setBusy(null);
    }
  };

  const handleAnswer = async (reflectionId: string, reflectionQuestion: string) => {
    const answer = answerDrafts[reflectionId]?.trim();
    if (!answer) return;

    setBusy(reflectionId);
    try {
      await actions.submitReflectionAnswer({
        reflectionId,
        question: reflectionQuestion,
        answer,
      });
      setAnswerDrafts((drafts) => ({ ...drafts, [reflectionId]: '' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Queued" value={String(queuedReflections.length)} />
        <Metric title="Answers" value={String(reflectionAnswers.length)} />
        <Metric title="Memory contexts" value={String(memoryContexts.length)} />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{error.message}</CardContent>
        </Card>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Reflections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreate} className="space-y-3 rounded-md border p-4 dark:border-gray-700">
              <Label htmlFor="reflection-question">Manual reflection</Label>
              <Textarea
                id="reflection-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What question should be queued?"
              />
              <Button type="submit" className="gap-2" disabled={busy === 'create' || !question.trim()}>
                <Plus className="h-4 w-4" />
                Queue reflection
              </Button>
            </form>

            {loading && queuedReflections.length === 0 && <p className="text-sm text-gray-500">Loading...</p>}
            {!loading && queuedReflections.length === 0 && <p className="text-sm text-gray-500">No queued reflections.</p>}
            {queuedReflections.map((reflection) => (
              <article key={reflection.id} className="space-y-3 rounded-md border p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{reflection.question}</p>
                  <Badge variant="secondary">{reflection.source}</Badge>
                </div>
                <Textarea
                  value={answerDrafts[reflection.id] || ''}
                  onChange={(event) =>
                    setAnswerDrafts((drafts) => ({ ...drafts, [reflection.id]: event.target.value }))
                  }
                  placeholder="Answer this reflection"
                />
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => handleAnswer(reflection.id, reflection.question)}
                  disabled={busy === reflection.id || !(answerDrafts[reflection.id] || '').trim()}
                >
                  <Send className="h-4 w-4" />
                  Save answer
                </Button>
              </article>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deliveries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDeliveries.length === 0 && <p className="text-sm text-gray-500">No delivered reflections.</p>}
              {pendingDeliveries.map((delivery) => (
                <article key={delivery.id} className="space-y-3 rounded-md border p-3 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{delivery.question}</p>
                    <Badge variant="outline">{delivery.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate(`/reflections/answer/${delivery.id}`)}>
                      Answer
                    </Button>
                    {delivery.status !== 'acked' && (
                      <Button size="sm" variant="outline" onClick={() => actions.acknowledgeDelivery(delivery.id)}>
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reflectionAnswers.length === 0 && <p className="text-sm text-gray-500">No answers yet.</p>}
              {reflectionAnswers.slice(0, 8).map((answer) => (
                <article key={answer.id} className="rounded-md border p-3 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{answer.question}</p>
                    {answer.reflectionId && answeredReflectionIds.has(answer.reflectionId) && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{answer.answer}</p>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {memoryContexts.length === 0 && <p className="text-sm text-gray-500">No generated memory contexts yet.</p>}
              {memoryContexts.map((context) => (
                <div key={context.id} className="rounded-md border p-3 text-sm dark:border-gray-700">
                  <Archive className="mb-2 h-4 w-4 text-blue-600" />
                  {context.summary}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

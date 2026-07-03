import React, { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, CheckCircle2, Flame, ListChecks, Plus, Send, Sparkles, Swords } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';
import { usePracticeData } from '@/weekly-dungeon/hooks/usePracticeData';
import { walkthroughSteps } from '@/pages/WalkthroughPage';
import { getPracticeProgress, practiceDayThemes } from '@/weekly-dungeon/practice/model';
import {
  buildCharacterPrompt,
  currentQuestDay,
  getQuestProgress,
  questDays,
  type QuestDay,
  type QuestDifficulty,
} from '@/weekly-dungeon/domain/types';

interface CommandCenterPageProps {
  uid: string;
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CommandCenterPage: React.FC<CommandCenterPageProps> = ({ uid }) => {
  const dungeon = useDungeonData(uid);
  const practice = usePracticeData(uid);
  const actions = useDungeonActions(uid);
  const [questTitle, setQuestTitle] = useState('');
  const [questNote, setQuestNote] = useState('');
  const [questDay, setQuestDay] = useState<QuestDay>(currentQuestDay());
  const [questDifficulty, setQuestDifficulty] = useState<QuestDifficulty>('standard');
  const [reflectionQuestion, setReflectionQuestion] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const progress = getQuestProgress(dungeon.quests);
  const activeQuests = dungeon.quests.filter((quest) => quest.status !== 'complete');
  const queuedReflections = dungeon.reflections.filter((reflection) => reflection.status === 'queued');
  const walkthroughCompletedStepIds = dungeon.profile.walkthroughCompletedStepIds || [];
  const walkthroughCompletedCount = walkthroughSteps.filter((step) =>
    walkthroughCompletedStepIds.includes(step.id)
  ).length;
  const walkthroughComplete = walkthroughCompletedCount === walkthroughSteps.length;
  const showWalkthroughPrompt = !walkthroughComplete && !dungeon.profile.walkthroughPromptDismissed;
  const walkthroughActiveStep =
    walkthroughSteps.find((step) => !walkthroughCompletedStepIds.includes(step.id)) || walkthroughSteps[0];
  const checkedToday = useMemo(() => {
    const today = todayKey();
    return new Set(dungeon.habitLogs.filter((log) => log.date === today && log.checked).map((log) => log.habitId));
  }, [dungeon.habitLogs]);
  const guidePrompt = buildCharacterPrompt(dungeon.profile);
  const practiceTheme = practice.position ? practiceDayThemes[practice.position.dayTheme] : null;
  const practiceProgress = practice.todaySession ? getPracticeProgress(practice.todaySession.completedBlockIds) : null;

  const submitQuest = async (event: FormEvent) => {
    event.preventDefault();
    const title = questTitle.trim();
    if (!title) return;

    setBusy('quest');
    try {
      await actions.addQuest({
        title,
        note: questNote.trim(),
        day: questDay,
        difficulty: questDifficulty,
        sortOrder: Date.now(),
      });
      setQuestTitle('');
      setQuestNote('');
    } finally {
      setBusy(null);
    }
  };

  const submitReflection = async (event: FormEvent) => {
    event.preventDefault();
    const question = reflectionQuestion.trim();
    if (!question) return;

    setBusy('reflection');
    try {
      await actions.queueReflection({ question });
      setReflectionQuestion('');
    } finally {
      setBusy(null);
    }
  };

  const submitAnswer = async (reflectionId: string, question: string) => {
    const answer = answerDrafts[reflectionId]?.trim();
    if (!answer) return;

    setBusy(reflectionId);
    try {
      await actions.submitReflectionAnswer({ reflectionId, question, answer });
      setAnswerDrafts((drafts) => ({ ...drafts, [reflectionId]: '' }));
    } finally {
      setBusy(null);
    }
  };

  const dismissWalkthroughPrompt = async () => {
    setBusy('walkthrough-dismiss');
    try {
      await actions.updateProfile({ walkthroughPromptDismissed: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {dungeon.error && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{dungeon.error.message}</CardContent>
        </Card>
      )}

      {showWalkthroughPrompt && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40">
          <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-blue-950 dark:text-blue-100">Finish your walkthrough</p>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                {walkthroughCompletedCount} of {walkthroughSteps.length} steps complete. Continue with:{' '}
                <span className="font-medium">{walkthroughActiveStep.title}</span>
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                to="/walkthrough"
                className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-600/90"
              >
                Continue
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={dismissWalkthroughPrompt}
                disabled={busy === 'walkthrough-dismiss'}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={Flame} label="Quest progress" value={`${progress}%`} />
        <Metric icon={Swords} label="Open quests" value={String(activeQuests.length)} />
        <Metric icon={CheckCircle2} label="Habits today" value={`${checkedToday.size}/${dungeon.habits.length}`} />
        <Metric icon={Archive} label="Memory contexts" value={String(dungeon.memoryContexts.length)} />
      </section>

      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <ListChecks className="mt-1 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <div className="min-w-0">
              <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                {practice.settings ? practiceTheme?.label || 'Practice system' : 'Start your practice system'}
              </p>
              <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                {practice.settings
                  ? `${practiceProgress?.completedCount || 0} of ${practiceProgress?.totalCount || 4} daily blocks complete. ${practiceTheme?.summary || ''}`
                  : 'Begin the 12-week training track for deliberate coding practice, evidence, and weekly reviews.'}
              </p>
            </div>
          </div>
          <Link
            to="/practice"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            {practice.settings ? 'Continue practice' : 'Open practice'}
          </Link>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Current week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitQuest} className="grid gap-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_150px]">
                <div>
                  <Label htmlFor="quest-title">New quest</Label>
                  <Input
                    id="quest-title"
                    value={questTitle}
                    onChange={(event) => setQuestTitle(event.target.value)}
                    placeholder="Name the next outcome"
                  />
                </div>
                <div>
                  <Label htmlFor="quest-day">Day</Label>
                  <Select
                    id="quest-day"
                    value={questDay}
                    onValueChange={(value) => setQuestDay(value as QuestDay)}
                  >
                    {questDays.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quest-difficulty">Difficulty</Label>
                  <Select
                    id="quest-difficulty"
                    value={questDifficulty}
                    onValueChange={(value) => setQuestDifficulty(value as QuestDifficulty)}
                  >
                    <SelectItem value="calm">calm</SelectItem>
                    <SelectItem value="standard">standard</SelectItem>
                    <SelectItem value="boss">boss</SelectItem>
                  </Select>
                </div>
              </div>
              <Textarea
                value={questNote}
                onChange={(event) => setQuestNote(event.target.value)}
                placeholder="Optional note, reward, or constraint"
              />
              <Button type="submit" className="w-fit gap-2" disabled={busy === 'quest'}>
                <Plus className="h-4 w-4" />
                Add quest
              </Button>
            </form>

            <div className="space-y-3">
              {dungeon.loading && <p className="text-sm text-gray-500">Loading command data...</p>}
              {!dungeon.loading && activeQuests.length === 0 && (
                <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
                  No open quests for this week.
                </p>
              )}
              {activeQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{quest.day}</Badge>
                        <Badge variant="outline">{quest.status}</Badge>
                        <Badge>{quest.difficulty}</Badge>
                      </div>
                      <h2 className="text-lg font-semibold">{quest.title}</h2>
                      {quest.note && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{quest.note}</p>}
                    </div>
                    <Button size="sm" onClick={() => actions.advanceQuest(quest)} className="shrink-0">
                      Advance
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{guidePrompt}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Habit forest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dungeon.habits.length === 0 && <p className="text-sm text-gray-500">No V2 habits yet.</p>}
              {dungeon.habits.map((habit) => {
                const checked = checkedToday.has(habit.id);
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() =>
                      actions.checkHabit({
                        habitId: habit.id,
                        date: todayKey(),
                        checked: !checked,
                      })
                    }
                    className="flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left text-sm dark:border-gray-700"
                  >
                    <span>
                      <span className="block font-medium">{habit.name}</span>
                      <span className="text-gray-500">{habit.target}</span>
                    </span>
                    {checked && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reflections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitReflection} className="space-y-3">
              <Label htmlFor="reflection-question">Manual reflection</Label>
              <Textarea
                id="reflection-question"
                value={reflectionQuestion}
                onChange={(event) => setReflectionQuestion(event.target.value)}
                placeholder="What question should future you answer?"
              />
              <Button type="submit" className="gap-2" disabled={busy === 'reflection'}>
                <Sparkles className="h-4 w-4" />
                Queue reflection
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reflection inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {queuedReflections.length === 0 && <p className="text-sm text-gray-500">No queued reflections.</p>}
            {queuedReflections.slice(0, 3).map((reflection) => (
              <div key={reflection.id} className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium">{reflection.question}</p>
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
                  onClick={() => submitAnswer(reflection.id, reflection.question)}
                  disabled={busy === reflection.id}
                >
                  <Send className="h-4 w-4" />
                  Save answer
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 pt-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="h-6 w-6 text-blue-600" />
      </CardContent>
    </Card>
  );
}

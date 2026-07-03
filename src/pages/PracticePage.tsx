import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Copy,
  FileText,
  Flame,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { usePracticeActions } from '@/weekly-dungeon/hooks/usePracticeActions';
import { usePracticeData } from '@/weekly-dungeon/hooks/usePracticeData';
import {
  formatPracticeDateKey,
  getCurrentPracticePhase,
  getPracticeProgress,
  getPracticeSessionId,
  getSessionStatus,
  PRACTICE_PROGRAM,
  practiceBlocks,
  practiceDayThemes,
  practiceTemplates,
  practiceWeekPhases,
  type PracticeReview,
} from '@/weekly-dungeon/practice/model';

type PracticeTab = 'today' | 'program' | 'templates';

interface PracticePageProps {
  uid: string;
}

function splitEvidenceLinks(value: string) {
  return value
    .split('\n')
    .map((link) => link.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function getReviewStatus(review: PracticeReview) {
  const filledCount = [
    review.uglyCode,
    review.whyUgly,
    review.pattern,
    review.preventionRule,
    review.nextWeekFocus,
  ].filter((value) => value.trim().length > 0).length;

  if (filledCount === 5) return 'complete';
  if (filledCount > 0) return 'in-progress';
  return 'not-started';
}

export const PracticePage: React.FC<PracticePageProps> = ({ uid }) => {
  const practice = usePracticeData(uid);
  const actions = usePracticeActions(uid);
  const [tab, setTab] = useState<PracticeTab>('today');
  const [busy, setBusy] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [evidenceDraft, setEvidenceDraft] = useState('');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<PracticeReview | null>(null);

  const todayKey = formatPracticeDateKey();
  const started = Boolean(practice.settings);
  const position = practice.position;
  const currentPhase = position ? getCurrentPracticePhase(position.weekNumber) : null;
  const theme = position ? practiceDayThemes[position.dayTheme] : null;

  const todaySession = useMemo(() => {
    if (!practice.settings || !position) return null;
    return (
      practice.todaySession ||
      actions.createSessionForDate(practice.settings.startDate, [])
    );
  }, [actions, position, practice.settings, practice.todaySession]);

  const progress = todaySession
    ? getPracticeProgress(todaySession.completedBlockIds)
    : { completedCount: 0, totalCount: practiceBlocks.length, percent: 0, complete: false };

  useEffect(() => {
    setNotesDraft(todaySession?.notes || '');
    setEvidenceDraft((todaySession?.evidenceLinks || []).join('\n'));
  }, [todaySession?.id, todaySession?.notes, todaySession?.evidenceLinks]);

  useEffect(() => {
    if (!position) {
      setReviewDraft(null);
      return;
    }

    setReviewDraft(
      practice.currentReview || actions.createReviewForWeek(position.weekNumber)
    );
  }, [actions, position, practice.currentReview]);

  const startPractice = async () => {
    setBusy('start');
    try {
      await actions.startProgram(todayKey);
    } finally {
      setBusy(null);
    }
  };

  const resetStartDate = async () => {
    setBusy('restart');
    try {
      await actions.startProgram(todayKey);
    } finally {
      setBusy(null);
    }
  };

  const toggleBlock = async (blockId: string) => {
    if (!todaySession) return;

    const completedSet = new Set<string>(todaySession.completedBlockIds);
    if (completedSet.has(blockId)) {
      completedSet.delete(blockId);
    } else {
      completedSet.add(blockId);
    }

    const completedBlockIds: string[] = Array.from(completedSet);
    setBusy(blockId);
    try {
      await actions.saveSession({
        ...todaySession,
        completedBlockIds,
        notes: notesDraft,
        evidenceLinks: splitEvidenceLinks(evidenceDraft),
        status: getSessionStatus(completedBlockIds),
      });
    } finally {
      setBusy(null);
    }
  };

  const saveSessionNotes = async () => {
    if (!todaySession) return;

    setBusy('session-notes');
    try {
      await actions.saveSession({
        ...todaySession,
        notes: notesDraft,
        evidenceLinks: splitEvidenceLinks(evidenceDraft),
      });
    } finally {
      setBusy(null);
    }
  };

  const saveWeeklyReview = async () => {
    if (!reviewDraft) return;

    const nextReview = {
      ...reviewDraft,
      status: getReviewStatus(reviewDraft),
    };

    setBusy('review');
    try {
      await actions.saveReview(nextReview);
    } finally {
      setBusy(null);
    }
  };

  const copyTemplate = async (templateId: string, body: string) => {
    await navigator.clipboard.writeText(body);
    setCopiedTemplateId(templateId);
    window.setTimeout(() => setCopiedTemplateId(null), 1400);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {practice.error && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{practice.error.message}</CardContent>
        </Card>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant={started ? 'default' : 'secondary'}>{started ? 'Active' : 'Not started'}</Badge>
              {practice.loading && <Badge variant="outline">Syncing</Badge>}
              {position?.programComplete && <Badge variant="outline">12 weeks complete</Badge>}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
              Practice system
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              Run the 12-week coding practice loop with daily drills, weekly reviews, evidence capture, and prompt templates.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {!started ? (
              <Button type="button" onClick={startPractice} disabled={busy === 'start'} className="gap-2">
                <Flame className="h-4 w-4" />
                Start today
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={resetStartDate} disabled={busy === 'restart'} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Restart from today
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
        {[
          { id: 'today', label: 'Today', Icon: CheckCircle2 },
          { id: 'program', label: 'Program', Icon: CalendarDays },
          { id: 'templates', label: 'Templates', Icon: Clipboard },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id as PracticeTab)}
            className={[
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle>{theme ? theme.label : 'Start your practice track'}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {theme ? theme.task : "Start the program to unlock today's training station."}
                    </p>
                  </div>
                  {position && (
                    <Badge variant="secondary">
                      Week {position.weekNumber}, day {position.dayIndex + 1}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{progress.percent}% complete</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {progress.completedCount}/{progress.totalCount}
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {practiceBlocks.map((block) => {
                    const complete = Boolean(todaySession?.completedBlockIds.includes(block.id));

                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => toggleBlock(block.id)}
                        disabled={!started || busy !== null}
                        className={[
                          'flex min-h-36 flex-col items-start rounded-md border p-4 text-left transition-colors',
                          complete
                            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                            : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-800/70',
                        ].join(' ')}
                      >
                        <span className="flex w-full items-start justify-between gap-3">
                          <span className="font-semibold text-gray-950 dark:text-white">{block.title}</span>
                          {complete ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                          ) : (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                              {block.minutes}m
                            </span>
                          )}
                        </span>
                        <span className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{block.instruction}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Evidence and notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="practice-notes" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Notes
                  </label>
                  <Textarea
                    id="practice-notes"
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Pattern noticed, hostile case found, simplification made..."
                    className="mt-2 min-h-32"
                    disabled={!started}
                  />
                </div>
                <div>
                  <label htmlFor="practice-evidence" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Evidence links
                  </label>
                  <Textarea
                    id="practice-evidence"
                    value={evidenceDraft}
                    onChange={(event) => setEvidenceDraft(event.target.value)}
                    placeholder="One URL or file path per line"
                    className="mt-2 min-h-24"
                    disabled={!started}
                  />
                </div>
                <Button type="button" onClick={saveSessionNotes} disabled={!started || busy === 'session-notes'} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save session
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phase</p>
                  <p className="mt-1 font-semibold text-gray-950 dark:text-white">
                    {currentPhase ? currentPhase.title : 'Not started'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
                  <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-200">
                    {theme ? theme.summary : 'Start today to create your first practice session.'}
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Session ID</p>
                  <p className="mt-1 break-all text-sm text-gray-700 dark:text-gray-200">
                    {started ? getPracticeSessionId(PRACTICE_PROGRAM.id, todayKey) : 'Created after start'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviewDraft ? (
                  <>
                    <ReviewField
                      label="Ugly code"
                      value={reviewDraft.uglyCode}
                      onChange={(value) => setReviewDraft({ ...reviewDraft, uglyCode: value })}
                    />
                    <ReviewField
                      label="Why it was ugly"
                      value={reviewDraft.whyUgly}
                      onChange={(value) => setReviewDraft({ ...reviewDraft, whyUgly: value })}
                    />
                    <ReviewField
                      label="Pattern"
                      value={reviewDraft.pattern}
                      onChange={(value) => setReviewDraft({ ...reviewDraft, pattern: value })}
                    />
                    <ReviewField
                      label="Rule for next time"
                      value={reviewDraft.preventionRule}
                      onChange={(value) => setReviewDraft({ ...reviewDraft, preventionRule: value })}
                    />
                    <ReviewField
                      label="Next week focus"
                      value={reviewDraft.nextWeekFocus}
                      onChange={(value) => setReviewDraft({ ...reviewDraft, nextWeekFocus: value })}
                    />
                    <Button type="button" onClick={saveWeeklyReview} disabled={busy === 'review'} className="w-full gap-2">
                      <Save className="h-4 w-4" />
                      Save review
                    </Button>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                    Start the program to create this week's review.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {tab === 'program' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {practiceWeekPhases.map((phase) => {
              const active = Boolean(position && position.weekNumber >= phase.weekStart && position.weekNumber <= phase.weekEnd);

              return (
                <Card key={phase.title} className={active ? 'border-blue-300 dark:border-blue-800' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">{phase.title}</CardTitle>
                      <Badge variant={active ? 'default' : 'outline'}>
                        Weeks {phase.weekStart}-{phase.weekEnd}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{phase.goal}</p>
                    <div className="flex flex-wrap gap-2">
                      {phase.focus.map((item) => (
                        <Badge key={item} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                {Object.entries(practiceDayThemes).map(([dayTheme, details]) => (
                  <div
                    key={dayTheme}
                    className={[
                      'rounded-md border p-3',
                      position?.dayTheme === dayTheme
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700',
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-gray-950 dark:text-white">{details.label}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{details.summary}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {tab === 'templates' && (
        <section className="grid gap-4 lg:grid-cols-2">
          {practiceTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpenCheck className="h-5 w-5 text-blue-600" />
                      {template.title}
                    </CardTitle>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{template.description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyTemplate(template.id, template.body)}
                    className="shrink-0 gap-2"
                  >
                    {copiedTemplateId === template.id ? (
                      <ClipboardCheck className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedTemplateId === template.id ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  {template.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};

function ReviewField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-20"
      />
    </label>
  );
}

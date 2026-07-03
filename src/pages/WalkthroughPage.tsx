import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  ListChecks,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';

type WalkthroughSection = 'First setup' | 'Core loop' | 'Daily flow';

type WalkthroughStep = {
  id: string;
  section: WalkthroughSection;
  title: string;
  instruction: string;
  checklist: string[];
  targetLabel: string;
  targetPath: string;
};

export const walkthroughSteps: WalkthroughStep[] = [
  {
    id: 'settings',
    section: 'First setup',
    title: 'Confirm your settings',
    instruction: 'Set the delivery basics before you build the weekly loop.',
    checklist: ['Confirm your timezone', 'Choose a notification channel', 'Turn reminders on or off'],
    targetLabel: 'Open Settings',
    targetPath: '/settings',
  },
  {
    id: 'character',
    section: 'First setup',
    title: 'Shape your guide',
    instruction: 'Tune the voice Weekly Dungeon uses when it helps you plan and reflect.',
    checklist: ['Name the guide', 'Pick an archetype', 'Adjust traits, tone, and intensity'],
    targetLabel: 'Open Character',
    targetPath: '/character',
  },
  {
    id: 'first-quest',
    section: 'Core loop',
    title: 'Create your first quest',
    instruction: 'Add one outcome for the current week and learn how quest progress advances.',
    checklist: ['Create a quest', 'Choose a day and difficulty', 'Advance it when it becomes active'],
    targetLabel: 'Open Quests',
    targetPath: '/quests',
  },
  {
    id: 'first-habit',
    section: 'Core loop',
    title: 'Add a habit',
    instruction: 'Create a repeatable action and check it off for today.',
    checklist: ['Create a daily or weekly habit', 'Check it off once', 'Review the habit forest state'],
    targetLabel: 'Open Habits',
    targetPath: '/habits',
  },
  {
    id: 'first-reflection',
    section: 'Core loop',
    title: 'Queue and answer a reflection',
    instruction: 'Start building memory context with one question and one answer.',
    checklist: ['Queue a reflection question', 'Answer one reflection', 'Confirm it appears in history'],
    targetLabel: 'Open Reflections',
    targetPath: '/reflections',
  },
  {
    id: 'practice-track',
    section: 'Core loop',
    title: 'Start the practice system',
    instruction: 'Turn the coding practice method into daily drills, evidence, and weekly reviews.',
    checklist: ['Open Practice', 'Start the 12-week track', "Review today's four training blocks"],
    targetLabel: 'Open Practice',
    targetPath: '/practice',
  },
  {
    id: 'command-review',
    section: 'Daily flow',
    title: 'Review the command center',
    instruction: 'Use the command center as the normal daily scan surface.',
    checklist: ['Check quest progress', 'Review today habits', 'Scan guide prompt and reflection inbox'],
    targetLabel: 'Open Command',
    targetPath: '/',
  },
];

const stepIds = walkthroughSteps.map((step) => step.id);
const validStepIds = new Set(stepIds);

interface WalkthroughPageProps {
  uid: string;
}

export const WalkthroughPage: React.FC<WalkthroughPageProps> = ({ uid }) => {
  const { profile, error, loading } = useDungeonData(uid);
  const actions = useDungeonActions(uid);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'step' | 'reset' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const completedStepIds = useMemo(
    () => (profile.walkthroughCompletedStepIds || []).filter((stepId) => validStepIds.has(stepId)),
    [profile.walkthroughCompletedStepIds]
  );
  const completedSet = useMemo(() => new Set(completedStepIds), [completedStepIds]);
  const firstIncompleteStep = walkthroughSteps.find((step) => !completedSet.has(step.id));
  const resolvedActiveStepId =
    activeStepId && validStepIds.has(activeStepId)
      ? activeStepId
      : firstIncompleteStep?.id || walkthroughSteps[walkthroughSteps.length - 1].id;
  const activeIndex = Math.max(
    0,
    walkthroughSteps.findIndex((step) => step.id === resolvedActiveStepId)
  );
  const activeStep = walkthroughSteps[activeIndex];
  const completedCount = completedSet.size;
  const progress = Math.round((completedCount / walkthroughSteps.length) * 100);
  const walkthroughComplete = completedCount === walkthroughSteps.length;
  const previousStep = walkthroughSteps[activeIndex - 1];
  const nextStep = walkthroughSteps[activeIndex + 1];

  const persistProfile = async (
    patch: Parameters<typeof actions.updateProfile>[0],
    busyState: 'step' | 'reset'
  ) => {
    setSaving(busyState);
    setSaveError(null);
    try {
      await actions.updateProfile(patch);
      return true;
    } catch (nextError) {
      setSaveError(nextError instanceof Error ? nextError.message : 'Could not save walkthrough progress.');
      return false;
    } finally {
      setSaving(null);
    }
  };

  const setActiveStep = (stepId: string) => {
    setActiveStepId(stepId);
  };

  const completeCurrentStep = async () => {
    const nextCompletedIds = Array.from(new Set([...completedStepIds, activeStep.id]));
    const nextActiveStepId = nextStep?.id || activeStep.id;

    const saved = await persistProfile(
      {
        walkthroughCompletedStepIds: nextCompletedIds,
        walkthroughPromptDismissed: nextCompletedIds.length === walkthroughSteps.length,
      },
      'step'
    );
    if (saved) setActiveStepId(nextActiveStepId);
  };

  const resetWalkthrough = async () => {
    const saved = await persistProfile(
      {
        walkthroughCompletedStepIds: [],
        walkthroughPromptDismissed: false,
      },
      'reset'
    );
    if (saved) setActiveStepId(walkthroughSteps[0].id);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {(error || saveError) && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{saveError || error?.message}</CardContent>
        </Card>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant={walkthroughComplete ? 'default' : 'secondary'}>
                {walkthroughComplete ? 'Complete' : `Step ${activeIndex + 1} of ${walkthroughSteps.length}`}
              </Badge>
              {loading && <Badge variant="outline">Syncing</Badge>}
              {saving && <Badge variant="outline">Saving</Badge>}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
              Walkthrough
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              Work through Weekly Dungeon one step at a time. Progress is saved to your profile so the command center
              can pick up where you left off.
            </p>
          </div>
          <div className="min-w-0 lg:w-72">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-200">{progress}% complete</span>
              <span className="text-gray-500 dark:text-gray-400">
                {completedCount}/{walkthroughSteps.length}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)] lg:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-blue-600" />
              Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {walkthroughSteps.map((step, index) => {
              const active = step.id === activeStep.id;
              const complete = completedSet.has(step.id);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  disabled={saving !== null}
                  className={[
                    'flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors',
                    active
                      ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/70',
                  ].join(' ')}
                >
                  <span className="mt-0.5">
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      {index + 1}. {step.section}
                    </span>
                    <span className="mt-1 block font-semibold">{step.title}</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Badge variant={completedSet.has(activeStep.id) ? 'default' : 'outline'}>{activeStep.section}</Badge>
                <CardTitle className="mt-3 text-2xl leading-tight">{activeStep.title}</CardTitle>
              </div>
              {completedSet.has(activeStep.id) && (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved complete
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <p className="text-base leading-7 text-gray-700 dark:text-gray-200">{activeStep.instruction}</p>

            <div className="grid gap-3">
              {activeStep.checklist.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-gray-700 dark:text-gray-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-blue-900 dark:text-blue-100">
                Open the target page, try the task, then return here and save this step.
              </p>
              <Link
                to={activeStep.targetPath}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600/90"
              >
                {activeStep.targetLabel}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => previousStep && setActiveStep(previousStep.id)}
                  disabled={!previousStep || saving !== null}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => nextStep && setActiveStep(nextStep.id)}
                  disabled={!nextStep || saving !== null}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                onClick={completeCurrentStep}
                disabled={saving !== null}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {completedSet.has(activeStep.id) ? 'Save and continue' : 'Mark complete'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Need to run the onboarding again? Resetting clears the saved checklist and shows the command-center reminder again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetWalkthrough}
            disabled={saving !== null}
            className="w-full gap-2 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Reset walkthrough
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';

type WalkthroughSection = 'First setup' | 'Core loop' | 'Daily flow' | 'Finish';

type WalkthroughStep = {
  id: string;
  section: WalkthroughSection;
  title: string;
  instruction: string;
  targetLabel: string;
  targetPath: string;
};

export const walkthroughSteps: WalkthroughStep[] = [
  {
    id: 'settings',
    section: 'First setup',
    title: 'Confirm your settings',
    instruction: 'Set your timezone, choose a notification channel, and decide whether reminders should be enabled.',
    targetLabel: 'Open Settings',
    targetPath: '/settings',
  },
  {
    id: 'character',
    section: 'First setup',
    title: 'Shape your guide',
    instruction: 'Choose a guide name, archetype, traits, tone, and intensity so Weekly Dungeon speaks in the right voice.',
    targetLabel: 'Open Character',
    targetPath: '/character',
  },
  {
    id: 'first-quest',
    section: 'Core loop',
    title: 'Create your first quest',
    instruction: 'Add a quest for the current week, choose a day and difficulty, then advance it when it becomes active.',
    targetLabel: 'Open Quests',
    targetPath: '/quests',
  },
  {
    id: 'first-habit',
    section: 'Core loop',
    title: 'Add a habit',
    instruction: 'Create one daily or weekly habit and check it off for today when it is done.',
    targetLabel: 'Open Habits',
    targetPath: '/habits',
  },
  {
    id: 'first-reflection',
    section: 'Core loop',
    title: 'Queue and answer a reflection',
    instruction: 'Write a question for future you, queue it, then save an answer to begin building memory context.',
    targetLabel: 'Open Reflections',
    targetPath: '/reflections',
  },
  {
    id: 'command-review',
    section: 'Daily flow',
    title: 'Review the command center',
    instruction: "Use the command center to scan quest progress, today's habits, reflections, and your current guide prompt.",
    targetLabel: 'Open Command',
    targetPath: '/',
  },
];

const sectionOrder: WalkthroughSection[] = ['First setup', 'Core loop', 'Daily flow', 'Finish'];

interface WalkthroughPageProps {
  uid: string;
}

export const WalkthroughPage: React.FC<WalkthroughPageProps> = ({ uid }) => {
  const { profile, error } = useDungeonData(uid);
  const actions = useDungeonActions(uid);
  const [savingStepId, setSavingStepId] = useState<string | null>(null);
  const completedStepIds = profile.walkthroughCompletedStepIds || [];
  const completedSet = useMemo(() => new Set(completedStepIds), [completedStepIds]);
  const completedCount = walkthroughSteps.filter((step) => completedSet.has(step.id)).length;
  const progress = Math.round((completedCount / walkthroughSteps.length) * 100);
  const complete = completedCount === walkthroughSteps.length;

  const stepsBySection = useMemo(() => {
    return sectionOrder.reduce<Record<WalkthroughSection, WalkthroughStep[]>>(
      (groups, section) => ({
        ...groups,
        [section]: walkthroughSteps.filter((step) => step.section === section),
      }),
      { 'First setup': [], 'Core loop': [], 'Daily flow': [], Finish: [] }
    );
  }, []);

  const toggleStep = async (stepId: string, checked: boolean) => {
    const nextIds = checked
      ? Array.from(new Set([...completedStepIds, stepId]))
      : completedStepIds.filter((id) => id !== stepId);

    setSavingStepId(stepId);
    try {
      await actions.updateProfile({ walkthroughCompletedStepIds: nextIds });
    } finally {
      setSavingStepId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{error.message}</CardContent>
        </Card>
      )}

      <Card className={complete ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40' : ''}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Walkthrough</CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                Follow these steps to set up Weekly Dungeon and learn the daily loop. Check each step when you have tried it.
              </p>
            </div>
            <Badge variant={complete ? 'default' : 'secondary'}>{progress}% complete</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {complete
              ? 'Walkthrough complete. You can revisit these steps any time.'
              : `${completedCount} of ${walkthroughSteps.length} steps completed.`}
          </p>
        </CardContent>
      </Card>

      {sectionOrder.map((section) => {
        const sectionSteps = stepsBySection[section];
        if (section === 'Finish') {
          return (
            <Card key={section}>
              <CardHeader>
                <CardTitle>Completion summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Once every step is checked, the command center prompt will stay hidden and Weekly Dungeon is ready for normal use.
                </p>
                <Link
                  to="/"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600/90"
                >
                  Open Command
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sectionSteps.map((step) => {
                const checked = completedSet.has(step.id);
                const saving = savingStepId === step.id;

                return (
                  <article
                    key={step.id}
                    className="flex flex-col gap-4 rounded-md border border-gray-200 p-4 dark:border-gray-700 lg:flex-row lg:items-start lg:justify-between"
                  >
                    <label className="flex min-w-0 flex-1 items-start gap-3">
                      <Checkbox
                        checked={checked}
                        disabled={saving}
                        onCheckedChange={(nextChecked) => toggleStep(step.id, nextChecked)}
                        aria-label={`Mark ${step.title} complete`}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          {checked ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="font-semibold">{step.title}</span>
                          {saving && <Badge variant="outline">Saving</Badge>}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {step.instruction}
                        </span>
                      </span>
                    </label>
                    <Link
                      to={step.targetPath}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-medium transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      {step.targetLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="flex items-start gap-3 pt-6">
          <ListChecks className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            This walkthrough is intentionally manual. Checking a step means you have tried the workflow and understand where it lives.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

import { FormEvent, ReactNode, useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Compass,
  Flame,
  Leaf,
  ListTodo,
  Plus,
  Send,
  Settings2,
  Shield,
  Sparkles,
  Sword,
  Trash2,
  TreePine,
  UserRound,
  WandSparkles,
} from 'lucide-react';
import {
  Quest,
  QuestDay,
  QuestDifficulty,
  QuestStatus,
  ViewId,
  buildCharacterPrompt,
  getQuestProgress,
  questDays,
  traitOptions,
} from './model';
import { useWeeklyDungeon } from './useWeeklyDungeon';

const views: Array<{ id: ViewId; label: string; icon: typeof Compass }> = [
  { id: 'command', label: 'Command', icon: Compass },
  { id: 'quests', label: 'Quests', icon: ListTodo },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'character', label: 'Character', icon: UserRound },
];

const statusMeta: Record<QuestStatus, { label: string; className: string }> = {
  planned: { label: 'Planned', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  active: { label: 'Active', className: 'bg-blue-100 text-blue-700 ring-blue-200' },
  complete: { label: 'Complete', className: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
};

const difficultyMeta: Record<QuestDifficulty, { label: string; className: string }> = {
  calm: { label: 'Calm', className: 'bg-teal-100 text-teal-700' },
  standard: { label: 'Standard', className: 'bg-indigo-100 text-indigo-700' },
  boss: { label: 'Boss', className: 'bg-rose-100 text-rose-700' },
};

export function WeeklyDungeonApp() {
  const { state, dispatch } = useWeeklyDungeon();
  const [activeView, setActiveView] = useState<ViewId>('command');

  const progress = getQuestProgress(state.quests);
  const activeQuests = state.quests.filter((quest) => quest.status !== 'complete');
  const answeredReflections = state.reflections.filter((reflection) => reflection.answer);
  const nextReflection = state.reflections.find((reflection) => !reflection.answer);
  const prompt = buildCharacterPrompt(state.character);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Sword className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Weekly Dungeon</p>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Quest command center</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill icon={CalendarDays} label={state.settings.timezone} />
              <StatusPill
                icon={Bell}
                label={state.settings.remindersEnabled ? `Reminders ${state.settings.channel}` : 'Reminders off'}
              />
              <StatusPill icon={Shield} label={`${state.character.archetype} mode`} />
            </div>
          </header>

          <nav className="flex gap-2 overflow-x-auto" aria-label="Primary">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {view.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <section className="min-w-0">
          {activeView === 'command' && (
            <CommandView
              progress={progress}
              activeQuests={activeQuests}
              answeredCount={answeredReflections.length}
              nextReflection={nextReflection}
              prompt={prompt}
              state={state}
              dispatch={dispatch}
              onOpenQuests={() => setActiveView('quests')}
              onOpenJournal={() => setActiveView('journal')}
            />
          )}
          {activeView === 'quests' && <QuestView quests={state.quests} dispatch={dispatch} />}
          {activeView === 'journal' && <JournalView reflections={state.reflections} dispatch={dispatch} />}
          {activeView === 'character' && (
            <CharacterView character={state.character} settings={state.settings} prompt={prompt} dispatch={dispatch} />
          )}
        </section>

        <aside className="space-y-4">
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Week progress</p>
                <p className="mt-1 text-3xl font-semibold">{progress}%</p>
              </div>
              <TreePine className="h-8 w-8 text-emerald-600" aria-hidden="true" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </Panel>

          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Habit forest</h2>
              <Leaf className="h-5 w-5 text-teal-600" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              {state.habits.map((habit) => (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => dispatch({ type: 'toggleHabit', id: habit.id })}
                  className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-teal-300"
                >
                  <span>
                    <span className="block text-sm font-medium">{habit.name}</span>
                    <span className="text-xs text-slate-500">
                      {habit.target} · {habit.streak} day streak
                    </span>
                  </span>
                  {habit.checkedToday ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" aria-hidden="true" />
              <h2 className="text-base font-semibold">Guide prompt</h2>
            </div>
            <p className="text-sm leading-6 text-slate-600">{prompt}</p>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

type Dispatcher = ReturnType<typeof useWeeklyDungeon>['dispatch'];
type DungeonState = ReturnType<typeof useWeeklyDungeon>['state'];

function CommandView({
  progress,
  activeQuests,
  answeredCount,
  nextReflection,
  prompt,
  state,
  dispatch,
  onOpenQuests,
  onOpenJournal,
}: {
  progress: number;
  activeQuests: Quest[];
  answeredCount: number;
  nextReflection: DungeonState['reflections'][number] | undefined;
  prompt: string;
  state: DungeonState;
  dispatch: Dispatcher;
  onOpenQuests: () => void;
  onOpenJournal: () => void;
}) {
  const topQuest = activeQuests[0];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric icon={Flame} label="Quest progress" value={`${progress}%`} tone="orange" />
        <Metric icon={Clock3} label="Open quests" value={String(activeQuests.length)} tone="blue" />
        <Metric icon={Archive} label="Memory entries" value={String(answeredCount)} tone="violet" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="bg-slate-950 text-white">
          <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Current room</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                  {topQuest ? topQuest.title : 'The week is clear'}
                </h2>
              </div>
              <Compass className="h-9 w-9 text-blue-300" aria-hidden="true" />
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              {topQuest
                ? topQuest.note
                : 'Add the next meaningful quest or answer a reflection to keep the memory loop warm.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {topQuest && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'cycleQuest', id: topQuest.id })}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-blue-50"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Advance quest
                </button>
              )}
              <button
                type="button"
                onClick={onOpenQuests}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-800 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New quest
              </button>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Next question</p>
              <h2 className="mt-1 text-xl font-semibold">Reflection inbox</h2>
            </div>
            <WandSparkles className="h-6 w-6 text-violet-600" aria-hidden="true" />
          </div>
          <p className="mt-5 text-base leading-7 text-slate-700">
            {nextReflection?.question || 'No queued reflections. Create one from the journal.'}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-500">{nextReflection?.dueLabel || 'Open'}</span>
            <button
              type="button"
              onClick={onOpenJournal}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-violet-600 px-3 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Answer
            </button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">This week</h2>
            <CalendarDays className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {questDays.map((day) => {
              const count = state.quests.filter((quest) => quest.day === day).length;
              const done = state.quests.filter((quest) => quest.day === day && quest.status === 'complete').length;
              return (
                <div key={day} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-3 text-center">
                  <p className="text-xs font-medium text-slate-500">{day}</p>
                  <p className="mt-2 text-lg font-semibold">{done}/{count}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-slate-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Delivery settings</h2>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Timezone</span>
              <input
                value={state.settings.timezone}
                onChange={(event) => dispatch({ type: 'updateSettings', patch: { timezone: event.target.value } })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
              />
            </label>
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-3">
              <span className="text-sm font-medium">Reminders</span>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'updateSettings',
                    patch: { remindersEnabled: !state.settings.remindersEnabled },
                  })
                }
                className={`h-7 w-12 rounded-full p-1 transition ${
                  state.settings.remindersEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                aria-pressed={state.settings.remindersEnabled}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white transition ${
                    state.settings.remindersEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </Panel>
      </section>

      <Panel>
        <div className="flex items-start gap-3">
          <UserRound className="mt-1 h-5 w-5 text-slate-700" aria-hidden="true" />
          <p className="text-sm leading-6 text-slate-600">{prompt}</p>
        </div>
      </Panel>
    </div>
  );
}

function QuestView({ quests, dispatch }: { quests: Quest[]; dispatch: Dispatcher }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState<QuestDay>('Mon');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('standard');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    dispatch({
      type: 'addQuest',
      quest: {
        title: trimmedTitle,
        note: note.trim() || 'Define the next clear move.',
        day,
        difficulty,
        reward: difficulty === 'boss' ? 'Boss relic' : difficulty === 'calm' ? 'Rest leaf' : 'Quest token',
      },
    });
    setTitle('');
    setNote('');
  }

  const grouped = useMemo(
    () => ({
      active: quests.filter((quest) => quest.status === 'active'),
      planned: quests.filter((quest) => quest.status === 'planned'),
      complete: quests.filter((quest) => quest.status === 'complete'),
    }),
    [quests]
  );

  return (
    <div className="space-y-6">
      <Panel>
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_120px_140px_auto]" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Quest</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Name the next room"
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Move</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="One useful action"
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Day</span>
            <select
              value={day}
              onChange={(event) => setDay(event.target.value as QuestDay)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
            >
              {questDays.map((questDay) => (
                <option key={questDay}>{questDay}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Difficulty</span>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as QuestDifficulty)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
            >
              <option value="calm">Calm</option>
              <option value="standard">Standard</option>
              <option value="boss">Boss</option>
            </select>
          </label>
          <button
            type="submit"
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        </form>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <QuestColumn title="Active" quests={grouped.active} dispatch={dispatch} />
        <QuestColumn title="Planned" quests={grouped.planned} dispatch={dispatch} />
        <QuestColumn title="Complete" quests={grouped.complete} dispatch={dispatch} />
      </div>
    </div>
  );
}

function QuestColumn({ title, quests, dispatch }: { title: string; quests: Quest[]; dispatch: Dispatcher }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-500">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{quests.length}</span>
      </div>
      <div className="space-y-3">
        {quests.map((quest) => (
          <article key={quest.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{quest.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{quest.note}</p>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'deleteQuest', id: quest.id })}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-rose-600"
                aria-label={`Delete ${quest.title}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${difficultyMeta[quest.difficulty].className}`}>
                {difficultyMeta[quest.difficulty].label}
              </span>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${statusMeta[quest.status].className}`}>
                {statusMeta[quest.status].label}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{quest.day}</span>
            </div>
            <button
              type="button"
              onClick={() => dispatch({ type: 'cycleQuest', id: quest.id })}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-950 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              Advance
            </button>
          </article>
        ))}
        {!quests.length && <div className="rounded-md border border-dashed border-slate-200 p-5 text-sm text-slate-500">Empty</div>}
      </div>
    </section>
  );
}

function JournalView({
  reflections,
  dispatch,
}: {
  reflections: DungeonState['reflections'];
  dispatch: Dispatcher;
}) {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function queue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    dispatch({ type: 'queueReflection', question: trimmed });
    setQuestion('');
  }

  return (
    <div className="space-y-6">
      <Panel>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={queue}>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Queue a reflection question"
            className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-violet-500 transition focus:ring-2"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Queue
          </button>
        </form>
      </Panel>

      <div className="space-y-4">
        {reflections.map((reflection) => {
          const draft = answers[reflection.id] || '';
          return (
            <Panel key={reflection.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {reflection.source === 'meta' ? 'Meta' : 'Manual'}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      {reflection.dueLabel}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold">{reflection.question}</h2>
                </div>
                {reflection.answer && <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />}
              </div>

              {reflection.answer ? (
                <p className="mt-4 rounded-md bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  {reflection.answer}
                </p>
              ) : (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const trimmed = draft.trim();
                    if (!trimmed) return;
                    dispatch({ type: 'answerReflection', id: reflection.id, answer: trimmed });
                    setAnswers((current) => ({ ...current, [reflection.id]: '' }));
                  }}
                >
                  <textarea
                    value={draft}
                    onChange={(event) => setAnswers((current) => ({ ...current, [reflection.id]: event.target.value }))}
                    rows={4}
                    className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none ring-violet-500 transition focus:ring-2"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Save answer
                  </button>
                </form>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function CharacterView({
  character,
  settings,
  prompt,
  dispatch,
}: {
  character: DungeonState['character'];
  settings: DungeonState['settings'];
  prompt: string;
  dispatch: Dispatcher;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel>
        <div className="mb-5 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-slate-800" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Character forge</h2>
        </div>
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Name</span>
            <input
              value={character.name}
              onChange={(event) => dispatch({ type: 'updateCharacter', patch: { name: event.target.value } })}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-600">Archetype</span>
            <select
              value={character.archetype}
              onChange={(event) =>
                dispatch({
                  type: 'updateCharacter',
                  patch: { archetype: event.target.value as DungeonState['character']['archetype'] },
                })
              }
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
            >
              <option>Guide</option>
              <option>Strategist</option>
              <option>Scout</option>
              <option>Guardian</option>
            </select>
          </label>

          <div>
            <p className="text-sm font-medium text-slate-600">Traits</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {traitOptions.map((trait) => {
                const selected = character.traits.includes(trait);
                return (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => dispatch({ type: 'toggleTrait', trait })}
                    className={`h-9 rounded-md px-3 text-sm font-medium transition ${
                      selected ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {trait}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="flex items-center justify-between text-sm font-medium text-slate-600">
              Adventure tone <span>{character.intensity}</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={character.intensity}
              onChange={(event) =>
                dispatch({ type: 'updateCharacter', patch: { intensity: Number(event.target.value) } })
              }
              className="mt-3 w-full accent-blue-600"
            />
          </label>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel className="bg-slate-950 text-white">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Generated memory prompt</h2>
          </div>
          <p className="text-sm leading-7 text-slate-200">{prompt}</p>
        </Panel>
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-slate-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Question delivery</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'updateSettings', patch: { channel: 'in-app' } })}
              className={`rounded-md border px-3 py-3 text-left text-sm font-medium transition ${
                settings.channel === 'in-app'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              In-app
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'updateSettings', patch: { channel: 'push' } })}
              className={`rounded-md border px-3 py-3 text-left text-sm font-medium transition ${
                settings.channel === 'push'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              Push
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

function StatusPill({ icon: Icon, label }: { icon: typeof Compass; label: string }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-700">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Compass;
  label: string;
  value: string;
  tone: 'orange' | 'blue' | 'violet';
}) {
  const toneClass = {
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
  }[tone];

  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Panel>
  );
}

import type { DungeonTimestamp } from '@/weekly-dungeon/domain/types';

export type PracticeBlockStatus = 'not-started' | 'in-progress' | 'complete';
export type PracticeDayTheme =
  | 'code-reading'
  | 'domain-logic'
  | 'ui-states'
  | 'integration'
  | 'review'
  | 'rebuild'
  | 'taste-journal';

export interface PracticeSettings {
  activeProgramId: string;
  startDate: string;
  createdAt?: DungeonTimestamp;
  updatedAt?: DungeonTimestamp;
}

export interface PracticeSession {
  id: string;
  programId: string;
  date: string;
  weekNumber: number;
  dayTheme: PracticeDayTheme;
  completedBlockIds: string[];
  notes: string;
  evidenceLinks: string[];
  status: PracticeBlockStatus;
  createdAt?: DungeonTimestamp;
  updatedAt?: DungeonTimestamp;
}

export interface PracticeReview {
  id: string;
  programId: string;
  weekNumber: number;
  uglyCode: string;
  whyUgly: string;
  pattern: string;
  preventionRule: string;
  nextWeekFocus: string;
  status: PracticeBlockStatus;
  createdAt?: DungeonTimestamp;
  updatedAt?: DungeonTimestamp;
}

export interface PracticeBlock {
  id: string;
  minutes: number;
  title: string;
  instruction: string;
}

export interface PracticePhase {
  weekStart: number;
  weekEnd: number;
  title: string;
  goal: string;
  focus: string[];
}

export interface PracticeTemplate {
  id: string;
  title: string;
  description: string;
  body: string;
}

export interface PracticeProgramPosition {
  date: string;
  weekNumber: number;
  dayIndex: number;
  dayTheme: PracticeDayTheme;
  daysElapsed: number;
  programStarted: boolean;
  programComplete: boolean;
}

export const PRACTICE_PROGRAM = {
  id: 'michelin-coding-12-week',
  title: '12-week practice system',
  totalWeeks: 12,
  totalDays: 84,
};

export const practiceBlocks: PracticeBlock[] = [
  {
    id: 'read',
    minutes: 15,
    title: 'Read good code',
    instruction: 'Study one strong repo or library for one pattern: naming, file split, errors, tests, or simplicity.',
  },
  {
    id: 'build',
    minutes: 20,
    title: 'Build one tiny feature',
    instruction: 'Build a narrow slice with clean shape. Keep it small enough to finish and inspect.',
  },
  {
    id: 'break',
    minutes: 15,
    title: 'Break your code',
    instruction: 'Write hostile cases: empty data, duplicate action, permission failure, long text, slow network, or weird response.',
  },
  {
    id: 'refactor',
    minutes: 10,
    title: 'Refactor',
    instruction: 'Make the result shorter, clearer, more explicit, more testable, and less clever.',
  },
];

export const practiceDayThemes: Record<PracticeDayTheme, { label: string; summary: string; task: string }> = {
  'code-reading': {
    label: 'Monday: code reading',
    summary: 'Extract three patterns from serious code.',
    task: 'Read for one thing only and write pattern, why it works, and where you can use it.',
  },
  'domain-logic': {
    label: 'Tuesday: domain logic',
    summary: 'Think in rules before screens.',
    task: 'Write a decision table or state machine before implementing a pure business rule.',
  },
  'ui-states': {
    label: 'Wednesday: UI states',
    summary: 'Make one screen survive reality.',
    task: 'Cover loading, empty, error, permission, saving, success, validation, mobile, and long-content states.',
  },
  integration: {
    label: 'Thursday: integration',
    summary: 'Connect frontend, backend, and persistence safely.',
    task: 'Practice request validation, response typing, error mapping, and permission checks.',
  },
  review: {
    label: 'Friday: review',
    summary: 'Review your own diff like a hostile senior engineer.',
    task: 'Find ambiguous rules, duplicate logic, weak types, race risks, and missing tests. Fix the top three.',
  },
  rebuild: {
    label: 'Saturday: rebuild',
    summary: 'Rebuild an old feature smaller and clearer.',
    task: 'Remove duplication, rename aggressively, simplify branching, and keep behavior intact.',
  },
  'taste-journal': {
    label: 'Sunday: taste journal',
    summary: 'Turn mistakes into rules.',
    task: 'Write what was ugly, why it happened, what pattern caused it, and what rule prevents it next time.',
  },
};

export const practiceWeekPhases: PracticePhase[] = [
  {
    weekStart: 1,
    weekEnd: 2,
    title: 'Taste',
    goal: 'Read better code than you write.',
    focus: ['Naming', 'file structure', 'error handling', 'tests'],
  },
  {
    weekStart: 3,
    weekEnd: 4,
    title: 'Business logic',
    goal: 'Think in rules, not screens.',
    focus: ['Decision tables', 'state machines', 'unit tests', 'edge cases'],
  },
  {
    weekStart: 5,
    weekEnd: 6,
    title: 'UI state mastery',
    goal: 'Stop building screenshot-only screens.',
    focus: ['Ten UI states', 'mobile width', 'long Korean text', 'accessible labels'],
  },
  {
    weekStart: 7,
    weekEnd: 8,
    title: 'Testing discipline',
    goal: 'Use tests as design tools.',
    focus: ['Rule tests', 'API tests', 'hostile mocks', 'main-flow checks'],
  },
  {
    weekStart: 9,
    weekEnd: 10,
    title: 'Refactoring',
    goal: 'Make code smaller without making it mysterious.',
    focus: ['Pure functions', 'less duplication', 'clear names', 'simpler branching'],
  },
  {
    weekStart: 11,
    weekEnd: 12,
    title: 'Production thinking',
    goal: 'Build things that survive reality.',
    focus: ['Logging', 'audit trails', 'idempotency', 'transactions', 'rollback thinking'],
  },
];

export const practiceTemplates: PracticeTemplate[] = [
  {
    id: 'decision-table',
    title: 'Decision table before code',
    description: 'Use before implementing business logic.',
    body: `Feature:

| Rule | Condition | Result | Error | Test |
| --- | --- | --- | --- | --- |
| BR-01 |  |  |  |  |
| BR-02 |  |  |  |  |

Invariants:
- 

Implementation notes:
- Keep business logic separate from UI, database, and network calls.`,
  },
  {
    id: 'state-machine',
    title: 'State machine',
    description: 'Use for status-heavy features.',
    body: `Entity:

States:
- draft
- pending
- confirmed
- failed

Allowed transitions:
- draft -> pending

Forbidden transitions:
- 

Tests:
- transition success:
- transition rejected:`,
  },
  {
    id: 'ten-states',
    title: 'One screen, ten states',
    description: 'Use before calling a screen done.',
    body: `Screen:

States to verify:
- default
- loading
- empty
- error
- permission denied
- saving
- success
- validation failed
- mobile 360px
- long content`,
  },
  {
    id: 'hostile-api',
    title: 'Hostile API drill',
    description: 'Use to harden client behavior.',
    body: `Mock responses:
- 200 success
- 400 validation error
- 401 unauthenticated
- 403 forbidden
- 404 not found
- 409 conflict
- 422 business rule error
- 500 server error
- timeout
- malformed response

Expected UI behavior:
- `,
  },
  {
    id: 'diff-review',
    title: 'Diff review',
    description: 'Use after AI or you generate code.',
    body: `Review this diff brutally.

Find only problems:
- correctness bugs
- missing business rules
- weak types
- bad names
- unnecessary abstraction
- missing error states
- missing tests
- race conditions
- security issues
- maintainability problems

Rank issues by severity. Do not praise.`,
  },
  {
    id: 'feature-plate',
    title: 'Feature plate',
    description: 'Use before coding a serious feature.',
    body: `Feature:

User problem:

Taste:

Rules:

Failure:

States:

Data source of truth:

API contract:

Protection:

Tests:

Senior-review complaint:`,
  },
  {
    id: 'ai-analysis',
    title: 'Default AI analysis prompt',
    description: 'Use before asking AI to implement.',
    body: `You are not allowed to implement yet.

First, analyze this feature like a senior product-minded full-stack engineer.

Output:
1. User goal
2. Business rules
3. Invariants
4. State machine, if applicable
5. UI state matrix
6. API contract
7. Data model impact
8. Permission rules
9. Failure cases
10. Test plan
11. Implementation plan by small commits
12. Risks and tradeoffs

Rules:
- Do not assume missing API fields.
- Do not add libraries unless necessary.
- Prefer existing project patterns.
- Keep the solution boring and maintainable.
- Point out unclear requirements instead of guessing silently.`,
  },
  {
    id: 'hostile-review',
    title: 'Hostile senior review prompt',
    description: 'Use after implementation.',
    body: `Review this diff as a hostile senior engineer.

Find only problems:
- correctness bugs
- missing business rules
- weak types
- bad names
- unnecessary abstraction
- missing error states
- missing tests
- race conditions
- security issues
- maintainability problems

Rank issues by severity.`,
  },
];

const dayThemeOrder: PracticeDayTheme[] = [
  'code-reading',
  'domain-logic',
  'ui-states',
  'integration',
  'review',
  'rebuild',
  'taste-journal',
];

export function formatPracticeDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKeyToUtcDay(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function getPracticeSessionId(programId: string, dateKey: string) {
  return `${programId}_${dateKey}`;
}

export function getPracticeReviewId(programId: string, weekNumber: number) {
  return `${programId}_week-${weekNumber}`;
}

export function getPracticeDayTheme(dayIndex: number): PracticeDayTheme {
  const normalizedIndex = ((dayIndex % 7) + 7) % 7;
  return dayThemeOrder[normalizedIndex];
}

export function getPracticeProgramPosition(startDate: string, date = new Date()): PracticeProgramPosition {
  const currentDate = formatPracticeDateKey(date);
  const daysElapsed = Math.floor(
    (parseDateKeyToUtcDay(currentDate) - parseDateKeyToUtcDay(startDate)) / 86_400_000
  );
  const programStarted = daysElapsed >= 0;
  const programComplete = daysElapsed >= PRACTICE_PROGRAM.totalDays;
  const boundedDay = Math.min(Math.max(daysElapsed, 0), PRACTICE_PROGRAM.totalDays - 1);
  const weekNumber = Math.floor(boundedDay / 7) + 1;
  const dayIndex = boundedDay % 7;

  return {
    date: currentDate,
    weekNumber,
    dayIndex,
    dayTheme: getPracticeDayTheme(dayIndex),
    daysElapsed,
    programStarted,
    programComplete,
  };
}

export function getPracticeProgress(completedBlockIds: string[]) {
  const validBlockIds = new Set(practiceBlocks.map((block) => block.id));
  const completedCount = new Set(completedBlockIds.filter((blockId) => validBlockIds.has(blockId))).size;
  const totalCount = practiceBlocks.length;

  return {
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    complete: completedCount === totalCount,
  };
}

export function getSessionStatus(completedBlockIds: string[]): PracticeBlockStatus {
  const progress = getPracticeProgress(completedBlockIds);
  if (progress.complete) return 'complete';
  if (progress.completedCount > 0) return 'in-progress';
  return 'not-started';
}

export function getCurrentPracticePhase(weekNumber: number) {
  return practiceWeekPhases.find((phase) => weekNumber >= phase.weekStart && weekNumber <= phase.weekEnd);
}

import type { Habit, HabitLog, Quest, ReflectionAnswer } from '@/weekly-dungeon/domain/types';
import { practiceDayThemes, type PracticeReview, type PracticeSession } from '@/weekly-dungeon/practice/model';

export type HistoryCategory = 'quests' | 'habits' | 'reflections' | 'practice';
export type HistoryFilter = 'all' | HistoryCategory;

export type HistoryKind =
  | 'quest_completed'
  | 'habit_checked'
  | 'reflection_answered'
  | 'practice_session_completed'
  | 'practice_review_completed';

export interface HistoryItem {
  id: string;
  kind: HistoryKind;
  category: HistoryCategory;
  occurredAt: Date | null;
  sortTime: number;
  title: string;
  summary: string;
  href: string;
  badge: string;
}

export interface HistorySourceData {
  quests: Quest[];
  habits: Habit[];
  habitLogs: HabitLog[];
  reflectionAnswers: ReflectionAnswer[];
  practiceSessions: PracticeSession[];
  practiceReviews: PracticeReview[];
}

export interface HistoryGroup {
  key: string;
  label: string;
  items: HistoryItem[];
}

export const historyFilters: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'quests', label: 'Quests' },
  { id: 'habits', label: 'Habits' },
  { id: 'reflections', label: 'Reflections' },
  { id: 'practice', label: 'Practice' },
];

export function normalizeHistoryDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'object') {
    if ('toDate' in value && typeof value.toDate === 'function') {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }

    if ('toMillis' in value && typeof value.toMillis === 'function') {
      const date = new Date(value.toMillis());
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const localDate = new Date(Number(year), Number(month) - 1, Number(day), 12);
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function formatHistoryDateKey(date: Date | null) {
  if (!date) return 'unknown';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function formatHistoryDateLabel(date: Date | null) {
  if (!date) return 'Unknown date';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildHistoryItems(data: HistorySourceData): HistoryItem[] {
  const habitsById = new Map(data.habits.map((habit) => [habit.id, habit]));

  const questItems = data.quests
    .filter((quest) => quest.status === 'complete')
    .map((quest): HistoryItem | null => {
      const occurredAt = normalizeHistoryDate(quest.completedAt);
      if (!occurredAt) return null;

      return {
        id: `quest:${quest.id}`,
        kind: 'quest_completed',
        category: 'quests',
        occurredAt,
        sortTime: occurredAt.getTime(),
        title: quest.title || 'Quest completed',
        summary: quest.note || quest.reward || `Completed ${quest.difficulty} quest for ${quest.day}.`,
        href: '/quests',
        badge: 'Quest',
      };
    })
    .filter((item): item is HistoryItem => Boolean(item));

  const habitItems = data.habitLogs
    .filter((log) => log.checked)
    .map((log): HistoryItem => {
      const habit = habitsById.get(log.habitId);
      const occurredAt = normalizeHistoryDate(log.date) || normalizeHistoryDate(log.updatedAt) || normalizeHistoryDate(log.createdAt);

      return {
        id: `habit:${log.id}`,
        kind: 'habit_checked',
        category: 'habits',
        occurredAt,
        sortTime: occurredAt?.getTime() || 0,
        title: `${habit?.name || 'Habit'} checked`,
        summary: log.note || habit?.target || 'Habit check-in completed.',
        href: '/habits',
        badge: 'Habit',
      };
    });

  const reflectionItems = data.reflectionAnswers.map((answer): HistoryItem => {
    const occurredAt = normalizeHistoryDate(answer.answeredAt) || normalizeHistoryDate(answer.updatedAt) || normalizeHistoryDate(answer.createdAt);

    return {
      id: `reflection:${answer.id}`,
      kind: 'reflection_answered',
      category: 'reflections',
      occurredAt,
      sortTime: occurredAt?.getTime() || 0,
      title: answer.question || 'Reflection answered',
      summary: answer.answer || 'Saved a reflection answer.',
      href: '/reflections',
      badge: 'Reflection',
    };
  });

  const practiceSessionItems = data.practiceSessions
    .filter((session) => session.status === 'complete')
    .map((session): HistoryItem => {
      const occurredAt = normalizeHistoryDate(session.updatedAt) || normalizeHistoryDate(session.date) || normalizeHistoryDate(session.createdAt);
      const theme = practiceDayThemes[session.dayTheme];

      return {
        id: `practice-session:${session.id}`,
        kind: 'practice_session_completed',
        category: 'practice',
        occurredAt,
        sortTime: occurredAt?.getTime() || 0,
        title: 'Practice session completed',
        summary: `Week ${session.weekNumber}: ${theme?.summary || session.dayTheme}`,
        href: '/practice',
        badge: 'Practice',
      };
    });

  const practiceReviewItems = data.practiceReviews
    .filter((review) => review.status === 'complete')
    .map((review): HistoryItem => {
      const occurredAt = normalizeHistoryDate(review.updatedAt) || normalizeHistoryDate(review.createdAt);

      return {
        id: `practice-review:${review.id}`,
        kind: 'practice_review_completed',
        category: 'practice',
        occurredAt,
        sortTime: occurredAt?.getTime() || 0,
        title: `Week ${review.weekNumber} review completed`,
        summary: review.nextWeekFocus || review.preventionRule || 'Weekly practice review saved.',
        href: '/practice',
        badge: 'Review',
      };
    });

  return [
    ...questItems,
    ...habitItems,
    ...reflectionItems,
    ...practiceSessionItems,
    ...practiceReviewItems,
  ].sort((a, b) => {
    const timeDelta = b.sortTime - a.sortTime;
    if (timeDelta !== 0) return timeDelta;
    return a.id.localeCompare(b.id);
  });
}

export function filterHistoryItems(items: HistoryItem[], filter: HistoryFilter) {
  if (filter === 'all') return items;
  return items.filter((item) => item.category === filter);
}

export function groupHistoryItemsByDate(items: HistoryItem[]): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>();

  items.forEach((item) => {
    const key = formatHistoryDateKey(item.occurredAt);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      return;
    }

    groups.set(key, {
      key,
      label: formatHistoryDateLabel(item.occurredAt),
      items: [item],
    });
  });

  return Array.from(groups.values());
}

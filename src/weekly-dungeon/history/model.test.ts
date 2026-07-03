import { describe, expect, it } from 'vitest';
import type { Habit, HabitLog, Quest, ReflectionAnswer } from '@/weekly-dungeon/domain/types';
import type { PracticeReview, PracticeSession } from '@/weekly-dungeon/practice/model';
import {
  buildHistoryItems,
  filterHistoryItems,
  groupHistoryItemsByDate,
  normalizeHistoryDate,
} from './model';

function quest(overrides: Partial<Quest>): Quest {
  return {
    id: 'quest-1',
    title: 'Ship history',
    note: '',
    weekKey: '2026-07-06',
    day: 'monday',
    status: 'complete',
    difficulty: 'standard',
    reward: '',
    sortOrder: 1,
    completedAt: '2026-07-07T09:00:00.000Z',
    ...overrides,
  };
}

function habitLog(overrides: Partial<HabitLog>): HabitLog {
  return {
    id: 'habit-1_2026-07-06',
    habitId: 'habit-1',
    date: '2026-07-06',
    checked: true,
    note: '',
    ...overrides,
  };
}

function reflectionAnswer(overrides: Partial<ReflectionAnswer>): ReflectionAnswer {
  return {
    id: 'answer-1',
    reflectionId: 'reflection-1',
    deliveryId: null,
    question: 'What changed?',
    answer: 'I finished the timeline.',
    answeredAt: '2026-07-08T11:00:00.000Z',
    ...overrides,
  };
}

function practiceSession(overrides: Partial<PracticeSession>): PracticeSession {
  return {
    id: 'michelin-coding-12-week_2026-07-09',
    programId: 'michelin-coding-12-week',
    date: '2026-07-09',
    weekNumber: 1,
    dayTheme: 'integration',
    completedBlockIds: ['read', 'build', 'break', 'refactor'],
    notes: '',
    evidenceLinks: [],
    status: 'complete',
    updatedAt: '2026-07-09T12:00:00.000Z',
    ...overrides,
  };
}

function practiceReview(overrides: Partial<PracticeReview>): PracticeReview {
  return {
    id: 'michelin-coding-12-week_week-1',
    programId: 'michelin-coding-12-week',
    weekNumber: 1,
    uglyCode: 'Too much branching',
    whyUgly: 'Unclear state',
    pattern: 'State machine missing',
    preventionRule: 'Write transitions first',
    nextWeekFocus: 'Keep status explicit',
    status: 'complete',
    updatedAt: '2026-07-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('history model', () => {
  it('combines source collections into one newest-first timeline', () => {
    const items = buildHistoryItems({
      quests: [quest({ completedAt: '2026-07-07T09:00:00.000Z' })],
      habits: [{ id: 'habit-1', name: 'Morning check-in', target: 'Before work', description: '', cadence: 'daily', status: 'active' }],
      habitLogs: [habitLog({ date: '2026-07-06' })],
      reflectionAnswers: [reflectionAnswer({ answeredAt: '2026-07-08T11:00:00.000Z' })],
      practiceSessions: [practiceSession({ updatedAt: '2026-07-09T12:00:00.000Z' })],
      practiceReviews: [practiceReview({ updatedAt: '2026-07-10T12:00:00.000Z' })],
    });

    expect(items.map((item) => item.kind)).toEqual([
      'practice_review_completed',
      'practice_session_completed',
      'reflection_answered',
      'quest_completed',
      'habit_checked',
    ]);
  });

  it('filters out incomplete or unchecked source records', () => {
    const items = buildHistoryItems({
      quests: [quest({ status: 'active', completedAt: null })],
      habits: [],
      habitLogs: [habitLog({ checked: false })],
      reflectionAnswers: [],
      practiceSessions: [practiceSession({ status: 'in-progress' })],
      practiceReviews: [practiceReview({ status: 'not-started' })],
    });

    expect(items).toEqual([]);
  });

  it('falls back gracefully when habit metadata or timestamps are missing', () => {
    const items = buildHistoryItems({
      quests: [],
      habits: [],
      habitLogs: [habitLog({ id: 'orphan-log', habitId: 'deleted-habit', date: '', updatedAt: null })],
      reflectionAnswers: [],
      practiceSessions: [],
      practiceReviews: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Habit checked',
      summary: 'Habit check-in completed.',
      sortTime: 0,
    });
  });

  it('filters by category', () => {
    const items = buildHistoryItems({
      quests: [quest({})],
      habits: [],
      habitLogs: [],
      reflectionAnswers: [reflectionAnswer({})],
      practiceSessions: [],
      practiceReviews: [],
    });

    expect(filterHistoryItems(items, 'quests').map((item) => item.category)).toEqual(['quests']);
    expect(filterHistoryItems(items, 'all')).toHaveLength(2);
  });

  it('groups items by local date and keeps unknown dates separate', () => {
    const dated = reflectionAnswer({ id: 'dated', answeredAt: '2026-07-08T11:00:00.000Z' });
    const unknown = reflectionAnswer({ id: 'unknown', answeredAt: '' });
    const items = buildHistoryItems({
      quests: [],
      habits: [],
      habitLogs: [],
      reflectionAnswers: [dated, unknown],
      practiceSessions: [],
      practiceReviews: [],
    });

    const groups = groupHistoryItemsByDate(items);

    expect(groups.map((group) => group.key)).toContain('unknown');
    expect(groups.find((group) => group.key === 'unknown')?.items[0].id).toBe('reflection:unknown');
  });

  it('normalizes Firestore-like timestamp values', () => {
    const date = normalizeHistoryDate({ toDate: () => new Date('2026-07-08T00:00:00.000Z') });

    expect(date?.toISOString()).toBe('2026-07-08T00:00:00.000Z');
  });
});

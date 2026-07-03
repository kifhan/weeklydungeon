import { describe, expect, it } from 'vitest';
import {
  getPracticeDayTheme,
  getPracticeProgramPosition,
  getPracticeProgress,
  getPracticeReviewId,
  getPracticeSessionId,
  getSessionStatus,
  PRACTICE_PROGRAM,
} from './model';

describe('practice model', () => {
  it('builds deterministic session and review ids', () => {
    expect(getPracticeSessionId(PRACTICE_PROGRAM.id, '2026-01-05')).toBe(
      'michelin-coding-12-week_2026-01-05'
    );
    expect(getPracticeReviewId(PRACTICE_PROGRAM.id, 4)).toBe('michelin-coding-12-week_week-4');
  });

  it('derives week, day, and theme from the start date', () => {
    const firstDay = getPracticeProgramPosition('2026-01-05', new Date(2026, 0, 5, 12));
    const nextWeek = getPracticeProgramPosition('2026-01-05', new Date(2026, 0, 13, 12));

    expect(firstDay).toMatchObject({
      date: '2026-01-05',
      weekNumber: 1,
      dayIndex: 0,
      dayTheme: 'code-reading',
      programStarted: true,
      programComplete: false,
    });
    expect(nextWeek).toMatchObject({
      date: '2026-01-13',
      weekNumber: 2,
      dayIndex: 1,
      dayTheme: 'domain-logic',
    });
  });

  it('bounds future and completed program positions', () => {
    const beforeStart = getPracticeProgramPosition('2026-01-10', new Date(2026, 0, 9, 12));
    const afterProgram = getPracticeProgramPosition('2026-01-05', new Date(2026, 3, 10, 12));

    expect(beforeStart).toMatchObject({
      weekNumber: 1,
      dayIndex: 0,
      programStarted: false,
      programComplete: false,
    });
    expect(afterProgram).toMatchObject({
      weekNumber: 12,
      dayIndex: 6,
      programStarted: true,
      programComplete: true,
    });
  });

  it('normalizes day themes', () => {
    expect(getPracticeDayTheme(0)).toBe('code-reading');
    expect(getPracticeDayTheme(6)).toBe('taste-journal');
    expect(getPracticeDayTheme(7)).toBe('code-reading');
    expect(getPracticeDayTheme(-1)).toBe('taste-journal');
  });

  it('calculates progress from valid unique block ids only', () => {
    expect(getPracticeProgress(['read', 'read', 'break', 'unknown'])).toEqual({
      completedCount: 2,
      totalCount: 4,
      percent: 50,
      complete: false,
    });
    expect(getPracticeProgress(['read', 'build', 'break', 'refactor']).complete).toBe(true);
  });

  it('derives session status from completed blocks', () => {
    expect(getSessionStatus([])).toBe('not-started');
    expect(getSessionStatus(['read'])).toBe('in-progress');
    expect(getSessionStatus(['read', 'build', 'break', 'refactor'])).toBe('complete');
  });
});

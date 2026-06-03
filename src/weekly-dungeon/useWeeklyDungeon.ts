import { useEffect, useMemo, useReducer } from 'react';
import {
  CharacterProfile,
  DungeonSettings,
  DungeonState,
  Habit,
  initialDungeonState,
  Quest,
  Reflection,
  getNextQuestStatus,
} from './model';

const STORAGE_KEY = 'weekly-dungeon:v2';

type Action =
  | { type: 'addQuest'; quest: Omit<Quest, 'id' | 'status'> }
  | { type: 'cycleQuest'; id: string }
  | { type: 'deleteQuest'; id: string }
  | { type: 'toggleHabit'; id: string }
  | { type: 'answerReflection'; id: string; answer: string }
  | { type: 'queueReflection'; question: string }
  | { type: 'updateCharacter'; patch: Partial<CharacterProfile> }
  | { type: 'toggleTrait'; trait: string }
  | { type: 'updateSettings'; patch: Partial<DungeonSettings> };

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function reducer(state: DungeonState, action: Action): DungeonState {
  switch (action.type) {
    case 'addQuest':
      return {
        ...state,
        quests: [
          {
            ...action.quest,
            id: makeId('q'),
            status: 'planned',
          },
          ...state.quests,
        ],
      };
    case 'cycleQuest':
      return {
        ...state,
        quests: state.quests.map((quest) =>
          quest.id === action.id ? { ...quest, status: getNextQuestStatus(quest.status) } : quest
        ),
      };
    case 'deleteQuest':
      return {
        ...state,
        quests: state.quests.filter((quest) => quest.id !== action.id),
      };
    case 'toggleHabit':
      return {
        ...state,
        habits: state.habits.map((habit) => {
          if (habit.id !== action.id) return habit;
          const checkedToday = !habit.checkedToday;
          return {
            ...habit,
            checkedToday,
            streak: Math.max(0, habit.streak + (checkedToday ? 1 : -1)),
          };
        }),
      };
    case 'answerReflection':
      return {
        ...state,
        reflections: state.reflections.map((reflection) =>
          reflection.id === action.id
            ? {
                ...reflection,
                answer: action.answer,
                answeredAt: new Date().toISOString(),
              }
            : reflection
        ),
      };
    case 'queueReflection':
      return {
        ...state,
        reflections: [
          {
            id: makeId('r'),
            question: action.question,
            dueLabel: 'Next open window',
            source: 'manual',
          },
          ...state.reflections,
        ],
      };
    case 'updateCharacter':
      return {
        ...state,
        character: {
          ...state.character,
          ...action.patch,
        },
      };
    case 'toggleTrait': {
      const selected = state.character.traits.includes(action.trait);
      const traits = selected
        ? state.character.traits.filter((trait) => trait !== action.trait)
        : [...state.character.traits, action.trait].slice(-4);
      return {
        ...state,
        character: {
          ...state.character,
          traits,
        },
      };
    }
    case 'updateSettings':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.patch,
        },
      };
    default:
      return state;
  }
}

function readStoredState(): DungeonState {
  if (typeof window === 'undefined') return initialDungeonState;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialDungeonState;
    const parsed = JSON.parse(stored) as Partial<DungeonState>;
    return {
      ...initialDungeonState,
      ...parsed,
      character: { ...initialDungeonState.character, ...parsed.character },
      settings: { ...initialDungeonState.settings, ...parsed.settings },
      quests: Array.isArray(parsed.quests) ? (parsed.quests as Quest[]) : initialDungeonState.quests,
      habits: Array.isArray(parsed.habits) ? (parsed.habits as Habit[]) : initialDungeonState.habits,
      reflections: Array.isArray(parsed.reflections)
        ? (parsed.reflections as Reflection[])
        : initialDungeonState.reflections,
    };
  } catch {
    return initialDungeonState;
  }
}

export function useWeeklyDungeon() {
  const [state, dispatch] = useReducer(reducer, undefined, readStoredState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return useMemo(() => ({ state, dispatch }), [state]);
}

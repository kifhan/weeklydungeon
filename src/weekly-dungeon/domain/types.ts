import type { Timestamp } from 'firebase/firestore';
import { formatWeekKey } from '@/utils/date';

export type DungeonTimestamp = Timestamp | Date | string | null;

export type QuestStatus = 'planned' | 'active' | 'complete';
export type QuestDifficulty = 'calm' | 'standard' | 'boss';
export type QuestDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type HabitStatus = 'active' | 'archived';
export type HabitCadence = 'daily' | 'weekly';

export type ReflectionSource = 'manual' | 'meta' | 'scheduled';
export type ReflectionStatus = 'queued' | 'answered' | 'archived';
export type ReflectionScheduleStatus = 'active' | 'paused' | 'archived';
export type ReflectionDeliveryStatus = 'pending' | 'sent' | 'acked' | 'answered' | 'failed';

export type NotificationChannel = 'in-app' | 'push' | 'email';
export type CharacterArchetype = 'Guide' | 'Strategist' | 'Scout' | 'Guardian';

export interface DungeonEntity {
  id: string;
  createdAt?: DungeonTimestamp;
  updatedAt?: DungeonTimestamp;
}

export interface Quest extends DungeonEntity {
  title: string;
  note: string;
  weekKey: string;
  day: QuestDay;
  status: QuestStatus;
  difficulty: QuestDifficulty;
  reward: string;
  sortOrder: number;
  completedAt?: DungeonTimestamp;
}

export interface Habit extends DungeonEntity {
  name: string;
  target: string;
  description: string;
  cadence: HabitCadence;
  status: HabitStatus;
}

export interface HabitLog extends DungeonEntity {
  habitId: string;
  date: string;
  checked: boolean;
  note: string;
}

export interface Reflection extends DungeonEntity {
  question: string;
  source: ReflectionSource;
  status: ReflectionStatus;
  deliveryId?: string | null;
  answerId?: string | null;
  dueAt?: DungeonTimestamp;
  answeredAt?: DungeonTimestamp;
}

export interface ReflectionSchedule extends DungeonEntity {
  prompt: string;
  cadence: string;
  timezone: string;
  channel: NotificationChannel;
  status: ReflectionScheduleStatus;
  nextRunAt?: DungeonTimestamp;
  lastRunAt?: DungeonTimestamp;
}

export interface ReflectionDelivery extends DungeonEntity {
  reflectionId: string;
  scheduleId?: string | null;
  question: string;
  channel: NotificationChannel;
  status: ReflectionDeliveryStatus;
  scheduledFor?: DungeonTimestamp;
  sentAt?: DungeonTimestamp;
}

export interface ReflectionAnswer extends DungeonEntity {
  reflectionId?: string | null;
  deliveryId?: string | null;
  question: string;
  answer: string;
  answeredAt: string;
}

export interface MemoryContext extends DungeonEntity {
  summary: string;
  sourceAnswerIds: string[];
}

export interface CharacterProfile {
  guideName: string;
  guideArchetype: CharacterArchetype;
  guideTraits: string[];
  guideTone: string;
  guidePrompt: string;
  adventureIntensity: number;
}

export interface DungeonProfile extends CharacterProfile {
  timezone: string;
  notificationChannel: NotificationChannel;
  remindersEnabled: boolean;
}

export interface DungeonData {
  quests: Quest[];
  habits: Habit[];
  habitLogs: HabitLog[];
  reflections: Reflection[];
  reflectionDeliveries: ReflectionDelivery[];
  reflectionAnswers: ReflectionAnswer[];
  memoryContexts: MemoryContext[];
  profile: DungeonProfile;
}

export const questDays: QuestDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const defaultDungeonProfile: DungeonProfile = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
  notificationChannel: 'in-app',
  remindersEnabled: true,
  guideName: 'Dungeon Guide',
  guideArchetype: 'Strategist',
  guideTraits: ['Grounded', 'Direct', 'Warm'],
  guideTone: 'practical first, lightly RPG-flavored',
  guidePrompt:
    'Convert plans into quests, surface one next action, and ask one sharp reflection question when the user is stuck.',
  adventureIntensity: 62,
};

export const emptyDungeonData: DungeonData = {
  quests: [],
  habits: [],
  habitLogs: [],
  reflections: [],
  reflectionDeliveries: [],
  reflectionAnswers: [],
  memoryContexts: [],
  profile: defaultDungeonProfile,
};

export function currentWeekKey(date = new Date()) {
  return formatWeekKey(date);
}

export function currentQuestDay(date = new Date()): QuestDay {
  const day = date.getDay();
  return questDays[day === 0 ? 6 : day - 1];
}

export function buildCharacterPrompt(profile: CharacterProfile) {
  return [
    `You are ${profile.guideName}, a ${profile.guideArchetype.toLowerCase()} for Weekly Dungeon.`,
    `Speak with these traits: ${profile.guideTraits.join(', ') || 'grounded, direct, warm'}.`,
    `Use a ${profile.adventureIntensity}/100 adventure tone: ${profile.guideTone}.`,
    profile.guidePrompt,
  ].join(' ');
}

export function getQuestProgress(quests: Quest[]) {
  if (!quests.length) return 0;
  return Math.round((quests.filter((quest) => quest.status === 'complete').length / quests.length) * 100);
}

export function nextQuestStatus(status: QuestStatus): QuestStatus {
  if (status === 'planned') return 'active';
  if (status === 'active') return 'complete';
  return 'planned';
}

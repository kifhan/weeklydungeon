export type ViewId = 'command' | 'quests' | 'journal' | 'character';

export type QuestStatus = 'planned' | 'active' | 'complete';
export type QuestDifficulty = 'calm' | 'standard' | 'boss';
export type QuestDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface Quest {
  id: string;
  title: string;
  note: string;
  day: QuestDay;
  status: QuestStatus;
  difficulty: QuestDifficulty;
  reward: string;
}

export interface Habit {
  id: string;
  name: string;
  target: string;
  streak: number;
  checkedToday: boolean;
}

export interface Reflection {
  id: string;
  question: string;
  dueLabel: string;
  source: 'manual' | 'meta';
  answer?: string;
  answeredAt?: string;
}

export interface CharacterProfile {
  name: string;
  archetype: 'Guide' | 'Strategist' | 'Scout' | 'Guardian';
  traits: string[];
  intensity: number;
}

export interface DungeonSettings {
  timezone: string;
  remindersEnabled: boolean;
  channel: 'in-app' | 'push';
}

export interface DungeonState {
  quests: Quest[];
  habits: Habit[];
  reflections: Reflection[];
  character: CharacterProfile;
  settings: DungeonSettings;
}

export const questDays: QuestDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const traitOptions = [
  'Grounded',
  'Adventurous',
  'Direct',
  'Patient',
  'Analytical',
  'Warm',
  'Focused',
  'Playful',
];

export const initialDungeonState: DungeonState = {
  quests: [
    {
      id: 'q-1',
      title: 'Clear the weekly planning room',
      note: 'Pick the three outcomes that make this week count.',
      day: 'Mon',
      status: 'active',
      difficulty: 'standard',
      reward: 'Map fragment',
    },
    {
      id: 'q-2',
      title: 'Protect two focus blocks',
      note: 'Reserve ninety quiet minutes and defend them.',
      day: 'Tue',
      status: 'planned',
      difficulty: 'boss',
      reward: 'Focus crystal',
    },
    {
      id: 'q-3',
      title: 'Send the difficult message',
      note: 'Draft, trim, send, and log the result.',
      day: 'Wed',
      status: 'planned',
      difficulty: 'standard',
      reward: 'Courage mark',
    },
    {
      id: 'q-4',
      title: 'Close the open loop',
      note: 'Finish one lingering task instead of opening a new one.',
      day: 'Fri',
      status: 'complete',
      difficulty: 'calm',
      reward: 'Green torch',
    },
  ],
  habits: [
    { id: 'h-1', name: 'Morning check-in', target: 'Before work', streak: 5, checkedToday: true },
    { id: 'h-2', name: 'Move outside', target: '20 minutes', streak: 2, checkedToday: false },
    { id: 'h-3', name: 'Shutdown ritual', target: 'After final task', streak: 4, checkedToday: false },
  ],
  reflections: [
    {
      id: 'r-1',
      question: 'What small decision would make the rest of this week lighter?',
      dueLabel: 'Today 19:00',
      source: 'meta',
    },
    {
      id: 'r-2',
      question: 'Which quest is secretly too large, and what is the first smaller move?',
      dueLabel: 'Thu 09:30',
      source: 'manual',
    },
  ],
  character: {
    name: 'Dungeon Guide',
    archetype: 'Strategist',
    traits: ['Grounded', 'Direct', 'Warm'],
    intensity: 62,
  },
  settings: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
    remindersEnabled: true,
    channel: 'in-app',
  },
};

export function buildCharacterPrompt(profile: CharacterProfile) {
  return [
    `You are ${profile.name}, a ${profile.archetype.toLowerCase()} for Weekly Dungeon.`,
    `Speak with these traits: ${profile.traits.join(', ') || 'grounded, direct, warm'}.`,
    `Use a ${profile.intensity}/100 adventure tone: practical first, lightly RPG-flavored.`,
    'Convert plans into quests, surface one next action, and ask one sharp reflection question when the user is stuck.',
  ].join(' ');
}

export function getQuestProgress(quests: Quest[]) {
  if (!quests.length) return 0;
  return Math.round((quests.filter((quest) => quest.status === 'complete').length / quests.length) * 100);
}

export function getNextQuestStatus(status: QuestStatus): QuestStatus {
  if (status === 'planned') return 'active';
  if (status === 'active') return 'complete';
  return 'planned';
}

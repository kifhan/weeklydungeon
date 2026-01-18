export type BlockType = "Focus" | "Recovery" | "Flow" | "Admin" | "Social";
export type EnergyLevel = "High" | "Moderate" | "Low" | "Recharge";
export type Emotion = "Happy" | "Calm" | "Anxious" | "Tired" | "Excited" | "Frustrated";
export type HabitState = "Chilled" | "Vibing" | "Scattered" | "Sleepy" | "Energized";

export interface DungeonLog {
  id: string;
  blockId: string;
  blockName: string;
  day: string;
  completedAt: string;
  energyLevel: number;
  blockType: BlockType;
  createdAt?: any; // Firestore Timestamp | string
}

export interface HabitEntry {
  id: string;
  date: string;
  time: string;
  emotion: Emotion;
  note: string;
  aiResponse?: string;
  createdAt?: any; // Firestore Timestamp | string
  updatedAt?: any; // Firestore Timestamp | string
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  type: "Daily" | "Main";
  reward?: string; // e.g. "New Tree"
}

export interface Tree {
  id: string;
  type: "oak" | "pine" | "cherry" | "shrub";
  stage: "seed" | "sprout" | "sapling" | "mature";
  plantedAt: string;
  linkedQuestId?: string;
  linkedHabitId?: string;
}

export interface ForestState {
  trees: Tree[];
}

export type CharacterTrait = 
  | "Stoic" | "Cheerleader" | "Mystical" | "Tough Love" 
  | "Analytical" | "Poetic" | "Chaotic Good" | "Zen Master";

export interface CharacterProfile {
  name: string;
  traits: CharacterTrait[];
  generatedPrompt: string;
  customInstructions?: string;
  updatedAt?: any;
}

// Legacy types kept for compatibility during migration if needed, or we can remove them if we are sure.
// The plan implies a pivot, so we might replace ScheduleBlock with Quest usage.
// But DayData/WeekData might still be used or refactored.
// I will keep them for now but maybe mark as deprecated or just leave them.
// Actually, the plan says "Refactor the complex Weekly Schedule into a focused 'Daily Quest' system."
// I'll leave ScheduleBlock for now to avoid breaking too many things at once, but I'll add Quest.

export interface ScheduleBlock {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  emoji: string;
  note: string;
  done: boolean;
  blockType: BlockType;
  energyLevel: EnergyLevel;
  reflectionNote?: string;
}

export interface DayData {
  title: string;
  theme: string;
  blocks: ScheduleBlock[];
}

export interface WeekData {
  [key: string]: DayData;
}

// Optional: Document representation when stored as a single doc
export interface WeekDoc {
  weekKey: string; // e.g., 2025-09-29
  weekStartDate: string; // ISO
  data: WeekData;
  updatedAt?: any; // Firestore Timestamp | string
}

// ========== Life Question Bot types ==========
export type QuestionStatus = "DRAFT" | "PUBLISH" | "DONE" | "ARCHIVE";
export type ReservationType = "FIXED" | "RECURRING" | "AI_GENERATED";

export interface Question {
  id: string;
  content: string;
  status: QuestionStatus;
  createdAt?: any;
  updatedAt?: any;
}

export interface MetaQuestion {
  id: string;
  basePrompt: string;
  topicTags: string[];
  status: "DRAFT" | "PUBLISH" | "ARCHIVE";
  createdAt?: any;
  updatedAt?: any;
}

export interface QuestionReservation {
  id: string;
  questionId?: string | null;
  metaQuestionId?: string | null;
  type: ReservationType;
  targetTime?: string | null;
  cronExpression?: string | null;
  aiSchedulePrompt?: string | null;
  isProcessed?: boolean;
  nextRunAt?: any; // Timestamp for scheduler
  lastRunAt?: any; // Timestamp for scheduler
  timezone?: string; // Snapshot at creation
  createdAt?: any;
  updatedAt?: any;
}

export interface Delivery {
  id: string;
  reservationId: string;
  questionText: string;
  channel: "FCM" | "EMAIL" | "IN_APP";
  status: "SENT" | "FAILED" | "ACKED";
  scheduledFor: string; // ISO timestamp
  sentAt?: any; // Timestamp
  createdAt?: any;
}

export interface NotificationToken {
  token: string;
  platform: "web" | "ios" | "android";
  createdAt?: any;
  lastSeenAt?: any;
}

export interface Answer {
  id: string;
  deliveryId?: string | null;
  reservationId?: string | null;
  sourceQuestionText: string;
  answerContent: string;
  answeredAt: string;
  createdAt?: any;
}

export interface QuestionContext {
  id: string;
  answerId: string;
  summary: string;
  embedding?: number[] | null; // Firestore Vector type
  createdAt?: any;
}

export interface LifeQuestionSettings {
  timezone: string;
  notificationChannel?: string;
  updatedAt?: any;
}

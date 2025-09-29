
export type BlockType = "Focus" | "Recovery" | "Flow" | "Admin" | "Social";
export type EnergyLevel = "High" | "Moderate" | "Low" | "Recharge";
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
  state: HabitState;
  statusMemo: string;
  trigger: string;
  action: string;
  remarks?: string;
  createdAt?: any; // Firestore Timestamp | string
  updatedAt?: any; // Firestore Timestamp | string
}

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

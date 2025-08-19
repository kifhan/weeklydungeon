
export type BlockType = "Focus" | "Recovery" | "Flow" | "Admin" | "Social";
export type EnergyLevel = "High" | "Moderate" | "Low" | "Recharge";
export type HabitState = "Clear" | "Focused" | "Scattered" | "Foggy" | "Sharp";

export interface DungeonLog {
  id: string;
  blockId: string;
  blockName: string;
  day: string;
  completedAt: string;
  energyLevel: number;
  blockType: BlockType;
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

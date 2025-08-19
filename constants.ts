
import { WeekData, HabitEntry } from './types';

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const defaultWeekData: WeekData = {
  monday: {
    title: "언어 전투장",
    theme: "⚔️ Language Combat Arena",
    blocks: [
      { id: "mon-1", name: "Morning Ritual", startTime: "07:00", endTime: "08:00", emoji: "🌅", note: "Meditation and planning", done: false, blockType: "Recovery", energyLevel: "Moderate" },
      { id: "mon-2", name: "Deep Work Quest", startTime: "09:00", endTime: "11:00", emoji: "🧠", note: "Focus on main project", done: false, blockType: "Focus", energyLevel: "High" },
    ],
  },
  tuesday: {
    title: "창작의 숲",
    theme: "🌲 Forest of Creation",
    blocks: [{ id: "tue-1", name: "Creative Flow", startTime: "10:00", endTime: "12:00", emoji: "🎨", note: "Design and ideation", done: false, blockType: "Flow", energyLevel: "High" }],
  },
  wednesday: {
    title: "멍의 숲",
    theme: "🐕 Forest of Mindfulness",
    blocks: [{ id: "wed-1", name: "Mindful Break", startTime: "14:00", endTime: "15:00", emoji: "🧘", note: "Rest and recharge", done: false, blockType: "Recovery", energyLevel: "Recharge" }],
  },
  thursday: {
    title: "협력 던전",
    theme: "🤝 Collaboration Dungeon",
    blocks: [{ id: "thu-1", name: "Team Meeting", startTime: "15:00", endTime: "16:00", emoji: "👥", note: "Weekly sync", done: false, blockType: "Social", energyLevel: "Moderate" }],
  },
  friday: {
    title: "보스전",
    theme: "👹 Boss Battle",
    blocks: [{ id: "fri-1", name: "Major Deadline", startTime: "09:00", endTime: "17:00", emoji: "⚡", note: "Final push on project", done: false, blockType: "Focus", energyLevel: "High" }],
  },
  saturday: {
    title: "휴식 마을",
    theme: "🏘️ Rest Village",
    blocks: [{ id: "sat-1", name: "Personal Time", startTime: "10:00", endTime: "12:00", emoji: "🎮", note: "Hobbies and relaxation", done: false, blockType: "Recovery", energyLevel: "Low" }],
  },
  sunday: {
    title: "준비의 성",
    theme: "🏰 Castle of Preparation",
    blocks: [{ id: "sun-1", name: "Week Planning", startTime: "19:00", endTime: "20:00", emoji: "📋", note: "Plan next week", done: false, blockType: "Admin", energyLevel: "Moderate" }],
  },
};

export const defaultHabitEntries: HabitEntry[] = [
  { id: "entry-1", date: "2024-01-15", time: "08:30", state: "Clear", statusMemo: "Feeling energetic and motivated after morning workout", trigger: "Good night's sleep and morning exercise", action: "Started with meditation and planned the day", remarks: "Great start to the week" },
  { id: "entry-2", date: "2024-01-15", time: "14:00", state: "Scattered", statusMemo: "Mind wandering, hard to focus on tasks", trigger: "Too much caffeine and skipped lunch", action: "Took a 10-minute walk and had a healthy snack", remarks: "Need to be more mindful of eating schedule" },
];

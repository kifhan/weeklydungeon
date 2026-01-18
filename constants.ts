
import { WeekData, HabitEntry } from './types';

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const defaultWeekData: WeekData = {
  monday: {
    title: "언어 전투장",
    theme: "⚔️ Language Combat Arena",
    blocks: [],
  },
  tuesday: {
    title: "창작의 숲",
    theme: "🌲 Forest of Creation",
    blocks: [],
  },
  wednesday: {
    title: "멍의 숲",
    theme: "🐕 Forest of Mindfulness",
    blocks: [],
  },
  thursday: {
    title: "협력 던전",
    theme: "🤝 Collaboration Dungeon",
    blocks: [],
  },
  friday: {
    title: "보스전",
    theme: "👹 Boss Battle",
    blocks: [],
  },
  saturday: {
    title: "휴식 마을",
    theme: "🏘️ Rest Village",
    blocks: [],
  },
  sunday: {
    title: "준비의 성",
    theme: "🏰 Castle of Preparation",
    blocks: [],
  },
};

export const defaultHabitEntries: HabitEntry[] = [
  { id: "entry-1", date: "2024-01-15", time: "08:30", emotion: "Excited", note: "Actually feeling pretty great after accidentally waking up early! Who am I?", aiResponse: "The forest awakens with you! Seize this energy like a hawk diving for prey." },
  { id: "entry-2", date: "2024-01-15", time: "14:00", emotion: "Anxious", note: "Brain is doing that thing where it thinks about 47 things at once", aiResponse: "Breathe, traveler. Even the mightiest oak starts as a single seed. Focus on one leaf at a time." },
  { id: "entry-3", date: "2024-01-16", time: "11:45", emotion: "Tired", note: "Post-lunch food coma hitting hard, eyelids feel like they weigh 10 pounds each", aiResponse: "Rest is part of the cycle. Find a shady spot under a tree and recharge your roots." },
  { id: "entry-4", date: "2024-01-16", time: "16:20", emotion: "Happy", note: "In the zone! Everything feels smooth and my brain is cooperating for once", aiResponse: "Your branches are reaching for the sun! Enjoy this growth." },
  { id: "entry-5", date: "2024-01-17", time: "09:15", emotion: "Calm", note: "Just cruising through the morning, no rush, no stress, just existing peacefully", aiResponse: "The stream flows gently today. Let yourself drift with the current." },
  { id: "entry-6", date: "2024-01-17", time: "19:30", emotion: "Frustrated", note: "Mind is ping-ponging between Netflix, that project due tomorrow, and wondering if plants have feelings", aiResponse: "The wind blows in many directions. Plant your feet firmly and let the storm pass." },
];

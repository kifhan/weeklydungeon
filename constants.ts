
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
  { id: "entry-1", date: "2024-01-15", time: "08:30", state: "Energized", statusMemo: "Actually feeling pretty great after accidentally waking up early! Who am I?", trigger: "Cat decided 6 AM was breakfast time", action: "Made coffee and had a surprisingly productive morning scrolling", remarks: "Sometimes the best days start by accident" },
  { id: "entry-2", date: "2024-01-15", time: "14:00", state: "Scattered", statusMemo: "Brain is doing that thing where it thinks about 47 things at once", trigger: "Tried to multitask while eating lunch (rookie mistake)", action: "Took a 'quick' walk that turned into a 30-minute adventure", remarks: "Why do squirrels always look so judgemental?" },
  { id: "entry-3", date: "2024-01-16", time: "11:45", state: "Sleepy", statusMemo: "Post-lunch food coma hitting hard, eyelids feel like they weigh 10 pounds each", trigger: "Had that amazing pasta for lunch (worth it though)", action: "Made a cozy playlist and did some gentle desk stretches", remarks: "Note to self: lighter lunches or embrace the nap life" },
  { id: "entry-4", date: "2024-01-16", time: "16:20", state: "Vibing", statusMemo: "In the zone! Everything feels smooth and my brain is cooperating for once", trigger: "Finally figured out that bug that's been haunting me all week", action: "Celebrated with a victory dance and reorganized my workspace", remarks: "This is why I love coding - the highs are so worth the lows" },
  { id: "entry-5", date: "2024-01-17", time: "09:15", state: "Chilled", statusMemo: "Just cruising through the morning, no rush, no stress, just existing peacefully", trigger: "Woke up naturally without an alarm for the first time in weeks", action: "Made elaborate breakfast while listening to chill music", remarks: "Sometimes the best productivity hack is just being kind to yourself" },
  { id: "entry-6", date: "2024-01-17", time: "19:30", state: "Scattered", statusMemo: "Mind is ping-ponging between Netflix, that project due tomorrow, and wondering if plants have feelings", trigger: "Saw a really intense documentary about octopuses", action: "Talked to my houseplant about life choices and made some tea", remarks: "My plant is a surprisingly good listener" },
];

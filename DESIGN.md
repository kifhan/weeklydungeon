# Design System — Weekly Dungeon

## 1. Design System

### 1.1. Brand
- **Tone:** Adventurous, encouraging, grounded
- **Mood:** RPG fantasy with a calm, friendly feel
- **Motion:** Subtle hover/focus transitions, 150–200ms ease-out
- **Theme:** Light + dark mode via Tailwind `dark:` classes

### 1.2. Color Tokens
- **Primary:** Blue 600 (#2563EB)
- **Primary/hover:** Blue 600 at 90% opacity
- **Accent:** Purple 600 (#7C3AED)
- **Accent/hover:** Purple 700 (#6D28D9)
- **Text/primary:** Gray 900 (#111827) / Gray 100 (#F3F4F6)
- **Text/secondary:** Gray 600 (#4B5563) / Gray 400 (#9CA3AF)
- **Border:** Gray 200 (#E5E7EB) / Gray 700 (#374151)
- **Surface:** White (#FFFFFF) / Gray 800 (#1F2937)
- **Background:** Gray 50 (#F9FAFB) / Gray 900 (#111827)
- **Success:** Green 500 (#22C55E) / Green 600 (#16A34A)
- **Warning:** Yellow 500 (#EAB308)
- **Error:** Red 500 (#EF4444)
- **Info:** Blue 500 (#3B82F6)
- **Gradients:** Hero (Blue 50 → Indigo 100), Forest (Blue 50 → Green 50)

### 1.3. Typography
- **Font:** Tailwind `font-sans` (system-ui stack)
- **Display/Hero:** text-4xl, font-bold
- **Section titles:** text-2xl, font-bold
- **Card titles:** text-xl, font-semibold
- **Body:** text-base / text-sm
- **Meta:** text-xs

### 1.4. Spacing
- Base unit: 4px (Tailwind spacing scale)
- Common spacing: 2, 3, 4, 6, 8
- Layout containers: `max-w-7xl` (app), `max-w-4xl` (intro)

### 1.5. Radii & Shadow
- **Radii:** rounded-sm, rounded-md, rounded-lg, rounded-full
- **Shadow:** shadow-sm for cards, shadow-lg for hero/feature surfaces

### 1.6. Accessibility
- Focus rings: `ring-2` with blue-500 or theme ring token
- Interactive sizes: buttons at h-9/h-10/h-11
- Dark mode contrast maintained for text and borders

---

## 2. Components

### 2.1. Core UI
- `Button` (default/secondary/outline/ghost/link/destructive, sm/lg/icon)
- `Input`, `Textarea`, `Select`, `Checkbox`, `Label`
- `Badge` (default/secondary/destructive/outline)
- `Card` (Header/Title/Description/Content)
- `Tabs` (List/Trigger/Content)
- `Dialog` (Content/Header/Title/Description/Footer)
- `Collapsible` (Trigger/Content)

### 2.2. Feature Surfaces
- `Header` (title + auth controls)
- `IntroSection` (hero + sign-in)
- `DailyQuestBoard` (daily/weekly quest views)
- `HabitTracker` (Forest Journal entry/history/analytics)
- `ForestVisualizer` (quest/habit trees)
- `CharacterScreen` (trait selection + persona prompt)
- `EditBlockDialog` (edit quest blocks)
- `NewWeekDialog` (AI week onboarding)
- `DungeonMap` (legacy week/day/history view)

---

## 3. UX Notes
- Completed quests show green-tinted backgrounds and line-through text.
- AI actions use purple accents and Sparkles iconography.
- Tabs separate quests, journal, and character management.
- Cards group content, with gradients on hero and forest surfaces.
- Alerts use red backgrounds and borders for auth or error states.

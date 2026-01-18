# Create Character Screen and Traits System

The user wants to create a "Character Screen" where they can define their character's traits. These traits will be used to generate a "Character Prompt" (a system instruction for the AI) which will then be used in the Habit Tracker and Daily Quest Board to personalize the AI's responses.

## User Review Required
None.

## Proposed Changes

### Data Model
#### [MODIFY] [types.ts](file:///Users/darter/Workplace/grumpydarter_project/weeklydungeon/types.ts)
- Add `CharacterTrait` type (e.g., "Stoic", "Cheerleader", "Mystical", "Tough Love").
- Add `CharacterProfile` interface:
    - `traits`: `CharacterTrait[]`
    - `name`: string
    - `generatedPrompt`: string (The system prompt generated from traits)
    - `customInstructions`: string (Optional user overrides)

### Services
#### [MODIFY] [firestore.ts](file:///Users/darter/Workplace/grumpydarter_project/weeklydungeon/services/firestore.ts)
- Add `saveCharacterProfile(uid, profile)`
- Add `listenCharacterProfile(uid, callback)`
- Create a `profiles` collection (or store in `users/{uid}`). Storing in `users/{uid}/profile/data` or similar is fine. Let's use `users/{uid}/settings/profile`.

### Components
#### [NEW] [CharacterScreen.tsx](file:///Users/darter/Workplace/grumpydarter_project/weeklydungeon/components/CharacterScreen.tsx)
- UI to select traits from a predefined list.
- "Generate Persona" button that uses Gemini to create a system prompt based on selected traits.
- Text area to view/edit the generated prompt.
- Save button.

#### [MODIFY] [MainContent.tsx](file:///Users/darter/Workplace/grumpydarter_project/weeklydungeon/components/MainContent.tsx)
- Add a new Tab "Character" (`User` icon).
- Render `CharacterScreen` in this tab.

#### [MODIFY] [HabitTracker.tsx](file:///Users/darter/Workplace/grumpydarter_project/weeklydungeon/components/HabitTracker.tsx)
- Fetch `CharacterProfile`.
- Update `generateAIResponse` to use `profile.generatedPrompt` as the system instruction if available.

#### [MODIFY] [DailyQuestBoard.tsx](file:///Users/darter/Workplace/grumpydarter_project/weeklydungeon/components/DailyQuestBoard.tsx)
- Fetch `CharacterProfile`.
- Update `generateAIQuest` to use `profile.generatedPrompt` to style the quest generation (e.g., "Generate a quest *as this character*").

## Verification Plan

### Manual Verification
1.  Navigate to the new "Character" tab.
2.  Select a few traits (e.g., "Mystical", "Encouraging").
3.  Click "Generate Persona".
4.  Verify a prompt appears in the text area.
5.  Save the profile.
6.  Go to "Daily Quests" and generate an AI quest.
7.  Verify the quest flavor text matches the new persona.
8.  Go to "Forest Journal", make an entry, and ask the AI.
9.  Verify the response matches the new persona.

# Weekly Dungeon Onboarding Walkthrough Manual

This manual helps a new user or tester get from a fresh checkout to a useful first session in Weekly Dungeon. It covers local setup, account entry, first-run configuration, and the core app flows.

## 1. Product Overview

Weekly Dungeon is a personal productivity app that turns weekly planning, habits, and reflection into a lightweight RPG-style command center.

The main loops are:

- Create weekly quests and move them through planned, active, and complete states.
- Define habits and check them off each day.
- Queue reflection questions, answer them, and build memory context from those answers.
- Configure a personal guide character that shapes the tone of AI-assisted prompts.
- Set timezone and notification preferences for reminders and reflection delivery.

## 2. Local Setup

### Prerequisites

- Node.js
- pnpm, as declared by `packageManager` in `package.json`
- A Firebase project with Firestore enabled
- Firebase Authentication with Google and Anonymous sign-in providers enabled
- Optional: a Gemini API key for AI-assisted features

### Environment Variables

Create `.env.local` in the project root with:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
GEMINI_API_KEY=...
```

`VITE_FIREBASE_VAPID_KEY` is only needed for browser push notification setup. `GEMINI_API_KEY` is optional, but AI generation paths will not work without it.

### Install And Run

```bash
pnpm install
pnpm dev
```

The `predev` script runs `scripts/generate-firebase-config.mjs`. It reads the Firebase environment variables and writes `public/firebase-config.js` for the messaging service worker. If required Firebase variables are missing, the dev server will stop with a clear missing-variable error.

### Firebase Rules

Deploy the rules before testing against a real Firebase project:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

The app stores user-owned data under `users/{uid}`. Rules should enforce that each signed-in user can only read and write their own documents.

## 3. First Login

1. Open the local Vite URL shown by `pnpm dev`.
2. On the login screen, choose either `Sign in with Google` or `Continue as Guest`.
3. After successful auth, the app redirects to the command center.

Use Google sign-in when you need data to persist across devices. Use guest sign-in for quick local QA or demos.

## 4. First-Run Checklist

Complete these in order for a realistic first session:

1. Open `Settings`.
2. Confirm the timezone, for example `Asia/Seoul`.
3. Select a notification channel: `in-app`, `push`, or `email`.
4. Toggle reminders on or off.
5. Open `Character`.
6. Set a guide name, archetype, traits, tone, and intensity.
7. Save the character and read the prompt preview.
8. Open `Quests` and create at least one quest for the current week.
9. Open `Habits` and create at least one daily habit.
10. Open `Reflections` and queue one reflection question.

After this checklist, the command center should show meaningful quest progress, open quests, habit state, and reflection data.

## 5. Navigation Map

### Command

The command center is the daily dashboard. It shows:

- Quest progress
- Open quest count
- Habit checks for today
- Memory context count
- A quick quest creation form
- Current active quests
- The current guide prompt
- Today's habit check controls
- A reflection queue and short reflection inbox

Use this screen for daily operation after onboarding is complete.

### Quests

Use `Quests` to manage weekly work.

To create a quest:

1. Enter a title.
2. Choose a day.
3. Choose a difficulty: `calm`, `standard`, or `boss`.
4. Add optional notes, constraints, or first action.
5. Add an optional reward.
6. Select `Add quest`.

Quest columns are grouped by status:

- `planned`
- `active`
- `complete`

Select `Advance` to move a quest to the next state. Use the trash button to remove a quest.

### Habits

Use `Habits` to define recurring actions and mark today's completion.

To create a habit:

1. Enter the habit name.
2. Enter the target, such as `Before work`.
3. Choose cadence: `daily` or `weekly`.
4. Add optional notes.
5. Select `Add habit`.

In the `Today` section, select `Check` to mark a habit complete for the current date. Select `Archive` to hide a habit without deleting historical logs.

### Reflections

Use `Reflections` for personal questions, answers, deliveries, answer history, and generated memory.

To queue a manual reflection:

1. Enter the question.
2. Select `Queue reflection`.
3. Answer it from the queued reflection list or from a delivered reflection.
4. Select `Save answer`.

Answered reflections appear in history. Generated memory contexts appear in the `Memory` panel when the backend has processed answers.

### Character

Use `Character` to configure the guide persona used by the app.

Fields:

- `Guide name`: display name for the guide.
- `Archetype`: one of `Guide`, `Strategist`, `Scout`, or `Guardian`.
- `Intensity`: numeric adventure tone from 0 to 100.
- `Traits`: comma-separated traits, limited to the first eight entries.
- `Tone`: short instruction for voice and style.
- `Prompt instruction`: detailed behavior instruction.

Select `Save character`, then confirm the `Prompt preview` matches the desired voice. The command center uses this guide prompt in the `Guide` panel.

### Settings

Use `Settings` for account-level preferences:

- Timezone
- Notification channel
- Reminder toggle

The cleanup policy note explains that legacy Firestore collections are not modified by normal app usage. Cleanup requires the explicit `cleanup:legacy` script.

## 6. Suggested Demo Script

Use this script when demonstrating the app to someone new:

1. Sign in as a guest.
2. Open `Character` and create a guide named `Atlas`.
3. Set archetype to `Strategist`, traits to `Grounded, Direct, Warm`, and intensity to `60`.
4. Open `Quests` and add `Draft the weekly plan` as a `standard` quest for today.
5. Select `Advance` once so the quest becomes active.
6. Open `Habits` and add `Morning check-in` with target `Before work`.
7. Check the habit for today.
8. Open `Reflections` and queue `What would make this week feel complete?`.
9. Answer the reflection with a short paragraph.
10. Return to `Command` and confirm the dashboard metrics updated.

## 7. QA Checklist

Before marking onboarding ready, verify:

- Login works with Google and anonymous auth.
- The app redirects authenticated users away from `/login`.
- Creating quests persists after refresh.
- Advancing a quest changes its status.
- Creating habits persists after refresh.
- Checking a habit affects today's dashboard count.
- Queuing and answering reflections persists after refresh.
- Character edits update the prompt preview and command center guide text.
- Settings save timezone, notification channel, and reminder state.
- Firestore permission errors are shown as error cards instead of blank screens.

## 8. Troubleshooting

### Dev Server Fails Before Starting

Check `.env.local`. The Firebase config generator requires:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Login Fails

In Firebase Console, confirm these sign-in providers are enabled:

- Google
- Anonymous

Also confirm the local dev origin is allowed by the Firebase Auth configuration.

### Data Does Not Save

Check:

- Firestore is enabled for the Firebase project.
- `firestore.rules` has been deployed.
- The browser console does not show permission-denied errors.
- The current user is authenticated.

### Push Notifications Do Not Work

Check:

- `VITE_FIREBASE_VAPID_KEY` is set.
- Browser notification permission has been granted.
- The service worker can load `/firebase-messaging-sw.js`.
- `public/firebase-config.js` was generated by the predev or prebuild script.

### AI Features Do Not Work

Check:

- `GEMINI_API_KEY` is set for local frontend AI paths.
- Functions configuration or function environment variables include `GEMINI_API_KEY` for backend reflection processing.
- Function dependencies are installed under `functions/`.

## 9. Backend And Functions Notes

Firebase Functions support scheduled reflection delivery and answer processing. See `README_FUNCTIONS.md` for function setup.

Useful commands:

```bash
cd functions
npm install
npm run build
firebase emulators:start --only functions,firestore
firebase deploy --only functions
```

The scheduled `scanReservations` function runs every minute in deployed environments. For local testing, use the Firebase emulator tools.

## 10. Data Ownership

All primary app data is scoped to the authenticated user. Expected user-owned collections include:

- Profile and settings
- Quests
- Habits and habit logs
- Reflections
- Reflection deliveries
- Reflection answers
- Memory contexts

This means onboarding can be repeated safely with separate anonymous or Google users without cross-account data leakage.

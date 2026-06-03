# Weekly Dungeon V2 Architecture

## Status

Accepted design direction from the refactoring review.

## Goal

Rebuild Weekly Dungeon as a product-level architecture, not only a frontend prototype. The app should center on a weekly command experience where quests, habits, reflections, character guidance, reminders, and memory all share one domain model.

## Core Decisions

1. Use Firebase/Firestore as the primary persistence layer.
2. Keep the authenticated Firebase app shell.
3. Replace legacy UI/data paths with Weekly Dungeon domain collections.
4. Start clean with the new data model instead of migrating old user data.
5. Treat old Firestore data as removable, but delete it only through an explicit cleanup script.
6. Let clients write ordinary user-owned documents directly to Firestore.
7. Use Cloud Functions only for privileged, scheduled, AI, notification, and admin work.
8. Fold Life Question Bot into the Reflections domain.
9. Make Command Center the first screen after login.
10. Use Firestore subscription hooks as the source of truth.
11. Start Firestore rules with strict field allowlists.
12. Include AI as asynchronous support, never as a blocker for core flows.
13. Implement domain and Firestore contracts before UI routing integration.

## Product Model

Weekly Dungeon V2 is organized around these user concepts:

- Command Center: the logged-in home screen for the current week.
- Quests: intentional work items with status, day, difficulty, and reward.
- Habits: recurring behaviors and daily logs that grow the habit forest.
- Reflections: manual or generated questions, scheduled delivery, answers, and memory context.
- Character: the user's guide profile, traits, tone, and generated prompt.
- Settings: timezone, notification channel, reminder preference, and cleanup/admin flags.

The product language should use "Reflections" instead of "Life Question Bot" in the UI and frontend domain model.

## Firestore Structure

All user-owned documents live under `users/{uid}`.

Recommended collections:

```text
users/{uid}/quests/{questId}
users/{uid}/habits/{habitId}
users/{uid}/habitLogs/{logId}
users/{uid}/reflections/{reflectionId}
users/{uid}/reflectionSchedules/{scheduleId}
users/{uid}/reflectionDeliveries/{deliveryId}
users/{uid}/reflectionAnswers/{answerId}
users/{uid}/memoryContexts/{contextId}
users/{uid}/notificationTokens/{token}
users/{uid}/settings/profile
users/{uid}/settings/migration
```

Legacy collections such as `boards`, `weeks`, `logs`, and old Life Question collections should not be used by the new UI. They may remain in Firestore until a separate cleanup run removes them.

## Client Responsibilities

The frontend may directly create, update, and delete ordinary user-owned data:

- `quests`
- `habits`
- `habitLogs`
- ordinary `reflections`
- `reflectionAnswers`
- `settings/profile`

The frontend should use subscription hooks as the source of truth:

```text
src/weekly-dungeon/domain/*
src/weekly-dungeon/data/firestore.ts
src/weekly-dungeon/hooks/useDungeonData.ts
src/weekly-dungeon/hooks/useDungeonActions.ts
```

Local component state should be limited to UI-only concerns such as active tab, form drafts, temporary filters, and optimistic form feedback. `localStorage` can keep non-authoritative UI preferences or drafts, but it must not be the main application data store.

## Cloud Functions Responsibilities

Cloud Functions own work that requires server trust, scheduled execution, credentials, or AI side effects:

- previewing and creating reflection schedules
- scanning due schedules
- creating reflection deliveries
- sending FCM notifications
- generating meta reflections
- summarizing answers into memory contexts
- registering notification tokens when server validation is needed
- cleanup and admin-only maintenance

Normal quest, habit, reflection, and profile CRUD should not be forced through callable functions unless a future trust boundary requires it.

## Security Rules

New collections should start with field allowlists and type checks instead of broad per-user read/write access.

Rules policy:

- `quests`: client CRUD with allowed fields and length/type limits.
- `habits`: client CRUD with allowed fields and length/type limits.
- `habitLogs`: client CRUD with `habitId`, date, and content validation.
- `reflections`: client CRUD for ordinary fields only; server-only fields are blocked.
- `reflectionSchedules`: client direct create/update denied; callable functions create schedules.
- `reflectionDeliveries`: client read; client may acknowledge status only.
- `reflectionAnswers`: client create/update allowed for own answers.
- `memoryContexts`: client read only; server write only.
- `settings/profile`: client update allowed with field allowlist.
- migration/admin flags: client writes denied unless explicitly safe.

## Routing

Recommended routes:

```text
/login
/                 Command Center
/quests
/habits
/reflections
/character
/settings
/reflections/answer/:deliveryId
```

Legacy `/life/*` routes should be removed or redirected into the Reflections experience.

## AI Scope

AI is included in the MVP as asynchronous support:

- character prompt preview/generation
- meta reflection generation
- reflection schedule preview
- answer summary and memory context creation

Core flows must work without AI:

- create and complete quests
- check habits and write habit logs
- create manual reflections
- answer reflections
- edit profile/settings

If AI fails, the app should fall back to manual prompts or saved base prompts and keep the user flow unblocked.

## Cleanup Policy

Legacy Firestore data can be removed only by an explicit cleanup script. The app must not delete old data on login, app load, or deployment.

Cleanup script requirements:

- require `--project`
- require `--uid` or an explicit all-users mode
- default to `--dry-run`
- print exact target paths and counts
- require `--confirm`
- create or require a backup/export before destructive deletion
- use stronger confirmation for production projects

## Implementation Order

1. Define Weekly Dungeon domain types.
2. Implement Firestore path helpers, mappers, listeners, and CRUD functions.
3. Implement `useDungeonData` and `useDungeonActions`.
4. Add strict Firestore rules for new collections.
5. Add or adapt Cloud Functions for Reflections.
6. Integrate the Command Center into authenticated routing.
7. Replace local reducer state in the current prototype with Firestore hooks.
8. Remove or redirect legacy routes.
9. Add cleanup dry-run script.
10. Run build, rules validation, and functions tests.

## Non-Goals

- Do not migrate existing user data into the new model.
- Do not switch to PostgreSQL or an external vector database.
- Do not make AI required for ordinary product flows.
- Do not delete legacy Firestore data automatically.
- Do not keep Kanban board implementation details as the new product data model.

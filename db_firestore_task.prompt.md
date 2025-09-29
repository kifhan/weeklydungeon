
## #codebase plan changes

### Data model (Firestore)
- users/{uid}
  - habits (subcollection)
    - {entryId}: HabitEntry document
      - id, date (string YYYY-MM-DD), time (string HH:mm), state, statusMemo, trigger, action, remarks?, createdAt, updatedAt
  - weeks (subcollection)
    - {weekKey}: Week document (weekKey = ISO date for Monday, e.g. 2025-09-29)
      - weekKey, weekStartDate (ISO), data: DayData/blocks array (mirrors WeekData)
      - updatedAt
  - logs (subcollection)
    - {logId}: DungeonLog document
      - id, blockId, blockName, day, completedAt, energyLevel, blockType, createdAt

Notes:
- Use server timestamps for createdAt/updatedAt.
- Keep weeks/{weekKey} as one doc holding the full WeekData (simplifies reads/writes).
- No composite indexes needed initially.

### Files to add
- services/firestore.ts
  - Purpose: Typed Firestore CRUD and listeners for habits, weeks, logs
  - Exports (typed):
    - getWeekKey(date: Date): string
    - listenHabitEntries(uid, cb): unsubscribe
    - addHabitEntry(uid, entry): Promise<void>
    - listenWeek(uid, weekKey, cb): unsubscribe
    - saveWeek(uid, weekKey, weekData): Promise<void>
    - updateBlock(uid, weekKey, updatedBlock): Promise<void>
    - toggleBlockDone(uid, weekKey, dayKey, blockId, done): Promise<void>
    - addDungeonLog(uid, log): Promise<void>
    - listenDungeonLogs(uid, cb): unsubscribe

- utils/date.ts (optional but recommended)
  - getStartOfWeek(date): Date
  - formatWeekKey(date): string

- .env.local

### Files to update
- firebase.ts
  - Replace process.env.REACT_APP_* with Vite-style import.meta.env.VITE_*.
  - Add optional offline persistence: enableIndexedDbPersistence(db) with try/catch.

- firestore.rules
  - Replace “deny all” with per-user access:
    - allow read, write on /databases/(default)/documents/users/{uid}/{collection=**}/{doc=**} if request.auth.uid == uid.
  - Basic schema checks for critical fields (presence + type where reasonable).

- App.tsx
  - Pass user (or uid) down to MainContent via props.

- MainContent.tsx
  - Accept user prop and pass uid to DungeonMap and HabitTracker.

- HabitTracker.tsx
  - On mount: subscribe to Firestore habit entries (listenHabitEntries) and hydrate local state (keep localStorage as cache for offline).
  - On add: optimistic update local state, then call addHabitEntry(uid, entry).
  - Optionally migrate existing localStorage entries to Firestore once on first login.

- DungeonMap.tsx
  - Compute weekKey from weekStartDate.
  - On mount or when week changes: subscribe to listenWeek(uid, weekKey) and hydrate UI.
  - On add/edit/toggle block: optimistic update local state, then call saveWeek/updateBlock/toggleBlockDone and addDungeonLog when a block is completed.
  - Logs tab: subscribe to listenDungeonLogs(uid) (or fetch recent) to show history.

- types.ts
  - Add Firestore-oriented types:
    - FirestoreTimestamp fields (createdAt/updatedAt as string | Timestamp)
    - WeekDoc { weekKey, weekStartDate, data: WeekData, updatedAt }
    - Optionally narrow Day keys (monday..sunday) to reduce mistakes.

- README.md (short update)
  - Add env setup, Firestore rules note, and how data sync works (localStorage + Firestore).

### API/service “contract” (concise)
- addHabitEntry(uid, entry)
  - Input: uid string, HabitEntry (id generated client-side or use doc id)
  - Side effects: writes to users/{uid}/habits/{entry.id}; sets timestamps
  - Errors: auth missing, permissions, offline—caller handles toast

- saveWeek(uid, weekKey, weekData)
  - Upserts full week doc at users/{uid}/weeks/{weekKey}
  - Keeps updatedAt timestamp

- listenWeek(uid, weekKey, cb)
  - Snapshot listener to keep UI in sync; returns unsubscribe

- updateBlock/toggleBlockDone
  - Mutates WeekData in-place and persists via saveWeek
  - When marking done -> addDungeonLog

- addDungeonLog(uid, log)
  - Writes users/{uid}/logs/{log.id} with createdAt

- listenHabitEntries / listenDungeonLogs
  - Real-time listeners with basic ordering by createdAt/ completedAt desc

### Security rules (summary)
- Only authenticated users can read/write their own subtree:
  - match /databases/{db}/documents {
      match /users/{uid}/{coll=**}/{doc} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
- Basic validation samples:
  - habits: require fields id/date/time/state/statusMemo/trigger/action; cap lengths (e.g., <= 2000 chars)
  - logs: require blockId, blockName, day, blockType, energyLevel (number)

### UI data flow and UX
- Keep optimistic updates for snappy UI; show a subtle toast on failures with “Retry”.
- First-login migration:
  - If Firestore has zero docs and localStorage has data, enqueue a one-time sync to Firestore, then mark “synced” in localStorage to avoid repeats.
- Offline:
  - IndexedDB persistence lets user edit offline; Firestore will sync when back online.

### Edge cases to cover
- Missing uid (user signed out mid-action) → prevent writes, show auth toast
- Week data doc not found → initialize from defaults
- Import JSON with duplicates → de-dup by id before writing
- Large local data on migration → batch writes (chunk to 400-500 ops) and backoff

### Acceptance criteria
- After signing in, new slak entries persist and survive refresh on another device.
- Week schedule edits/checkbox toggles persist per weekKey and reflect across tabs/devices.
- Logs history shows newly completed blocks automatically via real-time updates.
- Security rules block cross-user access (verified via simulator).
- No build errors; envs documented; localStorage still serves as cache.

If this plan looks good, I’ll implement it next: add the service module, update env usage, wire the components, and adjust security rules, then validate and document.


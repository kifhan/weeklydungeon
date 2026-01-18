<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/11B9DgiX3L6FEFIvdSbudCY_lFS9AGMkI

## Run Locally

Prerequisites: Node.js, Firebase project (Firestore enabled)

1. Install dependencies: `npm install`
2. Copy `.env.local.example` to `.env.local` and set:
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_MESSAGING_SENDER_ID
   - VITE_FIREBASE_APP_ID
   - Optional: GEMINI_API_KEY (for AI features)
3. Ensure Firestore rules from `firestore.rules` are deployed (or use the emulator)
4. Run the app: `npm run dev`

### Data model and sync

- Auth via Google; per-user data lives under `users/{uid}` in Firestore.
- Habit entries: `users/{uid}/habits/{entryId}`.
- Weekly schedule: `users/{uid}/weeks/{weekKey}` as a single doc mirroring `WeekData`.
- Logs: `users/{uid}/logs/{logId}`.
- UI uses optimistic updates; Firestore is the source of truth. LocalStorage caches data for offline.

### Security rules

Rules enforce per-user access under `users/{uid}` and cover habits, weeks, logs, and optional Kanban boards.

### Authentication

- Enable Google and Anonymous sign-in providers in Firebase Console → Authentication → Sign-in method.
- The landing page offers both "Sign in with Google" and "Continue as Guest" (anonymous).


craete character screen
let user choose characteristic traits
generate character prompt for memory and other AI features
save character prompt to user data
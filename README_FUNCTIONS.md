# Firebase Functions Setup

## Prerequisites

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Install dependencies: `cd functions && npm install`

## Configuration

1. Set Gemini API key:
   ```bash
   firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
   ```

2. Or use environment variables in `.env` (for local development):
   ```
   GEMINI_API_KEY=your_key_here
   ```

## Deployment

1. Build functions: `cd functions && npm run build`
2. Deploy: `firebase deploy --only functions`

## Local Development

1. Start emulator: `firebase emulators:start --only functions,firestore`
2. Functions will be available at `http://localhost:5001`

## Scheduled Function

The `scanReservations` function runs every minute. To test locally, you can trigger it manually or use the emulator UI.

## Notes

- Vector search requires Firestore Vector Search indexes to be created (see `firestore.indexes.json`)
- FCM requires VAPID key configuration in Firebase Console
- Service worker must be accessible at `/firebase-messaging-sw.js`

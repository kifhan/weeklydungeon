import * as functions from "firebase-functions/v2";

interface AuthenticatedRequestLike {
  auth?: {
    uid?: string;
  } | null;
}

export function getAuthenticatedUid(request: AuthenticatedRequestLike): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication is required for this operation",
    );
  }

  return uid;
}

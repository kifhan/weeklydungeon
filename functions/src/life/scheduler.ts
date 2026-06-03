import * as functions from "firebase-functions/v2";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebase";
import { getLegacyRecurringNextRun, processReservation } from "./deliveries";
import type { ReservationDoc } from "./types";

export const scanReservations = functions.scheduler.onSchedule(
  "every 10 minutes",
  async () => {
    const now = Timestamp.now();
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const reservationsRef = userDoc.ref.collection("questionReservations");

      const recurringReservations = await reservationsRef
        .where("type", "==", "RECURRING")
        .where("isProcessed", "==", false)
        .limit(100)
        .get();

      for (const reservationDoc of recurringReservations.docs) {
        const reservation = reservationDoc.data() as ReservationDoc;
        const normalizedNextRun = getLegacyRecurringNextRun(
          reservation,
          now.toDate(),
        );
        if (!normalizedNextRun) {
          continue;
        }

        await reservationDoc.ref.update({
          nextRunAt: Timestamp.fromDate(normalizedNextRun),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const dueReservations = await reservationsRef
        .where("nextRunAt", "<=", now)
        .where("isProcessed", "==", false)
        .limit(100)
        .get();

      for (const reservationDoc of dueReservations.docs) {
        const reservation = reservationDoc.data() as ReservationDoc;
        await processReservation(uid, reservationDoc.id, reservation, now);
      }
    }
  },
);

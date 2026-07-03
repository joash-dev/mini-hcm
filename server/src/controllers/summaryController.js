import {
  getUserByUid,
  getFirstPunchIn,
  getFirstPunchOutAfter,
  saveDailySummary,
} from "../services/firestoreService.js";
import { computeDailySummary } from "../logic/computeDailySummary.js";

/**
 * Helper to validate YYYY-MM-DD date format.
 */
function isValidDateString(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

/**
 * POST /api/summary/compute
 * Computes or re-computes the daily summary for a user on a given date string.
 * This operation is fully idempotent: if a summary already exists, it is overwritten.
 */
export async function computeSummary(req, res) {
  try {
    const { userId, date } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ error: "userId and date are required" });
    }

    if (!isValidDateString(date)) {
      return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
    }

    /* ── Authorization ── */
    const requesterUid = req.user.uid;
    const requesterProfile = await getUserByUid(requesterUid);
    const isAdmin = requesterProfile && requesterProfile.role === "admin";

    if (requesterUid !== userId && !isAdmin) {
      return res.status(403).json({ error: "Access denied: cannot compute summary for another employee" });
    }

    /* ── Retrieve employee profile and schedule ── */
    const employee = await getUserByUid(userId);
    if (!employee) {
      return res.status(404).json({ error: `Employee not found with id ${userId}` });
    }

    const { schedule } = employee;
    if (!schedule || !schedule.start || !schedule.end) {
      return res.status(500).json({ error: "Employee schedule is not configured on the server" });
    }

    /* ── Determine calendar day range ── */
    const [year, month, day] = date.split("-").map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

    /* ── Fetch first punch-in of the day ── */
    const punchInRecord = await getFirstPunchIn(userId, dayStart, dayEnd);

    let summary;

    if (!punchInRecord) {
      // No punch-in means they did not work today (or it's a rest day/absent)
      summary = {
        regularHrs: 0.00,
        ot: 0.00,
        nd: 0.00,
        lateMinutes: 0,
        undertimeMinutes: 0,
        incomplete: false,
      };
    } else {
      // Find the corresponding punch-out (the first "out" punch after the punch-in)
      const punchOutRecord = await getFirstPunchOutAfter(userId, punchInRecord.timestamp);

      const punchInDate = punchInRecord.timestamp.toDate();
      const punchOutDate = punchOutRecord ? punchOutRecord.timestamp.toDate() : null;

      // Compute using pure business logic engine
      summary = computeDailySummary({
        punchIn: punchInDate,
        punchOut: punchOutDate,
        schedule,
      });
    }

    /* ── Save summary (Idempotent) ── */
    await saveDailySummary(userId, date, summary);

    return res.status(200).json({
      message: "Daily summary computed successfully",
      summary: {
        userId,
        date,
        ...summary,
      },
    });
  } catch (err) {
    console.error("Compute daily summary failed:", err.message);
    return res.status(500).json({ error: "Failed to compute daily summary" });
  }
}

/**
 * GET /api/summary/history
 * Returns the history of daily summaries for the authenticated employee.
 */
export async function getSummaryHistory(req, res) {
  try {
    const userId = req.user.uid;
    const { getUserSummaryHistory } = await import("../services/firestoreService.js");
    const history = await getUserSummaryHistory(userId);
    return res.json({ history });
  } catch (err) {
    console.error("Fetch summary history failed:", err.message);
    return res.status(500).json({ error: "Failed to fetch daily summary history" });
  }
}

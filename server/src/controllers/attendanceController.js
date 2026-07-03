import { Timestamp } from "firebase-admin/firestore";
import {
  createAttendanceRecord,
  getTodayAttendance,
} from "../services/firestoreService.js";

/**
 * Returns the start and end Date objects for "today" in UTC.
 * Used to scope attendance queries to a single calendar day.
 */
function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * GET /api/attendance/status
 * Returns the current punch state for the authenticated user today.
 * State is "in" if the last record today is type "in", otherwise "none"/"out".
 */
export async function getPunchStatus(req, res) {
  try {
    const userId = req.user.uid;
    const { start, end } = getTodayRange();
    const records = await getTodayAttendance(userId, start, end);

    if (records.length === 0) {
      return res.json({ status: "none", records: [] });
    }

    const lastRecord = records[records.length - 1];
    const status = lastRecord.type === "in" ? "in" : "out";

    return res.json({ status, records });
  } catch (err) {
    console.error("Get punch status failed:", err.message);
    return res.status(500).json({ error: "Failed to get punch status" });
  }
}

/**
 * POST /api/attendance/punch
 * Records a punch-in or punch-out for the authenticated user.
 * Enforces one in + one out per day — rejects duplicates.
 */
export async function recordPunch(req, res) {
  try {
    const userId = req.user.uid;
    const { type } = req.body;

    if (type !== "in" && type !== "out") {
      return res.status(400).json({ error: 'Type must be "in" or "out"' });
    }

    const { start, end } = getTodayRange();
    const todayRecords = await getTodayAttendance(userId, start, end);

    /* Enforce one in + one out per day */
    const hasIn = todayRecords.some((r) => r.type === "in");
    const hasOut = todayRecords.some((r) => r.type === "out");

    if (type === "in" && hasIn) {
      return res.status(409).json({ error: "Already punched in today" });
    }

    if (type === "out" && hasOut) {
      return res.status(409).json({ error: "Already punched out today" });
    }

    if (type === "out" && !hasIn) {
      return res.status(400).json({ error: "Cannot punch out without punching in first" });
    }

    const record = {
      userId,
      timestamp: Timestamp.now(),
      type,
    };

    const id = await createAttendanceRecord(record);

    return res.status(201).json({
      message: `Punch ${type} recorded`,
      record: { id, ...record },
    });
  } catch (err) {
    console.error("Record punch failed:", err.message);
    return res.status(500).json({ error: "Failed to record punch" });
  }
}

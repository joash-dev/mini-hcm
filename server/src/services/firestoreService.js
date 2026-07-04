import { getFirestore } from "firebase-admin/firestore";

/**
 * Returns a reference to the Firestore database.
 * Lazily accessed so Firebase Admin is guaranteed to be initialized first.
 */
function db() {
  return getFirestore();
}

/**
 * Fetch a user document by UID.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object|null>} User data or null if not found
 */
export async function getUserByUid(uid) {
  const snap = await db().collection("users").doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Create a user document keyed by UID.
 * @param {string} uid - Firebase Auth UID
 * @param {Object} data - User fields to store
 */
export async function createUser(uid, data) {
  await db().collection("users").doc(uid).set(data);
}

/**
 * Write a punch record to the attendance collection.
 * @param {{ userId: string, timestamp: FirebaseFirestore.Timestamp, type: "in"|"out" }} data
 * @returns {Promise<string>} The auto-generated document ID
 */
export async function createAttendanceRecord(data) {
  const ref = await db().collection("attendance").add(data);
  return ref.id;
}

/**
 * Get all attendance records for a user on a specific date.
 * @param {string} userId
 * @param {Date} dayStart - start of the calendar day (00:00:00)
 * @param {Date} dayEnd   - end of the calendar day (23:59:59)
 * @returns {Promise<Array>} Attendance docs ordered by timestamp ascending
 */
export async function getTodayAttendance(userId, dayStart, dayEnd) {
  const { Timestamp } = await import("firebase-admin/firestore");
  const snap = await db()
    .collection("attendance")
    .where("userId", "==", userId)
    .where("timestamp", ">=", Timestamp.fromDate(dayStart))
    .where("timestamp", "<=", Timestamp.fromDate(dayEnd))
    .orderBy("timestamp", "asc")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetch a daily summary document by userId and date string (YYYY-MM-DD).
 * @param {string} userId
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Promise<Object|null>} Daily summary data or null if not found
 */
export async function getDailySummary(userId, date) {
  const snap = await db().collection("dailySummary").doc(`${userId}_${date}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Save a daily summary document, overwriting if it exists (idempotency).
 * @param {string} userId
 * @param {string} date - "YYYY-MM-DD"
 * @param {Object} summary - computed metrics
 */
export async function saveDailySummary(userId, date, summary) {
  await db()
    .collection("dailySummary")
    .doc(`${userId}_${date}`)
    .set({
      userId,
      date,
      ...summary,
      updatedAt: new Date().toISOString()
    });
}

/**
 * Get the first "in" punch for a user within a calendar day date range.
 * @param {string} userId
 * @param {Date} start
 * @param {Date} end
 * @returns {Promise<Object|null>} Attendance record or null
 */
export async function getFirstPunchIn(userId, start, end) {
  const { Timestamp } = await import("firebase-admin/firestore");
  const snap = await db()
    .collection("attendance")
    .where("userId", "==", userId)
    .where("type", "==", "in")
    .where("timestamp", ">=", Timestamp.fromDate(start))
    .where("timestamp", "<=", Timestamp.fromDate(end))
    .orderBy("timestamp", "asc")
    .limit(1)
    .get();

  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Get the first "out" punch for a user after a specific timestamp.
 * @param {string} userId
 * @param {FirebaseFirestore.Timestamp} timestamp
 * @returns {Promise<Object|null>} Attendance record or null
 */
export async function getFirstPunchOutAfter(userId, timestamp) {
  const snap = await db()
    .collection("attendance")
    .where("userId", "==", userId)
    .where("type", "==", "out")
    .where("timestamp", ">", timestamp)
    .orderBy("timestamp", "asc")
    .limit(1)
    .get();

  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Fetch all daily summaries for a specific user, sorted by date descending.
 * @param {string} userId
 * @returns {Promise<Array>} List of daily summaries
 */
export async function getUserSummaryHistory(userId) {
  const snap = await db()
    .collection("dailySummary")
    .where("userId", "==", userId)
    .orderBy("date", "desc")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetch all users with the "employee" role.
 * @returns {Promise<Array>} List of employee user records
 */
export async function getAllEmployees() {
  const snap = await db()
    .collection("users")
    .where("role", "==", "employee")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetch all attendance punch logs for a specific employee, ordered by timestamp ascending.
 * @param {string} userId
 * @returns {Promise<Array>} List of punch records
 */
export async function getEmployeeAttendance(userId) {
  const snap = await db()
    .collection("attendance")
    .where("userId", "==", userId)
    .orderBy("timestamp", "asc")
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate().toISOString(), // format for client
  }));
}

/**
 * Add or update an attendance record (admin override).
 * If id is omitted, a new punch record is added.
 * @param {Object} punch
 * @param {string} [punch.id] - Optional, updates existing if provided
 * @param {string} punch.userId
 * @param {string} punch.type - "in" | "out"
 * @param {Date} punch.timestamp
 */
export async function saveOrUpdateAttendance(punch) {
  const { Timestamp } = await import("firebase-admin/firestore");
  const data = {
    userId: punch.userId,
    type: punch.type,
    timestamp: Timestamp.fromDate(new Date(punch.timestamp)),
  };

  if (punch.id) {
    await db().collection("attendance").doc(punch.id).set(data, { merge: true });
    return punch.id;
  } else {
    const ref = await db().collection("attendance").add(data);
    return ref.id;
  }
}

/**
 * Fetch all daily summaries for a specific date across all employees.
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Promise<Array>} Daily summaries
 */
export async function getDailySummariesForDate(date) {
  const snap = await db()
    .collection("dailySummary")
    .where("date", "==", date)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetch all daily summaries within a date range (inclusive) across all employees.
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @returns {Promise<Array>} Daily summaries in the range
 */
export async function getDailySummariesInRange(startDate, endDate) {
  const snap = await db()
    .collection("dailySummary")
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

import { createUser, getUserByUid } from "../services/firestoreService.js";

/**
 * POST /api/users/register
 * Creates a Firestore user doc after client-side Firebase Auth registration.
 * Role and schedule are ALWAYS hardcoded server-side — client input for these
 * fields is ignored to prevent privilege escalation.
 */
export async function registerUser(req, res) {
  try {
    const { name, email, timezone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const uid = req.user.uid;

    /* Check if user doc already exists (idempotency guard) */
    const existing = await getUserByUid(uid);
    if (existing) {
      return res.status(200).json({ message: "User already registered", user: existing });
    }

    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "employee",
      timezone: timezone || "Asia/Manila",
      schedule: { start: "09:00", end: "18:00" },
    };

    await createUser(uid, userData);

    return res.status(201).json({ message: "User registered", user: { id: uid, ...userData } });
  } catch (err) {
    console.error("Registration failed:", err.message);
    return res.status(500).json({ error: "Failed to register user" });
  }
}

/**
 * GET /api/users/me
 * Returns the authenticated user's profile including role and schedule.
 */
export async function getMe(req, res) {
  try {
    const user = await getUserByUid(req.user.uid);

    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("Get profile failed:", err.message);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
}

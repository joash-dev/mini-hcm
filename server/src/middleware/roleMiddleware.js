import { getUserByUid } from "../services/firestoreService.js";

/**
 * Express middleware that checks whether the authenticated user has
 * the "admin" role. Must be used AFTER authMiddleware so that
 * `req.user.uid` is available.
 */
export async function roleMiddleware(req, res, next) {
  try {
    const userDoc = await getUserByUid(req.user.uid);

    if (!userDoc || userDoc.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.userDoc = userDoc;
    next();
  } catch (err) {
    console.error("Role check failed:", err.message);
    return res.status(500).json({ error: "Failed to verify user role" });
  }
}

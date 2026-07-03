import { getAuth } from "firebase-admin/auth";

/**
 * Express middleware that verifies the Firebase ID token from the
 * Authorization header. Attaches the decoded token (including `uid`)
 * to `req.user` for downstream handlers.
 */
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const idToken = header.split("Bearer ")[1];

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

import { auth } from "./firebase.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Sends an authenticated request to the Express backend.
 * Automatically attaches the current user's Firebase ID token
 * as a Bearer token in the Authorization header.
 *
 * @param {string} endpoint - API path (e.g. "/users/me")
 * @param {Object} [options] - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function apiRequest(endpoint, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user — cannot make API request");
  }

  const token = await user.getIdToken();

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

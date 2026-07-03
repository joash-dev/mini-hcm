import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../services/api.js";

/**
 * Custom hook that manages punch-in/out state for the current user.
 * Fetches today's punch status on mount and provides a punch action.
 *
 * @returns {{ status, loading, error, punch, refreshStatus }}
 *   - status: "none" (not punched in), "in" (punched in), "out" (done for today)
 *   - loading: true while fetching or submitting
 *   - error: error message string or null
 *   - punch: function(type) to record a punch
 *   - refreshStatus: function to re-fetch current status
 */
export function useAttendance() {
  const [status, setStatus] = useState("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /** Fetch current punch status from the server */
  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest("/attendance/status");
      setStatus(data.status);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  /**
   * Record a punch-in or punch-out.
   * Automatically triggers daily summary computation on punch-out.
   * @param {"in"|"out"} type
   */
  async function punch(type) {
    setLoading(true);
    setError(null);

    try {
      await apiRequest("/attendance/punch", {
        method: "POST",
        body: { type },
      });

      /* If punch-out, trigger daily summary computation */
      if (type === "out") {
        const { auth } = await import("../services/firebase.js");
        const user = auth.currentUser;
        if (user) {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const dd = String(now.getDate()).padStart(2, "0");
          const dateStr = `${yyyy}-${mm}-${dd}`;

          await apiRequest("/summary/compute", {
            method: "POST",
            body: { userId: user.uid, date: dateStr },
          });
        }
      }

      /* Refresh status from server to stay in sync */
      await refreshStatus();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return { status, loading, error, punch, refreshStatus };
}

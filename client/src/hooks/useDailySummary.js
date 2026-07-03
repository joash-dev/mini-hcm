import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../services/api.js";

/**
 * Custom hook to fetch today's daily summary and the user's past summaries history.
 *
 * @param {string} userId - Auth UID of the employee
 * @returns {{ todaySummary, history, loading, error, refresh }}
 */
export function useDailySummary(userId) {
  const [todaySummary, setTodaySummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummaries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // Fetch history (sorted descending by date)
      const data = await apiRequest("/summary/history");
      const list = data.history || [];
      setHistory(list);

      // Extract today's summary from the history list if it exists
      const today = list.find((s) => s.date === todayStr);
      setTodaySummary(today || null);
    } catch (err) {
      console.error("Fetch summaries hook error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  return { todaySummary, history, loading, error, refresh: fetchSummaries };
}

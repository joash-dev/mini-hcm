/**
 * Formats a raw number of minutes into a user-friendly "Xh Ym" string.
 *
 * Examples:
 * - 0 -> "0m"
 * - 45 -> "45m"
 * - 694 -> "11h 34m"
 * - 120 -> "2h"
 * - 65 -> "1h 5m"
 *
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatMinutes(totalMinutes) {
  if (typeof totalMinutes !== "number" || isNaN(totalMinutes)) {
    return "0m";
  }
  if (totalMinutes === 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

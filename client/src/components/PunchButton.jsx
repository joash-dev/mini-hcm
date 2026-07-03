/**
 * Toggle button for punch-in / punch-out.
 * Shows a single button that changes state based on today's punch status:
 *   - "none" → shows "Punch In"
 *   - "in"   → shows "Punch Out"
 *   - "out"  → shows "Done for today" (disabled)
 *
 * State is lifted up to the parent container.
 */
export default function PunchButton({ status, loading, error, punch }) {
  /** Determine button label and action based on current status */
  function getButtonConfig() {
    switch (status) {
      case "none":
        return { label: "Punch In", action: () => punch("in"), disabled: false };
      case "in":
        return { label: "Punch Out", action: () => punch("out"), disabled: false };
      case "out":
        return { label: "Done for today ✓", action: null, disabled: true };
      default:
        return { label: "Loading…", action: null, disabled: true };
    }
  }

  const { label, action, disabled } = getButtonConfig();

  /** Visual style class based on punch state */
  function getStatusClass() {
    if (status === "in") return "punch-btn--active";
    if (status === "out") return "punch-btn--done";
    return "";
  }

  return (
    <div className="punch-section">
      <h2 className="punch-title">Time Clock</h2>

      <div className="punch-status">
        <span className={`punch-indicator ${status === "in" ? "punch-indicator--active" : ""}`} />
        <span className="punch-status-text">
          {status === "none" && "Not punched in"}
          {status === "in" && "Currently punched in"}
          {status === "out" && "Shift complete"}
        </span>
      </div>

      <button
        className={`btn punch-btn ${getStatusClass()}`}
        onClick={action}
        disabled={disabled || loading}
      >
        {loading ? "Processing…" : label}
      </button>

      {error && <p className="punch-error">{error}</p>}
    </div>
  );
}

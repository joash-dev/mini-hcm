/**
 * Reusable KPI Card component.
 * Renders a metric value with a label, unit, and accent coloring.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} [props.unit]
 * @param {"regular"|"overtime"|"nd"|"late"|"undertime"} [props.type]
 */
export default function KpiCard({ label, value, unit = "", type = "regular" }) {
  // SVG Icon mapping based on metric type
  function getIcon() {
    switch (type) {
      case "regular":
        return (
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case "overtime":
        return (
          <svg viewBox="0 0 24 24">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polygon points="17 6 23 6 23 12" />
          </svg>
        );
      case "nd":
        return (
          <svg viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      case "late":
        return (
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case "undertime":
        return (
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        );
      default:
        return null;
    }
  }

  return (
    <div className={`kpi-card kpi-card--${type}`}>
      <div className="kpi-icon">{getIcon()}</div>
      <span className="kpi-label">{label}</span>
      <div className="kpi-value-container">
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
    </div>
  );
}
